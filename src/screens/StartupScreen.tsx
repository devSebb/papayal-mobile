import React from "react";
import { ActivityIndicator, Image, StyleSheet, useWindowDimensions, View } from "react-native";

import { theme } from "../ui/theme";

const logo = require("../../assets/Papayal-logoV2.png");

/**
 * Branded loading screen shown during app boot.
 * Displays the Papayal logo centered on the theme background.
 * This is the ONLY loading UI the user sees during startup.
 */
const StartupScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const logoWidth = Math.min(220, width * 0.6);

  return (
    <View style={styles.container}>
      <Image
        source={logo}
        style={[styles.logo, { width: logoWidth }]}
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
    height: 200
  },
  spinner: {
    marginTop: 24
  }
});

export default StartupScreen;
