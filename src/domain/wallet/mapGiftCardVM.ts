import { GiftCard } from "../../types/api";
import { centsToDollars, formatMoney } from "../../utils/money";
import { GiftCardVM } from "./types";

const parseDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed);
};

const deriveMerchantLabel = (card: GiftCard) => {
  const candidates = [
    card.merchant_store_name,
    card.store_name,
    (card as any)?.storeName,
    card.merchant_name,
    (card as any)?.merchantName,
    card.name,
    (card as any)?.label,
    card.store?.name,
    card.merchant?.name
  ];
  const label = candidates.find((val) => typeof val === "string" && val.trim().length > 0);
  if (label) return label.trim();
  if (card.merchant_id) return `Merchant #${card.merchant_id}`;
  return "Gift Card";
};

export const mapGiftCardVM = (card: GiftCard, now = new Date()): GiftCardVM => {
  const merchantLabel = deriveMerchantLabel(card);
  const amount = centsToDollars(card.amount_cents);
  const remaining = centsToDollars(card.remaining_balance_cents);
  const expiresDate = parseDate(card.expires_at);

  const isExpired = Boolean(
    expiresDate && card.remaining_balance_cents > 0 && expiresDate.getTime() < now.getTime()
  );
  const lowerStatus = card.status?.toLowerCase?.() ?? "";
  const baseRedeemed = card.remaining_balance_cents === 0 || lowerStatus === "redeemed";
  const isRedeemed = isExpired || baseRedeemed;
  const status: GiftCardVM["status"] = isExpired ? "Expired" : isRedeemed ? "Redeemed" : "Active";
  const redeemedDeltaCents = Math.max(0, card.amount_cents - card.remaining_balance_cents);

  return {
    id: card.id,
    merchantLabel,
    merchantLogoUrl: card.merchant_logo_url ?? null,
    amountCents: card.amount_cents,
    remainingBalanceCents: card.remaining_balance_cents,
    currency: card.currency,
    amountFormatted: formatMoney(amount, card.currency),
    originalFormatted: formatMoney(amount, card.currency),
    remainingFormatted: formatMoney(remaining, card.currency),
    status,
    rawStatus: card.status,
    isExpired,
    isRedeemed,
    createdAt: card.created_at ?? null,
    updatedAt: card.updated_at ?? null,
    senderId: card.sender_id ?? undefined,
    recipientId: card.recipient_id ?? undefined,
    redeemedDeltaCents
  };
};

