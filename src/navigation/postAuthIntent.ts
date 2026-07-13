export type PostAuthIntent =
  | {
      type: "buy_gift_card";
      merchantId: string;
    }
  | {
      /** Open a gift card after auth (set by the claim deep-link flow). */
      type: "open_gift_card";
      giftCardId: string;
    };

let pendingIntent: PostAuthIntent | null = null;

export const setPendingPostAuthIntent = (intent: PostAuthIntent) => {
  pendingIntent = intent;
};

export const consumePendingPostAuthIntent = () => {
  const intent = pendingIntent;
  pendingIntent = null;
  return intent;
};
