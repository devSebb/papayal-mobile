import React from "react";
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";

import Card from "./Card";
import Button from "./Button";
import { theme } from "../theme";

const heroImage = require("../../../assets/home-hero.png");

const FLOW_STEPS: { icon: keyof typeof Feather.glyphMap; label: string }[] = [
  { icon: "shopping-bag", label: "Elige una\ntienda" },
  { icon: "send", label: "Envía la\ntarjeta" },
  { icon: "map-pin", label: "Gasta\nlocalmente" }
];

type Props = {
  ctaLabel: string;
  onPressCta: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * The pitch card that opens the app: headline, hero art, "Cómo funciona" and a
 * single CTA. Shared by the signed-in Home screen and the public "Explorar
 * comercios" screen so both open on exactly the same design — only the CTA
 * differs (buy flow vs. login).
 */
const HomeHeroCard: React.FC<Props> = ({ ctaLabel, onPressCta, style }) => (
  <Card style={[styles.heroCard, style]}>
    <Text style={styles.heroTitle}>Tarjetas de regalo digitales para lo esencial en Ecuador.</Text>
    <View style={styles.heroSubSection}>
      <Text style={styles.heroSubtitle}>Rápido. Seguro.</Text>

      <View style={styles.heroActionRow}>
        <View style={styles.heroImageWrap}>
          <Image source={heroImage} style={styles.heroImage} />
        </View>
      </View>
    </View>

    <View style={styles.flowSection}>
      <Text style={styles.flowTitle}>Cómo funciona</Text>
      <View style={styles.flowSteps}>
        {FLOW_STEPS.map((step, index) => (
          <React.Fragment key={step.icon}>
            {index > 0 ? (
              <Feather name="arrow-right" size={20} color={theme.colors.navbarMuted} />
            ) : null}
            <View style={styles.flowStep}>
              <Feather name={step.icon} size={28} color={theme.colors.secondary} />
              <Text style={styles.flowLabel}>{step.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>

    <Button label={ctaLabel} onPress={onPressCta} variant="primary" style={styles.promoButton} />
  </Card>
);

const styles = StyleSheet.create({
  heroCard: {
    gap: theme.spacing(2),
    marginBottom: theme.spacing(1)
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: theme.fonts.extraBold,
    lineHeight: 36,
    color: theme.colors.text
  },
  heroSubSection: {
    gap: theme.spacing(0.4)
  },
  heroSubtitle: {
    fontSize: 20,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text
  },
  heroActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(0.75),
    paddingVertical: 0
  },
  heroImageWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing(1.5),
    marginBottom: -theme.spacing(5)
  },
  heroImage: {
    width: 220,
    height: 180,
    resizeMode: "contain"
  },
  flowSection: {
    gap: theme.spacing(1)
  },
  flowTitle: {
    fontSize: theme.typography.subheading,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text
  },
  flowSteps: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap"
  },
  flowStep: {
    alignItems: "center",
    gap: theme.spacing(0.5),
    flexGrow: 1,
    minWidth: 90
  },
  flowLabel: {
    color: theme.colors.text,
    textAlign: "center",
    fontSize: theme.typography.small
  },
  promoButton: {
    marginTop: theme.spacing(1)
  }
});

export default HomeHeroCard;
