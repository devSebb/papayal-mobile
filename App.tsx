import "react-native-gesture-handler";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { Platform, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { StripeProvider } from "@stripe/stripe-react-native";
import * as Device from "expo-device";

import RootNavigator from "./src/navigation";
import { queryClient } from "./src/query/queryClient";
import { AuthProvider } from "./src/auth/authStore";
import { theme } from "./src/ui/theme";
import { PurchaseDraftProvider } from "./src/domain/purchase/purchaseDraftStore";
import BootGate from "./src/boot/BootGate";

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

/**
 * Shows a developer-facing error when Stripe key is missing.
 * Only renders in dev builds.
 */
const StripeMissingKeyBanner: React.FC = () => {
  if (!__DEV__ || STRIPE_PUBLISHABLE_KEY) return null;

  return (
    <View style={styles.missingKeyBanner}>
      <Text style={styles.missingKeyTitle}>Stripe Not Configured</Text>
      <Text style={styles.missingKeyText}>
        Set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY in your environment.
        {"\n"}Payments will not work until this is configured.
      </Text>
    </View>
  );
};

/**
 * Dev-only warning when API_BASE_URL contains localhost and running on a physical device.
 * Localhost URLs will not work on real devices - requires HTTPS tunnel or deployed URL.
 */
const LocalhostWarningBanner: React.FC = () => {
  if (!__DEV__) return null;

  const isPhysicalDevice = Device.isDevice;
  const isLocalhost = API_BASE_URL.includes("localhost") || API_BASE_URL.includes("127.0.0.1");
  const isMobile = Platform.OS === "ios" || Platform.OS === "android";

  if (!isPhysicalDevice || !isLocalhost || !isMobile) return null;

  return (
    <View style={styles.localhostBanner}>
      <Text style={styles.localhostText}>
        ⚠️ API_BASE_URL apunta a localhost — no funcionará en un dispositivo físico.
      </Text>
    </View>
  );
};

const App = () => {
  // Log API config in dev for debugging
  if (__DEV__) {
    console.log("[App] Stripe publishable key:", STRIPE_PUBLISHABLE_KEY ? `${STRIPE_PUBLISHABLE_KEY.slice(0, 12)}...` : "NOT SET");
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaProvider>
        {/*
          TODO: Add merchantIdentifier="merchant.app.papayal" once Apple Pay is
          fully enabled in the Stripe Dashboard. Do NOT add it prematurely as
          it may cause warnings or unexpected behavior.
        */}
        <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <PurchaseDraftProvider>
                <StatusBar style="dark" backgroundColor={theme.colors.background} />
                <StripeMissingKeyBanner />
                <LocalhostWarningBanner />
                <BootGate>
                  <RootNavigator />
                </BootGate>
              </PurchaseDraftProvider>
            </AuthProvider>
          </QueryClientProvider>
        </StripeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  missingKeyBanner: {
    backgroundColor: "#FFEBEE",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EF5350"
  },
  missingKeyTitle: {
    color: "#C62828",
    fontWeight: "700",
    marginBottom: 4
  },
  missingKeyText: {
    color: "#B71C1C",
    fontSize: 12,
    lineHeight: 16
  },
  localhostBanner: {
    backgroundColor: "#FFF3E0",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#FF9800"
  },
  localhostText: {
    color: "#E65100",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center"
  }
});

export default App;
