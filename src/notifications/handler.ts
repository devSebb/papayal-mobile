import * as Notifications from "expo-notifications";
import type { NavigationContainerRefWithCurrent } from "@react-navigation/native";
import type { PushNotificationData } from "./types";

/**
 * Configure how notifications are displayed when the app is in the foreground.
 * Must be called at module level (outside React) to take effect immediately.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

/**
 * Navigates to the appropriate screen based on notification data.
 */
function navigateFromNotification(
  navigationRef: NavigationContainerRefWithCurrent<any>,
  data: PushNotificationData
): void {
  if (!navigationRef.isReady() || !data?.gift_card_id) return;

  switch (data.type) {
    case "gift_card_received":
    case "gift_card_redeemed":
      navigationRef.navigate("App", {
        screen: "WalletTab",
        params: {
          screen: "GiftCardDetail",
          params: { id: data.gift_card_id }
        }
      });
      break;
    default:
      break;
  }
}

/**
 * Sets up a listener for when the user taps a notification.
 * Returns the subscription so the caller can clean it up.
 */
export function setupNotificationResponseListener(
  navigationRef: NavigationContainerRefWithCurrent<any>
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as PushNotificationData;
    navigateFromNotification(navigationRef, data);
  });
}

/**
 * Handles the case where the app was launched from a killed state
 * by tapping a notification. Should be called once after navigation is ready.
 */
export async function handleInitialNotification(
  navigationRef: NavigationContainerRefWithCurrent<any>
): Promise<void> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (response) {
    const data = response.notification.request.content.data as PushNotificationData;
    navigateFromNotification(navigationRef, data);
  }
}
