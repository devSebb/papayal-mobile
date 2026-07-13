import { Alert, EmitterSubscription, Linking } from "react-native";
import type { NavigationContainerRefWithCurrent } from "@react-navigation/native";

/**
 * Universal/deep link handling for the URLs the app claims:
 *
 *   https://papayal.app/claim/<token>   (also papayal://claim/<token>)
 *   https://papayal.app/reset?token=…   (also papayal://reset?token=…)
 *
 * Mirrors the push-notification handler pattern (imperative navigation via
 * the shared navigationRef) because the navigation tree is auth-conditional —
 * a declarative `linking` config can't target routes that aren't mounted.
 * Keep the supported paths in sync with the backend's WellKnownController.
 */

export type AppLink =
  | { type: "claim"; token: string }
  | { type: "reset"; token?: string };

const CLAIM_PATTERN = /^(?:papayal:\/\/|https:\/\/(?:www\.)?papayal\.app\/)claim\/([A-Za-z0-9._~-]+)/i;
const RESET_PATTERN = /^(?:papayal:\/\/|https:\/\/(?:www\.)?papayal\.app\/)reset(?:[/?#]|$)/i;
const TOKEN_PARAM_PATTERN = /[?&]token=([^&#]+)/;

export function parseAppLink(url: string | null): AppLink | null {
  if (!url) return null;

  const claimMatch = url.match(CLAIM_PATTERN);
  if (claimMatch) {
    return { type: "claim", token: decodeURIComponent(claimMatch[1]) };
  }

  if (RESET_PATTERN.test(url)) {
    const tokenMatch = url.match(TOKEN_PARAM_PATTERN);
    return { type: "reset", token: tokenMatch ? decodeURIComponent(tokenMatch[1]) : undefined };
  }

  return null;
}

function navigateFromAppLink(
  navigationRef: NavigationContainerRefWithCurrent<any>,
  link: AppLink,
  isSignedIn: boolean
): void {
  switch (link.type) {
    case "claim":
      // ClaimLanding is registered in both the auth stack and the wallet
      // stack; it resolves the teaser and routes to detail/signup itself.
      if (isSignedIn) {
        navigationRef.navigate("App", {
          screen: "WalletTab",
          params: {
            screen: "ClaimLanding",
            params: { token: link.token }
          }
        });
      } else {
        navigationRef.navigate("Auth", {
          screen: "ClaimLanding",
          params: { token: link.token }
        });
      }
      break;
    case "reset":
      if (isSignedIn) {
        // A reset link only makes sense signed out; point the user at the
        // in-app path instead of dumping them into the auth stack.
        Alert.alert(
          "Ya iniciaste sesión",
          "Para cambiar tu contraseña, cierra sesión y usa “¿Olvidaste tu contraseña?”, o hazlo desde Perfil → Ajustes."
        );
      } else {
        navigationRef.navigate("Auth", {
          screen: "ResetPassword",
          params: { token: link.token }
        });
      }
      break;
  }
}

/**
 * Runs the navigation once the container is ready. Cold-start links can
 * arrive before the ref is attached, so retry briefly instead of dropping.
 */
function handleWhenReady(
  navigationRef: NavigationContainerRefWithCurrent<any>,
  link: AppLink,
  isSignedIn: boolean,
  attempt = 0
): void {
  if (navigationRef.isReady()) {
    navigateFromAppLink(navigationRef, link, isSignedIn);
    return;
  }
  if (attempt >= 20) return;
  setTimeout(() => handleWhenReady(navigationRef, link, isSignedIn, attempt + 1), 100);
}

/**
 * Listens for links that arrive while the app is running (foreground or
 * background). Returns the subscription so the caller can clean it up.
 */
export function setupAppLinkListener(
  navigationRef: NavigationContainerRefWithCurrent<any>,
  isSignedIn: boolean
): EmitterSubscription {
  return Linking.addEventListener("url", ({ url }) => {
    const link = parseAppLink(url);
    if (link) handleWhenReady(navigationRef, link, isSignedIn);
  });
}

// getInitialURL keeps returning the launch URL for the app's lifetime; only
// act on it once (the RootNavigator effect re-runs on every auth change).
let initialUrlHandled = false;

/**
 * Handles the app being launched from a killed state via a link.
 * Call once navigation is mounted.
 */
export async function handleInitialAppLink(
  navigationRef: NavigationContainerRefWithCurrent<any>,
  isSignedIn: boolean
): Promise<void> {
  if (initialUrlHandled) return;

  const url = await Linking.getInitialURL();
  const link = parseAppLink(url);
  if (!link) return;

  initialUrlHandled = true;
  handleWhenReady(navigationRef, link, isSignedIn);
}
