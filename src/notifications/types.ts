export type PushNotificationData = {
  type: "gift_card_received" | "gift_card_redeemed";
  gift_card_id: string;
};
