import { Platform } from "react-native";

import { API_BASE_DEBUG, API_BASE_URL } from "../config/env";
import { ApiError } from "../types/api";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type AuthHandlers = {
  getAccessToken: () => string | null;
  refreshTokens: () => Promise<string | null>;
  clearAuth: () => Promise<void> | void;
};

type RequestOptions = {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  allowRefresh?: boolean;
  /** Per-request timeout in ms. Defaults to DEFAULT_TIMEOUT_MS. */
  timeoutMs?: number;
};

export type HttpError = {
  status: number;
  error?: ApiError;
  requestId?: string;
  raw?: unknown;
};

type RefreshResult = { token: string } | { token: null; reason: "auth" | "transient" };

const DEFAULT_TIMEOUT_MS = 15000;
const NETWORK_ERROR_MESSAGE = "Sin conexión. Verifica tu internet e inténtalo de nuevo.";

const networkError = (raw?: unknown): HttpError => ({
  status: 0,
  error: { code: "network_error", message: NETWORK_ERROR_MESSAGE },
  raw
});

let authHandlers: AuthHandlers | null = null;
let refreshPromise: Promise<RefreshResult> | null = null;
let lastRequestId: string | undefined;

export const configureHttpAuth = (handlers: AuthHandlers) => {
  authHandlers = handlers;
};

const shouldAttemptRefresh = (status: number, code?: string) => {
  return status === 401 && (code === "auth.token_expired" || code === "auth.invalid_token");
};

const logAuthHeader = (path: string, method: HttpMethod, bearer?: string) => {
  if (!__DEV__) return;
  const preview = bearer ? bearer.slice(0, 12) : "none";
  const attached = bearer ? `Bearer ${preview}...` : "none";
  console.log(`[http] ${method} ${path} auth=${attached}`);
};

const MAX_PREVIEW_CHARS = 500;

const redactHeaders = (headers: Record<string, string>) => {
  const safe = { ...headers };
  if (safe.Authorization) {
    const token = safe.Authorization.replace(/^Bearer\s+/i, "");
    safe.Authorization = `Bearer ${token.slice(0, 6)}...`;
  }
  return safe;
};

const previewBody = (body: unknown) => {
  if (body === undefined) return "none";
  if (body instanceof FormData) return "[form-data]";
  if (typeof body === "string") return body.slice(0, MAX_PREVIEW_CHARS);
  if (typeof body === "object" && body !== null) {
    return { keys: Object.keys(body), value: body };
  }
  return body;
};

const logRequestDebug = (url: string, path: string, method: HttpMethod, headers: Record<string, string>, body: unknown) => {
  console.log("[http][request]", {
    method,
    url,
    path,
    base: API_BASE_URL,
    baseDebug: API_BASE_DEBUG,
    platform: Platform.OS,
    headers: redactHeaders(headers),
    body: previewBody(body)
  });
};

const logResponseDebug = (url: string, method: HttpMethod, status: number, ok: boolean, bodyText: string | null) => {
  console.log("[http][response]", {
    method,
    url,
    status,
    ok,
    requestId: lastRequestId,
    bodyPreview: bodyText ? bodyText.slice(0, MAX_PREVIEW_CHARS) : null
  });
};

const logNetworkError = (url: string, method: HttpMethod, error: unknown) => {
  console.warn("[http][network_error]", {
    method,
    url,
    base: API_BASE_URL,
    platform: Platform.OS,
    message: (error as any)?.message ?? String(error)
  });
};

const buildHeaders = (base: Record<string, string>, body?: unknown) => {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...base
  };
  // For FormData, DO NOT set Content-Type - let fetch set it with boundary
  // Setting it manually will break multipart/form-data
  if (body && !(body instanceof FormData)) {
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
  }
  // Explicitly remove Content-Type for FormData if it was set
  if (body instanceof FormData && headers["Content-Type"]) {
    delete headers["Content-Type"];
  }
  const accessToken = authHandlers?.getAccessToken();
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
};

// Only a definitive rejection of the refresh token itself justifies wiping the
// session. Anything else (offline, timeout, 5xx, proxy hiccup) is transient:
// the stored refresh token is still valid and must survive.
const classifyRefreshFailure = (error: unknown): "auth" | "transient" => {
  const httpErr = error as HttpError | undefined;
  const status = typeof httpErr?.status === "number" ? httpErr.status : undefined;
  const code = httpErr?.error?.code ?? "";
  if (status === 401 || status === 403 || code.startsWith("auth.")) {
    return "auth";
  }
  return "transient";
};

