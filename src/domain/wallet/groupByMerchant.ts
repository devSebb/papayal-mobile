import { GiftCard } from "../../types/api";
import { deriveMerchantLabel } from "./mapGiftCardVM";

/** Cards under this balance are "crumbs": presented first in the guided
 *  redemption queue so tiny leftovers actually get spent instead of
 *  surviving forever. */
export const CRUMB_THRESHOLD_CENTS = 100;

export type MerchantGroup = {
  /** Stable list/navigation key ("none" for cards without a merchant). */
  key: string;
  merchantId: string | null;
  merchantLabel: string;
  merchantLogoUrl: string | null;
  currency: string;
  /** Remaining balance across active cards, held included. */
  totalCents: number;
  /** Spendable right now (active, not held). */
  availableCents: number;
  heldCents: number;
  /** Active cards with balance, sorted largest balance first. */
  activeCards: GiftCard[];
  /** Fully consumed / inactive cards, newest first. */
  redeemedCards: GiftCard[];
};

export const isCardHeld = (card: GiftCard, now = new Date()) => {
  if (!card.held_until) return false;
  const parsed = Date.parse(card.held_until);
  return !Number.isNaN(parsed) && parsed > now.getTime();
};

const isSpendable = (card: GiftCard) =>
  card.status?.toLowerCase?.() === "active" && card.remaining_balance_cents > 0;

const senderFullName = (card: GiftCard) => {
  const sender = card.sender;
  if (!sender) return null;
  return (
    sender.full_name?.trim() ||
    [sender.name, sender.last_name].filter(Boolean).join(" ").trim() ||
    sender.name?.trim() ||
    null
  );
};

/** "María Pérez" → "María P." — the short attribution used on card faces. */
export const senderShortName = (card: GiftCard) => {
  const full = senderFullName(card);
  if (!full) return null;
  const parts = full.split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
};

const updatedAtValue = (card: GiftCard) => {
  const candidate = card.updated_at ?? card.created_at;
  const parsed = candidate ? Date.parse(candidate) : NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * Groups the current user's RECEIVED cards by merchant. Pure presentation:
 * the backend still tracks every card individually and every redemption is
 * captured per card — this only changes how the wallet displays them.
 */
export const groupReceivedByMerchant = (
  cards: GiftCard[],
  currentUserId?: string,
  now = new Date()
): MerchantGroup[] => {
  if (!currentUserId) return [];

  const groups = new Map<string, MerchantGroup>();

  for (const card of cards) {
    if (!card.recipient_id || card.recipient_id !== currentUserId) continue;

    const key = card.merchant_id ?? "none";
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        merchantId: card.merchant_id ?? null,
        merchantLabel: deriveMerchantLabel(card),
        merchantLogoUrl: card.merchant_logo_url ?? null,
        currency: card.currency || "USD",
        totalCents: 0,
        availableCents: 0,
        heldCents: 0,
        activeCards: [],
        redeemedCards: []
      };
      groups.set(key, group);
    }

    if (isSpendable(card)) {
      group.activeCards.push(card);
      group.totalCents += card.remaining_balance_cents;
      if (isCardHeld(card, now)) {
        group.heldCents += card.remaining_balance_cents;
      } else {
        group.availableCents += card.remaining_balance_cents;
      }
      group.merchantLogoUrl = group.merchantLogoUrl ?? card.merchant_logo_url ?? null;
    } else {
      group.redeemedCards.push(card);
    }
  }

  const result = Array.from(groups.values());
  for (const group of result) {
    group.activeCards.sort(
      (a, b) => b.remaining_balance_cents - a.remaining_balance_cents
    );
    group.redeemedCards.sort((a, b) => updatedAtValue(b) - updatedAtValue(a));
  }

  return result.sort(
    (a, b) => b.availableCents - a.availableCents || b.totalCents - a.totalCents
  );
};

/**
 * Order in which the guided flow presents cards at the register.
 * Crumbs-first (ascending) sweeps tiny balances before the main payment;
 * the rest go largest-first to minimize captures. An explicit user pick
 * (leadCardId, via carousel swipe) always goes first — user choice wins.
 */
export const buildRedemptionQueue = (
  activeCards: GiftCard[],
  options: { crumbsFirst: boolean; leadCardId?: string; now?: Date } = { crumbsFirst: true }
): GiftCard[] => {
  const now = options.now ?? new Date();
  const spendable = activeCards.filter(
    (card) => isSpendable(card) && !isCardHeld(card, now)
  );

  const largestFirst = (a: GiftCard, b: GiftCard) =>
    b.remaining_balance_cents - a.remaining_balance_cents;

  let queue: GiftCard[];
  if (options.crumbsFirst) {
    const crumbs = spendable
      .filter((card) => card.remaining_balance_cents < CRUMB_THRESHOLD_CENTS)
      .sort((a, b) => a.remaining_balance_cents - b.remaining_balance_cents);
    const rest = spendable
      .filter((card) => card.remaining_balance_cents >= CRUMB_THRESHOLD_CENTS)
      .sort(largestFirst);
    queue = [...crumbs, ...rest];
  } else {
    queue = [...spendable].sort(largestFirst);
  }

  if (options.leadCardId) {
    const lead = queue.find((card) => card.id === options.leadCardId);
    if (lead) {
      queue = [lead, ...queue.filter((card) => card.id !== lead.id)];
    }
  }

  return queue;
};
