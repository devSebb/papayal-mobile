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
};

export type HttpError = {
  status: number;
  error?: ApiError;
  requestId?: string;
  raw?: unknown;
};

let authHandlers: AuthHandlers | null = null;
let refreshPromise: Promise<string | null> | null = null;
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
  if (body && !(body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const accessToken = authHandlers?.getAccessToken();
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
};

const refreshAccessToken = async (): Promise<string | null> => {
  if (!authHandlers?.refreshTokens) {
    return null;
  }
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        return await authHandlers.refreshTokens();
      } catch (error) {
        await authHandlers.clearAuth?.();
        return null;
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
  const { method = "GET", body, allowRefresh = true } = options;
  const headers = buildHeaders(options.headers ?? {}, body);
  const bearer = headers.Authorization?.startsWith("Bearer ")
    ? headers.Authorization.slice("Bearer ".length)
    : undefined;
  logAuthHeader(path, method, bearer);
  if (__DEV__) {
    logRequestDebug(url, path, method, headers, body);
  }
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    init.body =
      body instanceof FormData || typeof body === "string" ? body : JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (__DEV__) {
      logNetworkError(url, method, error);
    }
    const fallback: HttpError = {
      status: 0,
      error: { code: "network_error", message: "Network error" },
      raw: error
    };
    throw fallback;
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
      if (refreshed) {
        return request<T>(path, { ...options, allowRefresh: false });
      }
    }
    if (response.status === 401) {
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

