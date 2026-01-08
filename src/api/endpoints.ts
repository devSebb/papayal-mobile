import { request } from "./http";
import { AuthTokens, GiftCard, RedemptionToken, User } from "../types/api";

export const authApi = {
  login: async (params: { email: string; password: string; device_id?: string }) => {
    const { data } = await request<AuthTokens>("/api/v1/auth/login", {
      method: "POST",
      body: params
    });
    return data;
  },
  signup: async (params: {
    email: string;
    password: string;
    name: string;
    phone: string;
    national_id: string;
    device_id?: string;
  }) => {
    const { data } = await request<AuthTokens>("/api/v1/auth/signup", {
      method: "POST",
      body: params
    });
    return data;
  },
  refresh: async (refresh_token: string) => {
    const { data } = await request<AuthTokens>("/api/v1/auth/refresh", {
      method: "POST",
      body: { refresh_token },
      allowRefresh: false
    });
    return data;
  },
  logout: async (refresh_token: string) => {
    await request<{ revoked: boolean }>("/api/v1/auth/logout", {
      method: "POST",
      body: { refresh_token }
    });
  },
  logoutAll: async () => {
    await request("/api/v1/auth/logout_all", { method: "POST" });
  }
};

export const meApi = {
  me: async () => {
    const { data } = await request<User>("/api/v1/me");
    return data;
  }
};

export const giftCardApi = {
  list: async () => {
    const { data } = await request<GiftCard[]>("/api/v1/me/gift_cards");
    return data;
  },
  detail: async (id: string) => {
    const { data } = await request<GiftCard>(`/api/v1/me/gift_cards/${id}`);
    return data;
  },
  redemptionToken: async (id: string) => {
    const { data } = await request<RedemptionToken>(`/api/v1/me/gift_cards/${id}/redemption_token`, {
      method: "POST"
    });
    return data;
  }
};

