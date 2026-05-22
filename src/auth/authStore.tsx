import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import * as SecureStore from "expo-secure-store";
import * as Device from "expo-device";

import { authApi, meApi, pushTokenApi } from "../api/endpoints";
import { configureHttpAuth, HttpError } from "../api/http";
import { AuthTokens } from "../types/api";
import { queryClient } from "../query/queryClient";
import { unregisterPushToken } from "../notifications/register";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  authLoading: boolean;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  signup: (params: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    password_confirmation: string;
    phone: string;
    interests?: string[];
  }) => Promise<void>;
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
  | { type: "SET_LOADING"; payload: boolean };

const REFRESH_TOKEN_KEY = "papayal_refresh_token";

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  hydrated: false,
  authLoading: false
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const reducer = (state: AuthState, action: Action): AuthState => {
  switch (action.type) {
    case "SET_TOKENS":
      return {
        ...state,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken
      };
    case "CLEAR":
      return { ...state, accessToken: null, refreshToken: null };
    case "HYDRATED":
      return { ...state, hydrated: true };
    case "SET_LOADING":
      return { ...state, authLoading: action.payload };
    default:
      return state;
  }
};

const resolveDeviceId = () => {
  return Device.osInternalBuildId ?? Device.osBuildId ?? Device.modelName ?? undefined;
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
          // Network error: keep token in storage, but clear memory state
          // User will need to retry when online
          // We don't call clearAuth() to preserve the stored refresh token
          refreshTokenRef.current = null;
          accessTokenRef.current = null;
          dispatch({ type: "CLEAR" });
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
    async (email: string, password: string) => {
      dispatch({ type: "SET_LOADING", payload: true });
      try {
        const device_id = resolveDeviceId();
        const tokens = await authApi.login({ email, password, device_id });
        await setTokens(tokens);
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
    }) => {
      dispatch({ type: "SET_LOADING", payload: true });
      try {
        const device_id = resolveDeviceId();
        const tokens = await authApi.signup({ ...params, device_id });
        await setTokens(tokens);
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [setTokens]
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
      logout,
      logoutAll,
      deleteAccount,
      refreshTokens,
      hydrateFromStorage
    }),
    [deleteAccount, hydrateFromStorage, login, logout, logoutAll, refreshTokens, signup, state]
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
