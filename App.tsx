import "react-native-gesture-handler";
import "react-native-reanimated";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";

import RootNavigator from "./src/navigation";
import { queryClient } from "./src/query/queryClient";
import { AuthProvider } from "./src/auth/authStore";
import { theme } from "./src/ui/theme";
import { PurchaseDraftProvider } from "./src/domain/purchase/purchaseDraftStore";
import BootGate from "./src/boot/BootGate";

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <PurchaseDraftProvider>
              <StatusBar style="dark" backgroundColor={theme.colors.background} />
              <BootGate>
                <RootNavigator />
              </BootGate>
            </PurchaseDraftProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
