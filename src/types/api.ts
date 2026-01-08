export type AuthTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export type AuthResponse = {
  data: AuthTokens;
  request_id: string;
};

export type User = {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role?: string;
  avatar_url?: string | null;
  avatar_thumb_url?: string | null;
};

export type GiftCard = {
  id: string;
  merchant_id?: string;
  merchant_store_name?: string | null;
  store_name?: string | null;
  merchant_name?: string | null;
  merchant_logo_url?: string | null;
  merchant?: { name?: string | null };
  store?: { name?: string | null };
  name?: string | null;
  amount_cents: number;
  remaining_balance_cents: number;
  currency: string;
  status: string;
  expires_at?: string | null;
  sender_id?: string | null;
  recipient_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type RedemptionToken = {
  token: string;
  expires_at: string;
};

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiEnvelope<T> = {
  data: T;
  request_id: string;
};