const refreshAccessToken = async (): Promise<RefreshResult> => {
  if (!authHandlers?.refreshTokens) {
    return { token: null, reason: "auth" };
  }
  if (!refreshPromise) {
    // Single-flight: concurrent 401s share one refresh call AND one classified
    // result, so a transient failure is never double-reported as auth.
    refreshPromise = (async (): Promise<RefreshResult> => {
      try {
        const token = await authHandlers!.refreshTokens();
        if (token) {
          return { token };
        }
        // No refresh token available — nothing to recover from.
        return { token: null, reason: "auth" };
      } catch (error) {
        const reason = classifyRefreshFailure(error);
        if (__DEV__) {
          console.warn("[http][refresh_failed]", { reason, error });
        }
        // Deliberately no clearAuth here: the caller in request() decides,
        // and transient failures must keep the SecureStore refresh token.
        return { token: null, reason };
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
};

export const getLastRequestId = () => lastRequestId;

export async function request<T>(path: string, options: RequestOptions = {}): Promise<{ data: T; requestId?: string }> {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const { method = "GET", body, allowRefresh = true, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const headers = buildHeaders(options.headers ?? {}, body);
  const bearer = headers.Authorization?.startsWith("Bearer ")
    ? headers.Authorization.slice("Bearer ".length)
    : undefined;
  logAuthHeader(path, method, bearer);
  if (__DEV__) {
    logRequestDebug(url, path, method, headers, body);
    // Additional logging for FormData
    if (body instanceof FormData) {
      console.log("[http][formdata] FormData being sent, Content-Type should be set by fetch");
      // Try to inspect FormData (React Native specific)
      if ((body as any)._parts) {
        console.log("[http][formdata] FormData parts:", (body as any)._parts.map((p: any) => ({
          key: p[0],
          valueType: typeof p[1],
          valueKeys: p[1] && typeof p[1] === 'object' ? Object.keys(p[1]) : 'N/A'
        })));
      }
    }
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const init: RequestInit = { method, headers, signal: controller.signal };
  if (body !== undefined) {
    if (body instanceof FormData) {
      // Don't set Content-Type for FormData - let fetch set it with boundary
      // React Native FormData needs this
      init.body = body;
    } else if (typeof body === "string") {
      init.body = body;
    } else {
      init.body = JSON.stringify(body);
    }
  }

  let response: Response;
  try {
    // Abort (timeout) and connection failures collapse into the same
    // retry-able network_error shape (status 0).
    response = await fetch(url, init);
  } catch (error) {
    if (__DEV__) {
      logNetworkError(url, method, error);
    }
    throw networkError(error);
  } finally {
    clearTimeout(timeoutId);
  }
  lastRequestId = response.headers.get("x-request-id") ?? undefined;

  let debugText: string | null = null;
  if (__DEV__) {
    try {
      debugText = await response.clone().text();
    } catch {
      debugText = null;
    }
  }

  let parsed: any = null;
  if (debugText) {
    try {
      parsed = JSON.parse(debugText);
    } catch {
      parsed = null;
    }
  }
  if (!parsed) {
    try {
      parsed = await response.clone().json();
    } catch {
      parsed = null;
    }
  }

  if (__DEV__) {
    logResponseDebug(url, method, response.status, response.ok, debugText);
    // Log full error response for 500 errors
    if (!response.ok && response.status >= 500 && debugText) {
      console.error("[http][500_error]", {
        url,
        status: response.status,
        body: debugText,
        parsed
      });
    }
  }
  if (parsed?.request_id) {
    lastRequestId = parsed.request_id;
  }

  if (!response.ok) {
    const error: HttpError = {
      status: response.status,
      error: parsed?.error,
      requestId: lastRequestId,
      raw: parsed
    };
    if (allowRefresh && shouldAttemptRefresh(response.status, parsed?.error?.code)) {
      const refreshed = await refreshAccessToken();
      if (refreshed.token !== null) {
        return request<T>(path, { ...options, allowRefresh: false });
      }
      if (refreshed.reason === "transient") {
        // Refresh failed for network/server reasons: session survives,
        // caller gets a retry-able error. Do NOT clear auth.
        throw networkError(error);
      }
      // reason === "auth": refresh token definitively rejected.
      await authHandlers?.clearAuth?.();
      throw error;
    }
    // Only nuke the session for a 401 on a request that actually carried a
    // bearer token and where refresh was not applicable. A 401 from login or
    // an unauthenticated endpoint must never log the user out.
    if (response.status === 401 && bearer) {
      await authHandlers?.clearAuth?.();
    }
    throw error;
  }

  // If no body, return null data
  if (response.status === 204 || parsed === null) {
    return { data: undefined as unknown as T, requestId: lastRequestId };
  }

  const data = (parsed?.data ?? parsed) as T;
  return { data, requestId: lastRequestId };
}

