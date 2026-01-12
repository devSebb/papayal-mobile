import React, { useEffect, useRef, type ComponentProps } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import Screen from "../ui/components/Screen";
import Button from "../ui/components/Button";
import { theme } from "../ui/theme";
import type { AuthStackParamList } from "../navigation";

type AuthNav = NativeStackNavigationProp<AuthStackParamList, "Welcome">;

type FeatherIconName = ComponentProps<typeof Feather>["name"];

const heroImage = require("../../assets/home-hero.png");

const trustBadges = [
  { icon: "shield" as FeatherIconName, label: "Seguro" },
  { icon: "check-circle" as FeatherIconName, label: "Confiable" },
  { icon: "zap" as FeatherIconName, label: "Rápido" }
];

const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<AuthNav>();
  const floatAnim = useRef(new Animated.Value(6)).current;
  const pulseAnim = useRef(new Animated.Value(0.96)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 550,
      delay: 120,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic)
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(floatAnim, {
          toValue: 6,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.96,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    ).start();
  }, [fadeAnim, floatAnim, pulseAnim]);

  const translateContent = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0]
  });

  return (
    <Screen scrollable style={styles.container} edges={["top", "bottom", "left", "right"]}>
      <Animated.View style={[styles.heroBlock, { opacity: fadeAnim, transform: [{ translateY: translateContent }] }]}>
        <View style={styles.logoWrap}>
          <Text style={styles.logo}>Papayal</Text>
          <View style={styles.logoAccent} />
        </View>
        <Text style={styles.title}>Envía Tarjetas de Regalo al Ecuador</Text>
        <Text style={styles.subtitle}>Desde donde sea, en segundos y con respaldo.</Text>

        <Animated.View style={[styles.heroImageWrap, { transform: [{ translateY: floatAnim }, { scale: pulseAnim }] }]}>
          <Image source={heroImage} style={styles.heroImage} />
        </Animated.View>
      </Animated.View>

      <Animated.View style={[styles.callout, { opacity: fadeAnim, transform: [{ translateY: translateContent }] }]}>
        <Text style={styles.helper}>Regala USD sin fricción y llega directo a Ecuador.</Text>
        <View style={styles.buttons}>
          <Button
            label="Registrarme"
            onPress={() => navigation.navigate("Signup")}
            style={styles.primaryButton}
            variant="primary"
          />
          <Button
            label="Iniciar sesión"
            onPress={() => navigation.navigate("Login")}
            variant="ghost"
            style={styles.secondaryButton}
          />
        </View>

        <View style={styles.trustRow}>
          {trustBadges.map((badge) => (
            <View key={badge.label} style={styles.pill}>
              <Feather name={badge.icon} size={16} color={theme.colors.secondary} />
              <Text style={styles.pillLabel}>{badge.label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: theme.spacing(4),
    backgroundColor: theme.colors.background,
    justifyContent: "space-between",
    paddingVertical: theme.spacing(3)
  },
  heroBlock: {
    width: "100%",
    gap: theme.spacing(1.5)
  },
  logoWrap: {
    alignItems: "flex-start",
    gap: theme.spacing(0.5)
  },
  logo: {
    fontSize: 62,
    fontWeight: "800",
    color: theme.colors.secondary,
    letterSpacing: 0.6
  },
  logoAccent: {
    width: 95,
    height: 5,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md / 2
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: theme.colors.text,
    lineHeight: 34
  },
  subtitle: {
    fontSize: theme.typography.subheading,
    color: theme.colors.muted,
    lineHeight: 26
  },
  heroImageWrap: {
    alignSelf: "center",
    backgroundColor: "transparent",
    padding: theme.spacing(1.5),
    borderRadius: theme.radius.lg * 1.4,
    shadowColor: theme.colors.secondary,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0
  },
  heroImage: {
    width: 240,
    height: 240,
    resizeMode: "contain"
  },
  callout: {
    width: "100%",
    gap: theme.spacing(3),
    backgroundColor: "transparent",
    padding: theme.spacing(2),
    borderRadius: theme.radius.lg,
    shadowColor: theme.colors.secondary,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0
  },
  helper: {
    color: theme.colors.text,
    fontSize: theme.typography.subheading,
    fontWeight: "600",
    lineHeight: 24
  },
  buttons: {
    gap: theme.spacing(1.25)
  },
  primaryButton: {
    width: "100%"
  },
  secondaryButton: {
    width: "100%",
    backgroundColor: "#fff",
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth
  },
  trustRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing(1.25)
  },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing(0.5),
    paddingVertical: theme.spacing(0.75),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border
  },
  pillLabel: {
    color: theme.colors.secondary,
    fontWeight: "600",
    letterSpacing: 0.2
  }
});

export default WelcomeScreen;


