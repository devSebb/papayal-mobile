import React, { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
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

const logoTagImage = require("../../assets/Papayal-logoTag.png");

const trustBadges: { icon: FeatherIconName; label: string }[] = [
  { icon: "star", label: "4.8 App Store" },
  { icon: "lock", label: "Cifrado bancario" },
  { icon: "zap", label: "Entrega inmediata" },
  { icon: "heart", label: "10,000+ familias" }
];

const socialProofMessages = [
  "Maria en New Jersey envio una tarjeta hace 3 min",
  "Carlos en Madrid envio una tarjeta de SuperMaxi",
  "Ana en Barcelona eligio una tarjeta de Fybeca"
];

const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<AuthNav>();
  const heroIn = useRef(new Animated.Value(0)).current;
  const headlineIn = useRef(new Animated.Value(0)).current;
  const subheadIn = useRef(new Animated.Value(0)).current;
  const ctaIn = useRef(new Animated.Value(0)).current;
  const tickerIn = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const ctaPulse = useRef(new Animated.Value(0)).current;
  const liveDotPulse = useRef(new Animated.Value(0.8)).current;
  const tickerOpacity = useRef(new Animated.Value(1)).current;
  const trustIn = useRef(trustBadges.map(() => new Animated.Value(0))).current;
  const [socialIndex, setSocialIndex] = useState(0);

  useEffect(() => {
    Animated.timing(heroIn, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -7,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    ).start();

    Animated.sequence([
      Animated.delay(1100),
      Animated.timing(headlineIn, {
        toValue: 1,
        duration: 650,
        easing: Easing.bezier(0.2, 0.9, 0.25, 1),
        useNativeDriver: true
      }),
      Animated.delay(80),
      Animated.timing(subheadIn, {
        toValue: 1,
        duration: 560,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.delay(90),
      Animated.timing(ctaIn, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.delay(220),
      Animated.timing(tickerIn, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();

    Animated.stagger(
      100,
      trustIn.map((value) =>
        Animated.sequence([
          Animated.delay(1900),
          Animated.timing(value, {
            toValue: 1,
            duration: 450,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          })
        ])
      )
    ).start();

    const pulseDelay = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(ctaPulse, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false
          }),
          Animated.timing(ctaPulse, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false
          })
        ])
      ).start();
    }, 2800);

    Animated.loop(
      Animated.sequence([
        Animated.timing(liveDotPulse, {
          toValue: 1.05,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(liveDotPulse, {
          toValue: 0.8,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    ).start();

    const tickerTimer = setInterval(() => {
      Animated.timing(tickerOpacity, {
        toValue: 0,
        duration: 210,
        useNativeDriver: true
      }).start(() => {
        setSocialIndex((prev) => (prev + 1) % socialProofMessages.length);
        Animated.timing(tickerOpacity, {
          toValue: 1,
          duration: 230,
          useNativeDriver: true
        }).start();
      });
    }, 4000);

    return () => {
      clearTimeout(pulseDelay);
      clearInterval(tickerTimer);
    };
  }, [
    ctaIn,
    ctaPulse,
    floatAnim,
    headlineIn,
    heroIn,
    liveDotPulse,
    subheadIn,
    tickerIn,
    tickerOpacity,
    trustIn
  ]);

  const grainDots = useMemo(() => Array.from({ length: 24 }, (_, index) => index), []);

  const primaryGlow = ctaPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.34]
  });

  const heroTranslate = heroIn.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0]
  });

  const headlineTranslate = headlineIn.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0]
  });

  const subheadTranslate = subheadIn.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0]
  });

  const ctaTranslate = ctaIn.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0]
  });

  return (
    <Screen style={styles.container} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.backgroundLayer}>
        <View style={[styles.blob, styles.blobTop]} />
        <View style={[styles.blob, styles.blobBottom]} />
        <View style={styles.gradientOverlay} />
        <View style={styles.grainOverlay}>
          {grainDots.map((dot) => (
            <View
              key={dot}
              style={[
                styles.grainDot,
                {
                  left: `${(dot * 37) % 100}%`,
                  top: `${(dot * 19) % 100}%`,
                  opacity: dot % 3 === 0 ? 0.08 : 0.04
                }
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.topBar}>
          <View style={styles.languageChip}>
            <Text style={styles.languageText}>ES</Text>
          </View>
        </View>

        <Animated.View style={[styles.heroZone, { opacity: heroIn, transform: [{ translateY: heroTranslate }] }]}>
          <Animated.View style={[styles.logoWrap, { transform: [{ translateY: floatAnim }] }]}>
            <Image source={logoTagImage} style={styles.logoImage} />
          </Animated.View>
          <Text style={styles.heroWordmark}>Papayal</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.copyZone,
            styles.copyZoneTight,
            { opacity: headlineIn, transform: [{ translateY: headlineTranslate }] }
          ]}
        >
          <Text style={styles.headline}>Envía Tarjetas de Regalo Digitales</Text>
        </Animated.View>

        <Animated.Text style={[styles.subheadline, { opacity: subheadIn, transform: [{ translateY: subheadTranslate }] }]}>
          Desde donde sea,{"\n"}en segundos y con respaldo
        </Animated.Text>

        <Animated.View style={[styles.ctaSection, { opacity: ctaIn, transform: [{ translateY: ctaTranslate }] }]}>
          <Animated.View style={[styles.primaryButtonWrap, { shadowOpacity: primaryGlow }]}>
            <Button
              label="Empezar gratis"
              onPress={() => navigation.navigate("Signup")}
              style={styles.primaryButton}
              variant="primary"
              accessibilityLabel="Empezar gratis, ir a registro"
            />
          </Animated.View>
          <Button
            label="Ya tengo cuenta"
            onPress={() => navigation.navigate("Login")}
            variant="ghost"
            style={styles.secondaryButton}
            accessibilityLabel="Ya tengo cuenta, ir a iniciar sesion"
          />
        </Animated.View>

        <View style={styles.trustRow}>
          {trustBadges.map((badge, index) => {
            const badgeTranslate = trustIn[index].interpolate({
              inputRange: [0, 1],
              outputRange: [8, 0]
            });

            return (
              <Animated.View
                key={badge.label}
                style={[
                  styles.trustChip,
                  {
                    opacity: trustIn[index],
                    transform: [{ translateY: badgeTranslate }]
                  }
                ]}
              >
                <Feather name={badge.icon} size={12} color={theme.colors.secondary} />
                <Text style={styles.trustLabel}>{badge.label}</Text>
              </Animated.View>
            );
          })}
        </View>

        <Animated.View style={[styles.tickerWrap, { opacity: tickerIn }]}>
          <Animated.View style={[styles.liveDot, { transform: [{ scale: liveDotPulse }] }]} />
          <Animated.Text style={[styles.tickerText, { opacity: tickerOpacity }]}>
            {socialProofMessages[socialIndex]}
          </Animated.Text>
        </Animated.View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EDE8DF",
    paddingHorizontal: theme.spacing(2),
    paddingTop: theme.spacing(1.4),
    paddingBottom: theme.spacing(1.6),
    overflow: "hidden"
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject
  },
  blob: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    opacity: 0.08
  },
  blobTop: {
    top: -75,
    right: -60
  },
  blobBottom: {
    bottom: 42,
    left: -80
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F1DED0",
    opacity: 0.22
  },
  grainOverlay: {
    ...StyleSheet.absoluteFillObject
  },
  grainDot: {
    position: "absolute",
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#ffffff"
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    gap: theme.spacing(1.25)
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center"
  },
  heroWordmark: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.brandBlack,
    fontSize: 64,
    lineHeight: 68,
    letterSpacing: 0.4
  },
  languageChip: {
    borderWidth: 1,
    borderColor: "#D9D1C5",
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
    backgroundColor: "rgba(255,255,255,0.55)"
  },
  languageText: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.bold,
    fontSize: 12
  },
  heroZone: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 252,
    gap: theme.spacing(1.2)
  },
  logoWrap: {
    width: 168,
    height: 168,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center"
  },
  logoImage: {
    width: 166,
    height: 166,
    resizeMode: "contain"
  },
  copyZone: {
    alignItems: "center"
  },
  copyZoneTight: {
    marginTop: -theme.spacing(1.75)
  },
  headline: {
    color: theme.colors.secondary,
    textAlign: "center",
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.35,
    fontFamily: theme.fonts.extraBold,
    maxWidth: 360
  },
  subheadline: {
    textAlign: "center",
    color: "rgba(13,47,50,0.66)",
    fontSize: 16,
    lineHeight: 24,
    fontFamily: theme.fonts.regular,
    paddingHorizontal: theme.spacing(2)
  },
  ctaSection: {
    gap: theme.spacing(1),
    marginTop: theme.spacing(0.4)
  },
  primaryButtonWrap: {
    borderRadius: 14,
    shadowColor: theme.colors.primary,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5
  },
  primaryButton: {
    width: "100%",
    minHeight: 52,
    borderRadius: 14
  },
  secondaryButton: {
    width: "100%",
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderWidth: 0
  },
  trustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: theme.spacing(0.75),
    marginTop: 2
  },
  trustChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(0.45),
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(13,47,50,0.2)",
    backgroundColor: "rgba(255,255,255,0.55)",
    paddingVertical: 6,
    paddingHorizontal: 10
  },
  trustLabel: {
    color: "rgba(13,47,50,0.58)",
    fontSize: 11,
    fontFamily: theme.fonts.bold
  },
  tickerWrap: {
    minHeight: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing(0.55),
    marginBottom: 2
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.success
  },
  tickerText: {
    color: "rgba(13,47,50,0.52)",
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    lineHeight: 16
  }
});

export default WelcomeScreen;


