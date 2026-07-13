import { request } from "./http";
import {
  AppConfig,
  AuthTokens,
  CheckoutQuote,
  EmailVerificationDetails,
  GiftCard,
  Merchant,
  RedemptionToken,
  SignupResponse,
  User
} from "../types/api";

export const authApi = {
  login: async (params: { email: string; password: string; device_id?: string }) => {
    // May return tokens OR a verification challenge (unverified email).
    const { data } = await request<SignupResponse>("/api/v1/auth/login", {
      method: "POST",
      body: params
    });
    return data;
  },
  signup: async (params: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    password_confirmation: string;
    phone: string;
    device_id?: string;
    interests?: string[];
    /**
     * OTP proving control of a pending recipient account's contact channel.
     * Omitted on the first attempt; the backend answers 409
     * `auth.claim_verification_required` when the email/phone matches a
     * pending account, and the signup is retried with the code.
     */
    claim_otp?: string;
  }) => {
    // Fresh signups return a verification challenge; pending-account claims
    // (with a valid claim_otp) return tokens.
    const { data } = await request<SignupResponse>("/api/v1/auth/signup", {
      method: "POST",
      body: params
    });
    return data;
  },
  /** Confirm the emailed 6-digit code for a fresh signup; returns tokens. */
  verifyEmail: async (params: { email: string; code: string; device_id?: string }) => {
    const { data } = await request<AuthTokens>("/api/v1/auth/verify_email", {
      method: "POST",
      body: params
    });
    return data;
  },
  /** Re-send the email verification code. */
  resendEmailVerification: async (email: string) => {
    const { data } = await request<EmailVerificationDetails>("/api/v1/auth/resend_verification", {
      method: "POST",
      body: { email }
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
  },
  forgotPassword: async (email: string) => {
    const { data } = await request<{ message: string }>("/api/v1/auth/forgot_password", {
      method: "POST",
      body: { email }
    });
    return data;
  },
  resetPassword: async (params: {
    reset_token: string;
    password: string;
    password_confirmation: string;
  }) => {
    const { data } = await request<{ message: string }>("/api/v1/auth/reset_password", {
      method: "POST",
      body: params
    });
    return data;
  }
};

export const meApi = {
  me: async () => {
    const { data } = await request<User>("/api/v1/me");
    return data;
  },
  update: async (payload: {
    first_name?: string;
    last_name?: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    country_of_residence?: string;
    date_of_birth?: string;
    preferred_channel?: "whatsapp" | "sms";
  }) => {
    const { data } = await request<User>("/api/v1/me", {
      method: "PATCH",
      body: payload
    });
    return data;
  },
  updateKyc: async (payload: {
    address: string;
    country_of_residence: string;
    date_of_birth: string;
    phone?: string;
  }) => {
    const { data } = await request<User>("/api/v1/me", {
      method: "PATCH",
      body: payload
    });
    return data;
  },
  uploadAvatar: async (formData: FormData) => {
    const { data } = await request<User>("/api/v1/me/avatar", {
      method: "POST",
      body: formData
    });
    return data;
  },
  deletionPreview: async () => {
    const { data } = await request<{
      balance_cents: number;
      active_card_count: number;
      is_merchant: boolean;
      currency: string;
    }>("/api/v1/me/deletion_preview");
    return data;
  },
  destroy: async (password: string) => {
    await request<{ deleted: boolean }>("/api/v1/me", {
      method: "DELETE",
      body: { password }
    });
  }
};

export const checkoutApi = {
  validateKyc: async () => {
    const { data } = await request<{ ok: boolean; missing?: string[] }>("/api/v1/checkout/validate_kyc", {
      method: "POST"
    });
    return data;
  },
  /** Server-authoritative subtotal/fee/total for a purchase amount. */
  quote: async (amountCents: number, currency = "USD") => {
    const { data } = await request<CheckoutQuote>("/api/v1/checkout/quote", {
      method: "POST",
      body: { amount_cents: amountCents, currency: currency.toLowerCase() }
    });
    return data;
  }
};

export const configApi = {
  /** Public remote config: limits, fees, kill switches, min app versions. */
  get: async () => {
    const { data } = await request<AppConfig>("/api/v1/config");
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
  byPaymentIntent: async (paymentIntentId: string) => {
    const { data } = await request<GiftCard | { gift_card?: GiftCard | null; status?: string }>(
      `/api/v1/gift_cards/by_payment_intent/${encodeURIComponent(paymentIntentId)}`
    );
    return data;
  },
  redemptionToken: async (id: string) => {
    const { data } = await request<RedemptionToken>(`/api/v1/me/gift_cards/${id}/redemption_token`, {
      method: "POST"
    });
    return data;
  }
};

export const merchantsApi = {
  list: async () => {
    const { data } = await request<Merchant[]>("/api/v1/merchants");
    return data;
  },
  detail: async (id: string) => {
    const { data } = await request<Merchant>(`/api/v1/merchants/${id}`);
    return data;
  }
};

export const publicMerchantsApi = {
  list: async () => {
    const { data } = await request<Merchant[]>("/api/v1/public/merchants");
    return data;
  },
  detail: async (id: string) => {
    const { data } = await request<Merchant>(`/api/v1/public/merchants/${id}`);
    return data;
  }
};

export const pushTokenApi = {
  register: async (token: string, platform: string) => {
    await request("/api/v1/me/push_tokens", {
      method: "POST",
      body: { token, platform }
    });
  },
  unregister: async (token: string) => {
    await request("/api/v1/me/push_tokens", {
      method: "DELETE",
      body: { token }
    });
  }
};
