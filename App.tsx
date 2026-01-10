import "react-native-gesture-handler";
import "react-native-reanimated";
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import { useFonts } from "expo-font";

import RootNavigator from "./src/navigation";
import { queryClient } from "./src/query/queryClient";
import { AuthProvider } from "./src/auth/authStore";
import { theme } from "./src/ui/theme";
import { PurchaseDraftProvider } from "./src/domain/purchase/purchaseDraftStore";

const App = () => {
  const [fontsLoaded] = useFonts({
    [theme.fonts.regular]: require("./assets/fonts/Satoshi-Variable.ttf"),
    [theme.fonts.italic]: require("./assets/fonts/Satoshi-VariableItalic.ttf")
  });

  useEffect(() => {
    if (!fontsLoaded) return;
    const applyFont = (current?: any) => [current, { fontFamily: theme.fonts.regular, color: theme.colors.text }];
    Text.defaultProps = Text.defaultProps || {};
    Text.defaultProps.style = applyFont(Text.defaultProps.style);
    TextInput.defaultProps = TextInput.defaultProps || {};
    TextInput.defaultProps.style = applyFont(TextInput.defaultProps.style);
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <SafeAreaProvider>
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.background
            }}
          >
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <PurchaseDraftProvider>
              <StatusBar style="dark" backgroundColor={theme.colors.background} />
              <RootNavigator />
            </PurchaseDraftProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;

