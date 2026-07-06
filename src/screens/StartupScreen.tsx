import React from "react";
import { ActivityIndicator, Image, StyleSheet, useWindowDimensions, View } from "react-native";

import { theme } from "../ui/theme";

const logo = require("../../assets/Papayal-logoTag.png");

/**
 * Branded loading screen shown during app boot.
 * Displays the Papayal logo centered on the theme background.
 * This is the ONLY loading UI the user sees during startup.
 */
const StartupScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const logoSize = Math.min(220, width * 0.65);

  return (
    <View style={styles.container}>
      <Image
        source={logo}
        style={[styles.logo, { width: logoSize }]}
        resizeMode="contain"
      />
      <ActivityIndicator
        size="small"
        color={theme.colors.primary}
        style={styles.spinner}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center"
  },
  logo: {
    aspectRatio: 1
  },
  spinner: {
    marginTop: 24
  }
});

export default StartupScreen;
