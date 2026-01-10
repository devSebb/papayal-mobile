import { ClassifiedGiftCards, GiftCardVM } from "./types";

export const classifyGiftCards = (
  cards: GiftCardVM[],
  currentUserId?: string
): ClassifiedGiftCards => {
  const hasSenderRecipientFields = cards.some(
    (card) => card.senderId !== undefined || card.recipientId !== undefined
  );
  const canClassifyTransfers = hasSenderRecipientFields && Boolean(currentUserId);

  const redeemed = cards.filter((card) => card.isRedeemed);
  const received = canClassifyTransfers
    ? cards.filter((card) => card.recipientId && card.recipientId === currentUserId)
    : [];
  const sent = canClassifyTransfers
    ? cards.filter((card) => card.senderId && card.senderId === currentUserId)
    : [];

  return {
    all: cards,
    received,
    sent,
    redeemed,
    hasSenderRecipientFields,
    canClassifyTransfers
  };
};


