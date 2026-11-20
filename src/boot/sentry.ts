import * as Application from "expo-application";
import * as Sentry from "@sentry/react-native";

/**
 * Crash reporting / performance / error-scoped session replay.
 *
 * Stays fully dormant unless EXPO_PUBLIC_SENTRY_DSN is set at build time
 * (EXPO_PUBLIC_* vars are inlined into the bundle): without it we never call
 * Sentry.init, and every Sentry.* API elsewhere is a documented no-op on an
 * uninitialized SDK, so the app behaves byte-for-byte as it did pre-Sentry.
 */
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? "";

export const sentryEnabled = SENTRY_DSN.length > 0;

/**
 * Screen-transition breadcrumbs + navigation spans. Must be created at module
 * scope so the same instance is passed to Sentry.init here and registered
 * against the NavigationContainer in src/navigation/index.tsx — creating a
 * second instance there would produce an integration that never receives the
 * container, and no route breadcrumbs at all.
 */
export const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: false
});

/**
 * Secrets that ride in URLs. Claim links (papayal.app/claim?...) and password
 * reset links carry single-use tokens, and Sentry transmits full request URLs
 * and query strings by default — so without this they land in every event and
 * breadcrumb. Redaction is by key name, applied to both query strings and
 * path segments that follow a known token-bearing route.
 */
const SENSITIVE_QUERY_KEYS = ["token", "otp", "code", "claim_otp", "reset_token", "access_token"];

const scrubUrl = (url: string): string => {
  if (!url) return url;
  let out = url;
  for (const key of SENSITIVE_QUERY_KEYS) {
    out = out.replace(new RegExp(`([?&]${key}=)[^&#]*`, "gi"), `$1[Filtered]`);
  }
  // /claim/<token> and /reset/<token> style paths.
  out = out.replace(/\/(claim|reset)\/[^/?#]+/gi, "/$1/[Filtered]");
  return out;
};

export const initSentry = () => {
  if (!sentryEnabled) return;

  Sentry.init({
    dsn: SENTRY_DSN,

    // Separates local/simulator noise from real store builds. Without this
    // every event lands in one undifferentiated bucket, because the same DSN
    // is used in .env for development.
    environment: __DEV__ ? "development" : "production",

    // Must match what sentry-cli uploads at build time, or Sentry splits the
    // data across two releases and the Releases page silently degrades from
    // "Crash Free Session Rate" to "Failure Rate". The default RN release
    // format is <bundleId>@<version>+<build>; dist disambiguates builds within
    // a release, which matters because appVersionSource:"remote" means the
    // build number auto-increments on every EAS build.
    release: `com.papayal.app@${Application.nativeApplicationVersion}+${Application.nativeBuildVersion}`,
    dist: Application.nativeBuildVersion ?? undefined,

    // Performance. 20% is a usable sample at launch traffic while staying well
    // inside the free-tier quota (transactions consume the same quota as
    // errors). This is what links a crash on the payment screen to the Rails
    // request that caused it.
    tracesSampleRate: 0.2,

    // Scoped deliberately: the RN default is [/.*/], which would attach
    // sentry-trace/baggage headers to every outbound request including
    // Stripe's.
    tracePropagationTargets: ["api.papayal.app"],

    sendDefaultPii: false,

    // Replay only around errors — ambient session recording would blow through
    // the 50-replay quota (identical on Free and Team) in a day, and carries
    // privacy weight we don't need. Masking is left at the SDK defaults, which
    // mask all text, images, webviews and vectors; maskAllVectors in
    // particular is what keeps redemption QR codes (react-native-svg) out of
    // replays, where they would be a redeemable gift card in plain sight.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      navigationIntegration,
      Sentry.mobileReplayIntegration({
        maskAllText: true,
        maskAllImages: true,
        maskAllVectors: true
      })
    ],

    beforeSend(event) {
      if (event.request?.url) {
        event.request.url = scrubUrl(event.request.url);
      }
      return event;
    },

    beforeBreadcrumb(breadcrumb) {
      if (typeof breadcrumb.data?.url === "string") {
        breadcrumb.data.url = scrubUrl(breadcrumb.data.url);
      }
      if (typeof breadcrumb.message === "string" && breadcrumb.message.includes("://")) {
        breadcrumb.message = scrubUrl(breadcrumb.message);
      }
      return breadcrumb;
    }
  });
};

/**
 * Identity for "how many users are affected" and crash-free-users. Uses the
 * per-install device id (a random UUID from SecureStore, already used by the
 * backend for refresh-token binding) rather than email/user id, so no PII
 * leaves the device. Guests get identified too, which is what makes
 * crash-free-users meaningful across signed-out flows like claim links.
 */
export const setSentryUser = (deviceId: string | null) => {
  if (!sentryEnabled) return;
  Sentry.setUser(deviceId ? { id: deviceId } : null);
};

/**
 * Handles a promise that is deliberately started but not awaited.
 *
 * A floating promise that rejects becomes an unhandled rejection: in release
 * builds nothing surfaces, the work silently doesn't happen, and there is no
 * report. Wrapping makes the failure visible without changing control flow —
 * the caller still doesn't wait.
 */
export const reportFloating = (promise: Promise<unknown>, context: string): void => {
  void promise.catch((err) => {
    Sentry.captureException(err, { tags: { floating_promise: context } });
  });
};
