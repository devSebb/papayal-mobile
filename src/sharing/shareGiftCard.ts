import { Alert, Share } from "react-native";

import { giftCardApi } from "../api/endpoints";

/**
 * Fetches the server-owned share message (warm Spanish copy + claim link)
 * and opens the native share sheet — in Ecuador that's WhatsApp first.
 * The link is a doorway, not a key: claiming stays OTP-guarded at signup.
 *
 * A claim link resolves a LOAD (§8.2), so the message says "te envié una
 * tarjeta" for a first load and "añadí $X a tu tarjeta" for a reload. Passing
 * the load id is what keeps those two apart; without one the backend shares
 * the caller's most recent load on that card.
 *
 * Returns true when the sheet was opened (not necessarily shared).
 */
export async function shareGiftCardLoad(
  giftCardId: string,
  loadId?: string
): Promise<boolean> {
  try {
    const { message } = await giftCardApi.shareLink(giftCardId, loadId);
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
