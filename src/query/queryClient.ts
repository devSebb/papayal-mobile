import { AppState } from "react-native";
import { focusManager, MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import * as Sentry from "@sentry/react-native";

import { HttpError } from "../api/http";

// React Query only tracks web window focus; map RN app foregrounding to it so
// refetchOnWindowFocus fires when the user returns to the app. Module-level
// subscription lives for the app's lifetime alongside the singleton client.
AppState.addEventListener("change", (state) => {
  focusManager.setFocused(state === "active");
});

/**
 * Failures we deliberately don't report.
 *
 * - Offline / transport failures (status 0) are the user's network, not a bug,
 *   and at launch traffic they would drown out everything else.
 * - 401/403 are handled by the refresh + clearAuth path in http.ts.
 * - 404 is a normal outcome for lookups like an expired claim link, which
 *   ClaimLandingScreen already renders a real UI for.
 * - 422 is user-facing validation, surfaced inline by the calling screen.
 */
const isExpectedFailure = (err: unknown): boolean => {
  if (!err || typeof err !== "object") return false;
  const httpErr = err as HttpError;
  if (httpErr.status === 0 || httpErr.error?.code === "network_error") return true;
  return [401, 403, 404, 422].includes(httpErr.status);
};

const reportQueryFailure = (err: unknown, kind: "query" | "mutation", key: unknown) => {
  if (isExpectedFailure(err)) return;

  const httpErr = (err && typeof err === "object" ? err : {}) as Partial<HttpError>;

  Sentry.captureException(err, {
    tags: {
      failure_kind: kind,
      http_status: httpErr.status !== undefined ? String(httpErr.status) : "unknown",
      api_error_code: httpErr.error?.code ?? "unknown"
    },
    contexts: {
      react_query: {
        kind,
        key: (() => {
          try {
            return JSON.stringify(key);
          } catch {
            return String(key);
          }
        })()
      }
    }
  });
};

export const queryClient = new QueryClient({
  // Without these, every failed query and mutation in the app dies in a local
  // isError flag and is invisible in production.
  queryCache: new QueryCache({
    onError: (error, query) => reportQueryFailure(error, "query", query.queryKey)
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) =>
      reportQueryFailure(error, "mutation", mutation.options.mutationKey ?? "unkeyed")
  }),
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true
    }
    // Note: mutations intentionally keep React Query's default of zero
    // retries. Auto-retrying a payment POST is a double-charge path.
  }
});
