import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";

// EAS project ID, read from app config (app.json → extra.eas.projectId) so
// there is a single source of truth. The literal fallback only exists for
// the edge case where the embedded config is unavailable at runtime — it
// must match app.json.
const PROJECT_ID: string =
  Constants.expoConfig?.extra?.eas?.projectId ?? "089f71cd-3c34-4cdd-ae21-fae443cec5e0";

/**
 * Requests notification permissions and registers the Expo push token
 * with the backend via the provided callback.
 *
 * Fails silently if permission is denied or on simulator — the app
 * works fine without push notifications.
 */
export async function registerForPushNotifications(
  onToken: (token: string) => Promise<void>
): Promise<void> {
  if (!Device.isDevice) {
    if (__DEV__) console.log("[Push] Skipping — not a physical device");
    return;
  }

  // Set up Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "General",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default"
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    if (__DEV__) console.log("[Push] Permission denied");
    return;
  }

  const pushToken = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
  await onToken(pushToken.data);

  if (__DEV__) console.log("[Push] Registered:", pushToken.data);
}

/**
 * Best-effort unregistration of the push token on the backend.
 * Swallows all errors since logout must always succeed.
 */
export async function unregisterPushToken(
  onUnregister: (token: string) => Promise<void>
): Promise<void> {
  try {
    const pushToken = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    await onUnregister(pushToken.data);
  } catch {
    // Best effort — don't block logout
  }
}
