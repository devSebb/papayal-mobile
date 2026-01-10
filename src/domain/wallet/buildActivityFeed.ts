import { GiftCard } from "../../types/api";
import { centsToDollars, formatMoney } from "../../utils/money";
import { ActivityItem } from "./types";
import { mapGiftCardVM } from "./mapGiftCardVM";

const toSortValue = (timestamp?: string | null, fallbackId?: string) => {
  const parsed = timestamp ? Date.parse(timestamp) : NaN;
  if (!Number.isNaN(parsed)) return parsed;
  const numericId = fallbackId ? Number.parseInt(fallbackId, 10) : NaN;
  return Number.isNaN(numericId) ? 0 : numericId;
};

export const buildActivityFeed = (cards: GiftCard[], currentUserId?: string): ActivityItem[] => {
  const now = new Date();
  const hasSenderRecipientFields = cards.some(
    (card) => card.sender_id !== undefined || card.recipient_id !== undefined
  );
  const items: ActivityItem[] = [];

  cards.forEach((card) => {
    const vm = mapGiftCardVM(card, now);
    const baseTimestamp = card.updated_at ?? card.created_at ?? null;
    const sortBase = toSortValue(baseTimestamp, card.id);

    const additionItem: ActivityItem = hasSenderRecipientFields
      ? currentUserId && card.recipient_id === currentUserId
        ? {
            id: `${card.id}-received`,
            cardId: card.id,
            title: "Tarjeta recibida",
            subtitle: vm.merchantLabel,
            timestamp: baseTimestamp ?? undefined,
            sortValue: sortBase,
            kind: "received",
            amountLabel: vm.originalFormatted
          }
        : currentUserId && card.sender_id === currentUserId
        ? {
            id: `${card.id}-sent`,
            cardId: card.id,
            title: "Tarjeta enviada",
            subtitle: vm.merchantLabel,
            timestamp: baseTimestamp ?? undefined,
            sortValue: sortBase,
            kind: "sent",
            amountLabel: vm.originalFormatted
          }
        : {
            id: `${card.id}-added`,
            cardId: card.id,
            title: "Tarjeta añadida",
            subtitle: vm.merchantLabel,
            timestamp: baseTimestamp ?? undefined,
            sortValue: sortBase,
            kind: "added",
            amountLabel: vm.originalFormatted
          }
      : {
          id: `${card.id}-added`,
          cardId: card.id,
          title: "Tarjeta añadida",
          subtitle: vm.merchantLabel,
          timestamp: baseTimestamp ?? undefined,
          sortValue: sortBase,
          kind: "added",
          amountLabel: vm.originalFormatted
        };

    items.push(additionItem);

    const redeemedDeltaCents = vm.redeemedDeltaCents ?? 0;
    if (redeemedDeltaCents > 0) {
      const redeemedAmount = centsToDollars(redeemedDeltaCents);
      const redeemedTitle = redeemedDeltaCents >= card.amount_cents ? "Canje total" : "Canje parcial";
      items.push({
        id: `${card.id}-redeemed`,
        cardId: card.id,
        title: redeemedTitle,
        subtitle: vm.merchantLabel,
        timestamp: baseTimestamp ?? undefined,
        sortValue: sortBase + 1,
        kind: "redeemed",
        amountLabel: formatMoney(redeemedAmount, card.currency)
      });
    }

    if (vm.isExpired) {
      items.push({
        id: `${card.id}-expired`,
        cardId: card.id,
        title: "Tarjeta vencida",
        subtitle: vm.merchantLabel,
        timestamp: card.expires_at ?? baseTimestamp ?? undefined,
        sortValue: toSortValue(card.expires_at, card.id) + 0.5,
        kind: "expired",
        amountLabel: vm.remainingFormatted
      });
    }
  });

  return items.sort((a, b) => b.sortValue - a.sortValue);
};

