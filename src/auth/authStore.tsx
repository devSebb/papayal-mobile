import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { AppState } from "react-native";
import * as SecureStore from "expo-secure-store";

import { authApi, meApi, pushTokenApi } from "../api/endpoints";
import { configureHttpAuth, HttpError } from "../api/http";
import { AuthTokens, EmailVerificationDetails, SignupResponse } from "../types/api";

/**
 * Result of signup()/login(): either the session was established (tokens
 * stored, RootNavigator will swap trees) or the email needs verifying first,
 * in which case the caller routes to the EmailVerification screen.
 */
export type AuthResult =
  | { verificationRequired: false }
  | {
      verificationRequired: true;
      email: string;
      maskedEmail?: string | null;
      resendAvailableIn?: number;
    };

const isVerificationRequired = (
  res: SignupResponse
): res is Extract<SignupResponse, { verification_required: true }> =>
  (res as { verification_required?: boolean }).verification_required === true;
import { queryClient } from "../query/queryClient";
import { unregisterPushToken } from "../notifications/register";
import { generateUUID } from "../utils/uuid";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  authLoading: boolean;
  /**
   * True when hydration found a stored refresh token but couldn't exchange it
   * because the device was offline. While set, the app runs as guest and a
   * background loop retries the refresh (on foreground + with backoff).
   */
  hydrationPendingOffline: boolean;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (params: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    password_confirmation: string;
    phone: string;
    interests?: string[];
    claim_otp?: string;
  }) => Promise<AuthResult>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendEmailVerification: (email: string) => Promise<EmailVerificationDetails>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  refreshTokens: () => Promise<string | null>;
  hydrateFromStorage: () => Promise<void>;
};

type Action =
  | { type: "SET_TOKENS"; payload: { accessToken: string; refreshToken: string } }
  | { type: "CLEAR" }
  | { type: "HYDRATED" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_OFFLINE_PENDING"; payload: boolean };

const REFRESH_TOKEN_KEY = "papayal_refresh_token";
const DEVICE_ID_KEY = "papayal.device_id";

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  hydrated: false,
  authLoading: false,
  hydrationPendingOffline: false
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const reducer = (state: AuthState, action: Action): AuthState => {
  switch (action.type) {
    case "SET_TOKENS":
      return {
        ...state,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        hydrationPendingOffline: false
      };
    case "CLEAR":
      return { ...state, accessToken: null, refreshToken: null };
    case "SET_OFFLINE_PENDING":
      return { ...state, hydrationPendingOffline: action.payload };
    case "HYDRATED":
      return { ...state, hydrated: true };
    case "SET_LOADING":
      return { ...state, authLoading: action.payload };
    default:
      return state;
  }
};

// In-memory cache so we only hit SecureStore once per app session.
let cachedDeviceId: string | null = null;

/**
 * Stable per-install device identifier, used by the backend to bind refresh
 * tokens to a device. Generated once (UUID v4), persisted in SecureStore and
 * reused forever after.
 *
 * Note: earlier builds sent OS build identifiers (Device.osInternalBuildId,
 * etc.), which are shared by every device on the same OS version and thus
 * useless for per-device binding. Old installs simply get a new stable ID on
 * their next login/signup — acceptable, the backend just sees a new device.
 */
const resolveDeviceId = async (): Promise<string> => {
  if (cachedDeviceId) return cachedDeviceId;
  try {
    const stored = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (stored) {
      cachedDeviceId = stored;
      return stored;
    }
    const fresh = generateUUID();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, fresh);
    cachedDeviceId = fresh;
    return fresh;
  } catch {
    // SecureStore unavailable — fall back to a session-scoped ID so
    // login/signup still work; it will be regenerated next launch.
    const fallback = generateUUID();
    cachedDeviceId = fallback;
    return fallback;
  }
};

/**
 * Determines if an error is a network/connectivity error.
 * Network errors should NOT cause token deletion during hydration
 * (user might be offline but have a valid token).
 *
 * Based on how src/api/http.ts throws errors:
 * - status === 0: network error (fetch failed before response)
 * - error.code === "network_error": explicit network error from http.ts
 */
const isNetworkError = (err: unknown): boolean => {
  if (!err || typeof err !== "object") return false;

  const httpErr = err as HttpError;

  // status 0 means fetch failed before getting a response (network issue)
  if (httpErr.status === 0) return true;

  // Check for explicit network_error code from http.ts
  if (httpErr.error?.code === "network_error") return true;

  // Check raw error message for common network failure patterns
  const rawMessage = (httpErr.raw as any)?.message ?? "";
  if (typeof rawMessage === "string") {
    const lowerMsg = rawMessage.toLowerCase();
    if (
      lowerMsg.includes("network request failed") ||
      lowerMsg.includes("network error") ||
      lowerMsg.includes("timeout") ||
      lowerMsg.includes("fetch")
    ) {
      return true;
    }
  }

  return false;
};

