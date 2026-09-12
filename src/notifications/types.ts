/**
 * Push payloads the backend sends (§4.4 "Notifications"). Every one carries
 * the card id; load-level events also carry the load that triggered them.
 */
export type PushNotificationData = {
  type:
    | "gift_card_received"
    | "gift_card_topped_up"
    | "gift_card_redeemed"
    | "gift_card_hold_released"
    | "gift_card_load_disputed";
  gift_card_id: string;
  load_id?: string;
};
