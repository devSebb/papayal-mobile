export type PostAuthIntent = {
  type: "buy_gift_card";
  merchantId: string;
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
