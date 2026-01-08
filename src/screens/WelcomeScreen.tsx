import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import Screen from "../ui/components/Screen";
import Button from "../ui/components/Button";
import { theme } from "../ui/theme";
import type { AuthStackParamList } from "../navigation";

type AuthNav = NativeStackNavigationProp<AuthStackParamList, "Welcome">;

const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<AuthNav>();

  return (
    <Screen centerContent style={styles.container} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.brandBlock}>
        <Text style={styles.logo}>Papayal</Text>
        <Text style={styles.tagline}>Wallets, gift cards, and rewards in one place.</Text>
      </View>
      <View style={styles.actions}>
        <Button label="Sign in" onPress={() => navigation.navigate("Login")} style={styles.button} />
        <Button label="Sign up" onPress={() => navigation.navigate("Signup")} style={styles.button} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "space-between",
    gap: theme.spacing(4),
    paddingVertical: theme.spacing(6)
  },
  brandBlock: {
    width: "100%",
    alignItems: "flex-start",
    gap: theme.spacing(1)
  },
  logo: {
    fontSize: 40,
    fontWeight: "800",
    color: theme.colors.secondary,
    fontFamily: theme.fonts.regular,
    letterSpacing: 0.5
  },
  tagline: {
    fontSize: theme.typography.subheading,
    color: theme.colors.muted,
    fontFamily: theme.fonts.regular,
    lineHeight: 24,
    maxWidth: 320
  },
  actions: {
    width: "100%",
    gap: theme.spacing(1)
  },
  button: {
    width: "100%"
  }
});

export default WelcomeScreen;


