import { Alert, Linking, Platform } from "react-native";
import { legalUrl } from "../config/urls";

/**
 * Opens a legal document URL in an in-app browser.
 * Uses expo-web-browser if available, falls back to Linking API.
 * 
 * @param path - The legal document path (e.g., "/legal/terminos")
 */
export async function openLegal(path: string): Promise<void> {
  const url = legalUrl(path);
  
  // Developer log for debugging
  if (__DEV__) {
    console.log(`[Legal] Opening: ${url}`);
    console.log(`[Legal] WEB_BASE_URL: ${process.env.EXPO_PUBLIC_WEB_BASE_URL ?? "default (https://papayal.app)"}`);
  }

  try {
    // Try to use expo-web-browser if available (requires native build)
    try {
      const WebBrowser = await import("expo-web-browser");
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET
      });
    } catch (webBrowserError) {
      // Fallback to Linking API if expo-web-browser is not available
      if (__DEV__) {
        console.log("[Legal] expo-web-browser not available, using Linking API");
      }
      
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        throw new Error("Cannot open URL");
      }
    }
  } catch (error) {
    console.error("[Legal] Failed to open browser:", error);
    Alert.alert(
      "No se pudo abrir el enlace",
      "Verifica tu conexión e inténtalo de nuevo."
    );
  }
}

