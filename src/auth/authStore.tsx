import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import * as SecureStore from "expo-secure-store";
import * as Device from "expo-device";

import { authApi } from "../api/endpoints";
import { configureHttpAuth } from "../api/http";
import { AuthTokens } from "../types/api";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  authLoading: boolean;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  signup: (params: {
    email: string;
    password: string;
    name: string;
    phone: string;
    national_id: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
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
  }, []);

  const hydrateFromStorage = useCallback(async () => {
    const storedRefresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (storedRefresh) {
      refreshTokenRef.current = storedRefresh;
      try {
        const tokens = await authApi.refresh(storedRefresh);
        await setTokens(tokens);
      } catch {
        await clearAuth();
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
      email: string;
      password: string;
      name: string;
      phone: string;
      national_id: string;
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
      await authApi.logoutAll();
    } catch {
      // ignore remote failure
    } finally {
      await clearAuth();
    }
  }, [clearAuth]);

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
      refreshTokens,
      hydrateFromStorage
    }),
    [hydrateFromStorage, login, logout, logoutAll, refreshTokens, signup, state]
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

