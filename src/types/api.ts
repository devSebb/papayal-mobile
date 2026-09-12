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

/** Card status as served by §8.1. `redeemed`/`expired` are legacy values the
 *  backend maps to `active`; they stay in the union so an older serializer
 *  never breaks the app (§11.4). */
export type GiftCardStatus = "active" | "frozen" | "canceled" | "redeemed" | "expired";

/** Lifecycle of one load, derived server-side from its money columns
 *  (GiftCardLoad#derived_status). Never gate money on it — use the cents. */
export type GiftCardLoadStatus =
  | "available"
  | "held"
  | "disputed"
  | "exhausted"
  | "refunded"
  | "written_off"
  | "canceled";

export type GiftCardLoadSource = "stripe" | "issuance" | "migration_merge" | "admin_adjustment";

/** One payment credited onto a card (§3.2). Every purchase — the recipient's
 *  own or any buyer's — is a load; the card is the recipient's. */
export type GiftCardLoad = {
  id: string;
  gift_card_id: string;
  amount_cents: number;
  /** Unspent part of THIS load. Held/disputed loads keep their cents here. */
  remaining_cents: number;
  refunded_cents: number;
  written_off_cents: number;
  currency: string;
  source: GiftCardLoadSource;
  sender_id?: string | null;
  sender?: GiftCardSender | null;
  note?: string | null;
  status: GiftCardLoadStatus;
  /** Set only while a Radar hold is still in the future. */
  held_until?: string | null;
  /** Set only while a chargeback on this load is unresolved. */
  disputed_at?: string | null;
  created_at?: string | null;
  /** The buyer topped up their own card. */
  is_self: boolean;
};

/** Masked recipient on a load the current user paid (§8.2 "Enviadas"). */
export type SentLoadRecipient = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  masked_phone?: string | null;
  masked_email?: string | null;
  registered: boolean;
};

/** Card summary carried by a sent load, so "Enviadas" needs no second fetch. */
export type SentLoadCard = {
  id: string;
  status: GiftCardStatus;
  merchant_id?: string | null;
  merchant?: { id: string; store_name?: string | null; logo_url?: string | null } | null;
  spendable_cents: number;
  remaining_balance_cents: number;
  total_loaded_cents: number;
  loads_count: number;
};

/** A load the current user paid for — the "Enviadas" row (§8.2). */
export type SentLoad = GiftCardLoad & {
  refundable_cents: number;
  claim_status: "claimed" | "pending_claim";
  recipient?: SentLoadRecipient | null;
  gift_card?: SentLoadCard | null;
};

export type PaginatedLoads = {
  loads: GiftCardLoad[];
  page: number;
  per_page: number;
  total_count: number;
  has_more: boolean;
};

export type PaginatedSentLoads = Omit<PaginatedLoads, "loads"> & { loads: SentLoad[] };

/**
 * One card per merchant, per recipient (D1). `remaining_balance_cents` is the
 * TOTAL including held and disputed money; `spendable_cents` is what can be
 * redeemed right now, and is what every balance the user acts on should read.
 *
 * The COMPAT fields (`amount_cents`, `sender`, `note`, `held_until`) are the
 * old single-card shape the store app still reads; this app prefers the new
 * ones and falls back to them for one release (§11.4).
 */
