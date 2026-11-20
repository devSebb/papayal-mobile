import { GiftCard } from "../../types/api";

/** The three "Mis tarjetas" tabs (§11.3). */
export type TabKey = "cards" | "sent" | "activity";

/**
 * One card, ready to render. `availableCents` is the SPENDABLE balance — the
 * number every CTA and every row is about — while `remainingBalanceCents`
 * keeps the total so "Retenido"/"En disputa" can be explained separately.
 */
export type GiftCardVM = {
  id: GiftCard["id"];
  merchantId?: string | null;
  merchantLabel: string;
  merchantLogoUrl?: string | null;
  currency: string;
  /** Redeemable right now (spendable_cents). */
  availableCents: number;
  /** Total remaining, held and disputed included. */
  remainingBalanceCents: number;
  heldCents: number;
  disputedCents: number;
  totalLoadedCents: number;
  loadsCount: number;
  availableFormatted: string;
  remainingFormatted: string;
  heldFormatted: string;
  disputedFormatted: string;
  /** Admin freeze (D3): nothing is redeemable until support lifts it. */
  isFrozen: boolean;
  frozenReason?: string | null;
  isCanceled: boolean;
  /** Part of the balance is under a Radar hold. */
  isHeld: boolean;
  /** A chargeback is open on one of the loads; the rest stays spendable (D4). */
  hasDispute: boolean;
  /** No money at all on the card — "Sin saldo", never "canjeada" (D3). */
  isEmpty: boolean;
  /** True when a code can be generated right now. */
  canRedeem: boolean;
  heldUntil?: string | null;
  lastLoadedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  rawStatus?: string;
  recipientId?: string;
};

export type ClassifiedGiftCards = {
  /** Cards the user holds (they are the recipient). */
  cards: GiftCardVM[];
  /** True once the account id is known, so "mine" can be decided at all. */
  canClassify: boolean;
};
