export type AuthTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export type AuthResponse = {
  data: AuthTokens;
  request_id: string;
};

/**
 * Returned by /auth/signup and /auth/login when the account exists but its
 * email isn't verified yet. No tokens are issued until the emailed 6-digit
 * code is confirmed via /auth/verify_email.
 */
export type EmailVerificationRequired = {
  verification_required: true;
  email: string;
  masked_email?: string | null;
  /** Seconds until a resend is allowed. */
  resend_available_in?: number;
};

/** Auth endpoints return either tokens (verified) or a verification challenge. */
export type SignupResponse = AuthTokens | EmailVerificationRequired;

/** Payload from /auth/resend_verification. */
export type EmailVerificationDetails = {
  masked_email?: string | null;
  resend_available_in?: number;
};

export type User = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  country_of_residence?: string | null;
  date_of_birth?: string | null;
  role?: string;
  avatar_url?: string | null;
  avatar_thumb_url?: string | null;
  interests?: string[];
  preferred_channel?: "whatsapp" | "sms";
};

export type GiftCardSender = {
  id: string;
  name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
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
  /** Sender details (only present on received gift cards) */
  sender?: GiftCardSender | null;
  /** Optional note/message from sender */
  note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  /** ISO timestamp. If present AND in the future, the card is on a
   *  security hold and not yet redeemable. Cleared when the hold expires. */
  held_until?: string | null;
};

export type RedemptionToken = {
  token: string;
  expires_at: string;
};

/**
 * Public teaser behind a papayal.app/claim/<token> link. Deliberately
 * minimal — enough to personalize the claim flow, never enough to redeem.
 */
export type ClaimLinkTeaser = {
  gift_card_id: string | number;
  status: "active" | "redeemed" | "expired" | "canceled";
  amount_cents: number;
  currency: string;
  merchant_name?: string | null;
  merchant_logo_url?: string | null;
  sender_first_name?: string | null;
  note?: string | null;
  /** e.g. "+593•••3456" — the channel that must pass the claim OTP. */
  recipient_masked_phone?: string | null;
  /** True when the recipient already has a claimed (registered) account. */
  recipient_registered?: boolean;
};

export type Merchant = {
  id: string;
  store_name: string;
  name: string;
  status: string;
  logo_url?: string | null;
  contact_email?: string | null;
  address?: string | null;
  categories?: string[];
  brandColor?: string | null;
  brand_color?: string | null;
  amountPresets?: number[] | null;
  amount_presets?: number[] | null;
  locationsCount?: number | null;
  locations_count?: number | null;
  isNational?: boolean | null;
  is_national?: boolean | null;
  coverageText?: string | null;
  coverage_text?: string | null;
  /** True when cards for this merchant are paid at a partner network
   *  (Farmaenlace deal: Medicity / Farmacias Económicas) instead of the
   *  merchant's own stores. Drives redemption disclaimers in the UI. */
  partner_redemption?: boolean | null;
  redemption_partner_label?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

/** Server-authoritative price breakdown from POST /api/v1/checkout/quote.
 *  The app must never compute fees locally. */
export type CheckoutQuote = {
  subtotal_cents: number;
  fee_cents: number;
  total_cents: number;
  currency: string;
};

/** Remote config from GET /api/v1/config (public). */
export type AppConfig = {
  purchases_enabled: boolean;
  min_supported_version: { ios?: string | null; android?: string | null };
  fees: { buyer_fee_bps: number; buyer_fee_fixed_cents: number };
  gift_card_limits: { min_cents: number; max_cents: number };
};

/**
 * Details payload of the 409 `auth.claim_verification_required` error
 * returned by POST /api/v1/auth/signup when the email/phone matches a
 * pending recipient account (gift cards waiting to be claimed).
 */
export type ClaimVerificationDetails = {
  channels?: string[];
  masked_email?: string | null;
  masked_phone?: string | null;
  /** Present when a code was sent recently; seconds until a resend is allowed. */
  retry_in_seconds?: number;
};

/** Sender-side share payload: claim URL + server-owned prewritten message. */
export type GiftCardShareLink = {
  claim_url: string;
  message: string;
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
