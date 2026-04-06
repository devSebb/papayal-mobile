import React, { useEffect, useRef } from "react";
import { Platform, Text, TextInput } from "react-native";
import { useFonts } from "expo-font";
import {
  Raleway_100Thin,
  Raleway_200ExtraLight,
  Raleway_300Light,
  Raleway_400Regular,
  Raleway_500Medium,
  Raleway_600SemiBold,
  Raleway_700Bold,
  Raleway_800ExtraBold,
  Raleway_900Black,
  Raleway_400Regular_Italic,
  Raleway_500Medium_Italic,
  Raleway_600SemiBold_Italic,
  Raleway_700Bold_Italic
} from "@expo-google-fonts/raleway";
import * as SplashScreen from "expo-splash-screen";

import { useAuth } from "../auth/authStore";
import { theme } from "../ui/theme";
import StartupScreen from "../screens/StartupScreen";
import { registerForPushNotifications } from "../notifications/register";
import { pushTokenApi } from "../api/endpoints";

// Configure foreground notification display (must run at module level)
import "../notifications/handler";

// Prevent native splash from auto-hiding before we're ready
SplashScreen.preventAutoHideAsync().catch(() => {
  // Best-effort; ignore if called too late or in certain environments
});

type Props = {
  children: React.ReactNode;
};

/**
 * BootGate unifies all startup loading:
 * - Loads custom fonts
 * - Waits for auth hydration
 * - Holds native splash until ready
 * - Shows branded StartupScreen as the in-app loading UI
 *
 * Children (RootNavigator) only render once boot is complete.
 */
const BootGate: React.FC<Props> = ({ children }) => {
  const splashHidden = useRef(false);
  const { hydrated, accessToken } = useAuth();

  const [fontsLoaded] = useFonts({
    [theme.fonts.thin]: Raleway_100Thin,
    [theme.fonts.extraLight]: Raleway_200ExtraLight,
    [theme.fonts.light]: Raleway_300Light,
    [theme.fonts.regular]: Raleway_400Regular,
    [theme.fonts.medium]: Raleway_500Medium,
    [theme.fonts.semiBold]: Raleway_600SemiBold,
    [theme.fonts.bold]: Raleway_700Bold,
    [theme.fonts.extraBold]: Raleway_800ExtraBold,
    [theme.fonts.black]: Raleway_900Black,
    [theme.fonts.italic]: Raleway_400Regular_Italic,
    [theme.fonts.italicMedium]: Raleway_500Medium_Italic,
    [theme.fonts.italicSemiBold]: Raleway_600SemiBold_Italic,
    [theme.fonts.italicBold]: Raleway_700Bold_Italic
  });

  const isReady = fontsLoaded && hydrated;

  // Apply default font styles once fonts are loaded
  useEffect(() => {
    if (!fontsLoaded) return;

    const applyFont = (current?: any) => [
      current,
      { fontFamily: theme.fonts.regular, color: theme.colors.text }
    ];

    Text.defaultProps = Text.defaultProps || {};
    Text.defaultProps.style = applyFont(Text.defaultProps.style);

    TextInput.defaultProps = TextInput.defaultProps || {};
    TextInput.defaultProps.style = applyFont(TextInput.defaultProps.style);
  }, [fontsLoaded]);

  // Hide native splash when ready
  useEffect(() => {
    if (isReady && !splashHidden.current) {
      splashHidden.current = true;
      SplashScreen.hideAsync().catch(() => {
        // Ignore errors (e.g., splash already hidden)
      });
    }
  }, [isReady]);

  // Register push token after boot + auth
  useEffect(() => {
    if (!isReady || !accessToken) return;
    registerForPushNotifications((token) =>
      pushTokenApi.register(token, Platform.OS)
    ).catch((err) => {
      if (__DEV__) console.warn("[Push] Registration failed:", err);
    });
  }, [isReady, accessToken]);

  // Show branded StartupScreen while booting
  if (!isReady) {
    return <StartupScreen />;
  }

  return <>{children}</>;
};

export default BootGate;
