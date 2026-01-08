import { API_BASE_URL } from "../config/env";
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
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    init.body =
      body instanceof FormData || typeof body === "string" ? body : JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    const fallback: HttpError = {
      status: 0,
      error: { code: "network_error", message: "Network error" },
      raw: error
    };
    throw fallback;
  }
  lastRequestId = response.headers.get("x-request-id") ?? undefined;

  let parsed: any = null;
  try {
    parsed = await response.clone().json();
  } catch {
    parsed = null;
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

