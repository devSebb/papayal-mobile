import { GiftCard, GiftCardLoad } from "../../types/api";
import { centsToDollars, formatMoney } from "../../utils/money";
import { GiftCardVM } from "./types";

const parseDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed);
};

export const deriveMerchantLabel = (card: GiftCard) => {
  const candidates = [
    card.merchant_store_name,
    card.store_name,
    (card as any)?.storeName,
    card.merchant_name,
    (card as any)?.merchantName,
    card.merchant?.store_name,
    card.name,
    (card as any)?.label,
    card.store?.name,
    card.merchant?.name
  ];
  const label = candidates.find((val) => typeof val === "string" && val.trim().length > 0);
  if (label) return label.trim();
  // Never surface raw merchant IDs to the user.
  if (card.merchant_id) return "Comercio";
  return "Tarjeta de regalo";
};

/** "María Pérez" → "María P." — the short attribution on a load row. */
export const senderShortName = (load: Pick<GiftCardLoad, "sender">) => {
  const sender = load.sender;
  if (!sender) return null;
  const full =
    sender.full_name?.trim() ||
    [sender.name, sender.last_name].filter(Boolean).join(" ").trim() ||
    sender.name?.trim() ||
    null;
  if (!full) return null;
  const parts = full.split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
};

/** A load whose Radar hold is still in the future. */
export const isLoadHeld = (load: GiftCardLoad, now = new Date()) => {
  const until = parseDate(load.held_until);
  return Boolean(until && until.getTime() > now.getTime());
};

/** A load with an open chargeback: out of spendable until it resolves (D4). */
export const isLoadDisputed = (load: GiftCardLoad) => Boolean(load.disputed_at);

/**
 * Turns a card into what the UI renders. Spendable is the headline number
 * (§3.4); held and disputed money is shown separately so the user can see
 * where the rest of their balance went instead of it silently vanishing.
 *
 * A pre-reloadable serializer omits the new fields, so each one falls back to
 * the old single-card meaning for one release (§11.4).
 */
export const mapGiftCardVM = (card: GiftCard, now = new Date()): GiftCardVM => {
  const currency = card.currency || "USD";
  const remaining = card.remaining_balance_cents ?? 0;
  const held = card.held_cents ?? 0;
  const disputed = card.disputed_cents ?? 0;
  const status = card.status?.toLowerCase?.() ?? "";
  const isFrozen = status === "frozen";
  const isCanceled = status === "canceled";
  // Old serializer: no spendable_cents, and a card-wide held_until meant the
  // whole balance was on hold.
  const legacyHeld = Boolean(
    card.spendable_cents === undefined &&
      card.held_until &&
      (parseDate(card.held_until)?.getTime() ?? 0) > now.getTime()
  );
  const available =
    card.spendable_cents ??
    (isFrozen || isCanceled || legacyHeld ? 0 : Math.max(0, remaining - held - disputed));

  return {
    id: card.id,
    merchantId: card.merchant_id ?? null,
    merchantLabel: deriveMerchantLabel(card),
    merchantLogoUrl: card.merchant_logo_url ?? card.merchant?.logo_url ?? null,
    currency,
    availableCents: available,
    remainingBalanceCents: remaining,
    heldCents: held || (legacyHeld ? remaining : 0),
    disputedCents: disputed,
    totalLoadedCents: card.total_loaded_cents ?? card.amount_cents ?? 0,
    loadsCount: card.loads_count ?? 1,
    availableFormatted: formatMoney(centsToDollars(available), currency),
    remainingFormatted: formatMoney(centsToDollars(remaining), currency),
    heldFormatted: formatMoney(centsToDollars(held || (legacyHeld ? remaining : 0)), currency),
    disputedFormatted: formatMoney(centsToDollars(disputed), currency),
    isFrozen,
    frozenReason: card.frozen_reason ?? null,
    isCanceled,
    isHeld: (held || (legacyHeld ? remaining : 0)) > 0,
    hasDispute: disputed > 0,
    isEmpty: remaining === 0,
    canRedeem: !isFrozen && !isCanceled && available > 0,
    heldUntil: card.held_until ?? null,
    lastLoadedAt: card.last_loaded_at ?? null,
    createdAt: card.created_at ?? null,
    updatedAt: card.updated_at ?? null,
    rawStatus: card.status,
    recipientId: card.recipient_id ?? undefined
  };
};
