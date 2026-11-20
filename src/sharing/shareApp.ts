import { Share } from "react-native";

/**
 * "Comparte Papayal" — generic app recommendation via the native share
 * sheet. Links to the landing page (ours), which today explains the app and
 * after the store launch points at the listing — old shares never break.
 */
const APP_URL = "https://papayal.app";

const SHARE_MESSAGE = `🧡 Conoce Papayal: envía tarjetas de regalo digitales a tu familia en Ecuador y canjéalas en comercios aliados. Descárgala aquí: ${APP_URL}`;

export async function shareApp(): Promise<void> {
  try {
    await Share.share({ message: SHARE_MESSAGE });
  } catch {
    // Sheet dismissed or unavailable — nothing to recover.
  }
}