export type GiftCard = {
  id: string;
  merchant_id?: string;
  merchant_store_name?: string | null;
  store_name?: string | null;
  merchant_name?: string | null;
  merchant_logo_url?: string | null;
  merchant?: { name?: string | null; store_name?: string | null; logo_url?: string | null };
  store?: { name?: string | null };
  name?: string | null;
  /** COMPAT = total_loaded_cents. */
  amount_cents: number;
  /** Total remaining, held and disputed money included. */
  remaining_balance_cents: number;
  /** Redeemable right now. Absent on a pre-reloadable serializer (§11.4). */
  spendable_cents?: number;
  held_cents?: number;
  disputed_cents?: number;
  total_loaded_cents?: number;
  loads_count?: number;
  last_loaded_at?: string | null;
  /** Admin-entered reason, present only while the card is frozen. */
  frozen_reason?: string | null;
  currency: string;
  status: GiftCardStatus | string;
  expires_at?: string | null;
  sender_id?: string | null;
  recipient_id?: string | null;
  /** COMPAT: the latest load's buyer. Per-load senders live in `loads`. */
  sender?: GiftCardSender | null;
  /** COMPAT: the latest load's note. */
  note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  /** COMPAT: earliest hold among held loads, only while still in the future. */
  held_until?: string | null;
  /** Newest first, up to 20. The full list comes from giftCardApi.loads(). */
  loads?: GiftCardLoad[];
};

/** by_payment_intent: the card at top level plus the load this payment made. */
export type GiftCardWithLoad = GiftCard & {
  load?: GiftCardLoad | null;
  /** Alias of `load`, kept by the backend as a compat shim. */
  top_up?: GiftCardLoad | null;
};

export type RedemptionToken = {
  token: string;
  expires_at: string;
  /** What the merchant may capture against this code (§8.3). */
  spendable_cents?: number;
};

/**
 * Public teaser behind a papayal.app/claim/<token> link. Deliberately
 * minimal — enough to personalize the claim flow, never enough to redeem.
 */
export type ClaimLinkTeaser = {
  gift_card_id: string | number;
  /** The load this link resolves to (§8.2). */
  load_id?: string | number;
  status: GiftCardStatus;
  load_status?: GiftCardLoadStatus;
  /** False for the first load on the card, true for every top-up after it. */
  is_reload?: boolean;
  /** THIS load's amount, not the card balance. */
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
  /** Server-written headline (§4.4); the app renders it verbatim when present. */
  teaser?: string | null;
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

/** Where a purchase will land (§8.3 `target` on POST /checkout/payment_intent):
 *  the recipient's existing card at this merchant, or null for a first card. */
export type CheckoutTarget = {
  /** The buyer is reloading their own card. */
  self: boolean;
  existing_card_id?: string | number | null;
  current_balance_cents: number;
  projected_balance_cents: number;
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
export type AppConfigLimits = {
  min_load_cents: number;
  max_load_cents: number;
  max_daily_load_per_card_cents: number;
  max_card_balance_cents: number;
  max_loads_per_card_per_day: number;
  max_daily_load_per_buyer_cents: number;
  max_daily_loads_per_buyer: number;
  max_30d_load_per_recipient_cents: number;
  max_30d_load_per_buyer_cents: number;
  buyer_refund_window_hours: number;
};

export type AppConfig = {
  purchases_enabled: boolean;
  min_supported_version: { ios?: string | null; android?: string | null };
  fees: { buyer_fee_bps: number; buyer_fee_fixed_cents: number };
  /** COMPAT: the old amount picker's floor/ceiling. `limits` is authoritative. */
  gift_card_limits: { min_cents: number; max_cents: number };
  /** The §4.1 caps. Optional so a pre-Phase-3 backend still boots the app. */
  limits?: AppConfigLimits;
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
  load_id?: string;
  gift_card_id?: string;
};

/** GET /me/activity (§8.2) — the "Historial" tab, built server-side. */
export type ActivityEventType =
  | "load_received"
  | "load_sent"
  | "load_self"
  | "redemption"
  | "reversal"
  | "refund"
  | "write_off"
  | "hold_released";

export type ActivityEvent = {
  type: ActivityEventType;
  amount_cents: number;
  currency: string;
  gift_card_id?: string | null;
  load_id?: string | null;
  transaction_id?: string | null;
  merchant?: { id: string; store_name?: string | null } | null;
  counterpart?: { id: string; name?: string | null } | null;
  created_at?: string | null;
};

export type ActivityPage = {
  events: ActivityEvent[];
  next_cursor?: string | null;
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
