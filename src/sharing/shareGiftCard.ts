import { Alert, Share } from "react-native";

import { giftCardApi } from "../api/endpoints";

/**
 * Fetches the server-owned share message (warm Spanish copy + claim link)
 * and opens the native share sheet — in Ecuador that's WhatsApp first.
 * The link is a doorway, not a key: claiming stays OTP-guarded at signup.
 *
 * Returns true when the sheet was opened (not necessarily shared).
 */
export async function shareGiftCard(giftCardId: string): Promise<boolean> {
  try {
    const { message } = await giftCardApi.shareLink(giftCardId);
    await Share.share({ message });
    return true;
  } catch {
    Alert.alert(
      "No pudimos preparar el enlace",
      "Revisa tu conexión e inténtalo de nuevo."
    );
    return false;
  }
}
