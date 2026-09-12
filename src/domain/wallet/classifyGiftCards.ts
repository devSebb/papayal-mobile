import { ClassifiedGiftCards, GiftCardVM } from "./types";

/**
 * "Mis tarjetas" = the cards this account holds. Since D1 every card belongs
 * to exactly one recipient and every purchase is a load, so there is nothing
 * to classify as "sent" here — sent purchases come from loadsApi.sent().
 */
export const classifyGiftCards = (
  cards: GiftCardVM[],
  currentUserId?: string
): ClassifiedGiftCards => {
  if (!currentUserId) return { cards: [], canClassify: false };

  return {
    cards: cards.filter((card) => card.recipientId === currentUserId),
    canClassify: true
  };
};