/**
 * Determines if an error is an auth-invalid error (token expired/invalid).
 * These errors SHOULD cause token deletion.
 */
const isAuthInvalidError = (err: unknown): boolean => {
  if (!err || typeof err !== "object") return false;

  const httpErr = err as HttpError;

  // 401 or 403 status indicates auth failure
  if (httpErr.status === 401 || httpErr.status === 403) return true;

  // Check for explicit auth error codes
  const code = httpErr.error?.code ?? "";
  if (
    code === "auth.token_expired" ||
    code === "auth.invalid_token" ||
    code === "auth.refresh_token_invalid" ||
    code === "auth.refresh_token_expired"
  ) {
    return true;
  }

  return false;
};

/**
 * Clears user-specific data from React Query cache.
 * Called on logout to prevent stale data when switching users.
 */
const clearUserQueryCache = () => {
  // Remove user-specific queries
  queryClient.removeQueries({ queryKey: ["me"] });
  queryClient.removeQueries({ queryKey: ["giftCards"] });
  queryClient.removeQueries({ queryKey: ["giftCard"] }); // Catches ["giftCard", id]
  queryClient.removeQueries({ queryKey: ["redemptionToken"] }); // Catches ["redemptionToken", id, ...]

  // Note: ["merchants"] is NOT cleared as it's not user-specific
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const refreshTokenRef = useRef<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    refreshTokenRef.current = state.refreshToken;
  }, [state.refreshToken]);

  const setTokens = useCallback(async (tokens: AuthTokens) => {
    refreshTokenRef.current = tokens.refresh_token;
    accessTokenRef.current = tokens.access_token;
    dispatch({
      type: "SET_TOKENS",
      payload: { accessToken: tokens.access_token, refreshToken: tokens.refresh_token }
    });
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh_token);
  }, []);

  const clearAuth = useCallback(async () => {
    refreshTokenRef.current = null;
    accessTokenRef.current = null;
    dispatch({ type: "CLEAR" });
    // A real logout/auth failure also cancels any pending offline re-hydration.
    dispatch({ type: "SET_OFFLINE_PENDING", payload: false });
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    clearUserQueryCache();
  }, []);

  const hydrateFromStorage = useCallback(async () => {
    const storedRefresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (storedRefresh) {
      refreshTokenRef.current = storedRefresh;
      try {
        const tokens = await authApi.refresh(storedRefresh);
        await setTokens(tokens);
      } catch (err) {
        // Offline-safe hydration:
        // - If network error, preserve the token (user might be offline but token is valid)
        // - If auth error (401/403, token invalid/expired), clear auth
        if (isNetworkError(err)) {
          // Network error: keep token in storage, but clear memory state.
          // We don't call clearAuth() to preserve the stored refresh token.
          // Mark hydration as pending so the retry loop below upgrades the
          // session silently once connectivity returns — no restart needed.
          refreshTokenRef.current = null;
          accessTokenRef.current = null;
          dispatch({ type: "CLEAR" });
          dispatch({ type: "SET_OFFLINE_PENDING", payload: true });
        } else if (isAuthInvalidError(err)) {
          // Auth error: token is invalid/expired, clear everything
          await clearAuth();
        } else {
          // Unknown error: be conservative, clear auth
          await clearAuth();
        }
      }
    }
    dispatch({ type: "HYDRATED" });
  }, [clearAuth, setTokens]);

  const refreshTokens = useCallback(async () => {
    const token = refreshTokenRef.current;
    if (!token) {
      return null;
    }
    const tokens = await authApi.refresh(token);
    await setTokens(tokens);
    return tokens.access_token;
  }, [setTokens]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      dispatch({ type: "SET_LOADING", payload: true });
      try {
        const device_id = await resolveDeviceId();
        const res = await authApi.login({ email, password, device_id });
        if (isVerificationRequired(res)) {
          return {
            verificationRequired: true,
            email: res.email,
            maskedEmail: res.masked_email,
            resendAvailableIn: res.resend_available_in
          };
        }
        await setTokens(res);
        return { verificationRequired: false };
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [setTokens]
  );

  const signup = useCallback(
    async (params: {
      first_name: string;
      last_name: string;
      email: string;
      password: string;
      password_confirmation: string;
      phone: string;
      interests?: string[];
      claim_otp?: string;
    }): Promise<AuthResult> => {
      dispatch({ type: "SET_LOADING", payload: true });
      try {
        const device_id = await resolveDeviceId();
        const res = await authApi.signup({ ...params, device_id });
        // Pending-account claims (with a valid claim_otp) come back verified
        // with tokens; fresh signups come back needing email verification.
        if (isVerificationRequired(res)) {
          return {
            verificationRequired: true,
            email: res.email,
            maskedEmail: res.masked_email,
            resendAvailableIn: res.resend_available_in
          };
        }
        await setTokens(res);
        return { verificationRequired: false };
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [setTokens]
  );

  const verifyEmail = useCallback(
    async (email: string, code: string) => {
      dispatch({ type: "SET_LOADING", payload: true });
      try {
        const device_id = await resolveDeviceId();
        const tokens = await authApi.verifyEmail({ email, code, device_id });
        // Storing tokens flips accessToken → RootNavigator swaps to the app.
        await setTokens(tokens);
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [setTokens]
  );

  const resendEmailVerification = useCallback(
    (email: string) => authApi.resendEmailVerification(email),
    []
  );

  const logout = useCallback(async () => {
    try {
      await unregisterPushToken((t) => pushTokenApi.unregister(t));
    } catch {
      // best effort — don't block logout
    }
    try {
      const token = refreshTokenRef.current;
      if (token) {
        await authApi.logout(token);
      }
    } catch {
      // swallow logout errors to guarantee local cleanup
    } finally {
      await clearAuth();
    }
  }, [clearAuth]);

  const logoutAll = useCallback(async () => {
    try {
      await unregisterPushToken((t) => pushTokenApi.unregister(t));
    } catch {
      // best effort — don't block logout
    }
    try {
      await authApi.logoutAll();
    } catch {
      // ignore remote failure
    } finally {
      await clearAuth();
    }
  }, [clearAuth]);

  // Account deletion. Unlike logout, the API call must succeed before we
  // wipe local state — if it fails (wrong password, merchant account,
  // network), we re-throw so the calling screen can show an inline error
  // and keep the user signed in. On success we run the same cleanup as
  // logout: revoke push token, clear secure storage, dump query cache.
  const deleteAccount = useCallback(
    async (password: string) => {
      // Server-side deletion. Throws HttpError on failure; do NOT swallow.
      await meApi.destroy(password);

      // From here the account is gone. Best-effort cleanup of local state.
      try {
        await unregisterPushToken((t) => pushTokenApi.unregister(t));
      } catch {
        // push token row was already destroyed by the server; tolerate 4xx
      }
      await clearAuth();
    },
    [clearAuth]
  );

  // Offline cold-start recovery: while hydrationPendingOffline is set, retry
  // the refresh when the app foregrounds and on a backoff interval. The effect
  // tears itself down (listener + timer) when the flag flips off — which
  // happens on success (SET_TOKENS), on login, and on clearAuth/logout.
  useEffect(() => {
    if (!state.hydrationPendingOffline) return;

    let cancelled = false;
    let inFlight = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const INITIAL_DELAY_MS = 5000;
    const MAX_DELAY_MS = 60000;
    let delayMs = INITIAL_DELAY_MS;

    const schedule = () => {
      if (cancelled) return;
      timer = setTimeout(attempt, delayMs);
      delayMs = Math.min(delayMs * 2, MAX_DELAY_MS);
    };

    const attempt = async () => {
      if (cancelled || inFlight) return;
      // Session already established by an explicit login — stop retrying.
      if (accessTokenRef.current) {
        dispatch({ type: "SET_OFFLINE_PENDING", payload: false });
        return;
      }
      inFlight = true;
      try {
        const storedRefresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (cancelled) return;
        if (!storedRefresh) {
          // Token gone (logged out elsewhere) — nothing to recover.
          dispatch({ type: "SET_OFFLINE_PENDING", payload: false });
          return;
        }
        const tokens = await authApi.refresh(storedRefresh);
        if (cancelled) return;
        await setTokens(tokens); // SET_TOKENS also clears the pending flag
        if (__DEV__) console.log("[auth] offline hydration recovered");
      } catch (err) {
        if (cancelled) return;
        if (isNetworkError(err)) {
          schedule();
        } else {
          // Auth rejection (or unknown): the stored token is unusable.
          await clearAuth();
        }
      } finally {
        inFlight = false;
      }
    };

    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active" && !cancelled) {
        // Foreground is the strongest connectivity signal: retry now and
        // reset the backoff.
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        delayMs = INITIAL_DELAY_MS;
        attempt();
      }
    });

    schedule();

    return () => {
      cancelled = true;
      subscription.remove();
      if (timer) clearTimeout(timer);
    };
  }, [state.hydrationPendingOffline, clearAuth, setTokens]);

  useEffect(() => {
    configureHttpAuth({
      getAccessToken: () => accessTokenRef.current,
      refreshTokens,
      clearAuth
    });
  }, [clearAuth, refreshTokens]);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      signup,
      verifyEmail,
      resendEmailVerification,
      logout,
      logoutAll,
      deleteAccount,
      refreshTokens,
      hydrateFromStorage
    }),
    [
      deleteAccount,
      hydrateFromStorage,
      login,
      logout,
      logoutAll,
      refreshTokens,
      resendEmailVerification,
      signup,
      state,
      verifyEmail
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
