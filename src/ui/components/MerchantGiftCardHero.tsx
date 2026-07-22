import React, { useEffect, useMemo, useState } from "react";
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Feather } from "@expo/vector-icons";

import { theme } from "../theme";
import { centsToDollars, formatMoney } from "../../utils/money";

const papayalBrandRing = require("../../../assets/Papayal-logoTag.png");

/**
 * Height bands that equalize optical weight across logo shapes: the more
 * square a logo, the taller it must render to carry the same visual weight
 * as a wide wordmark (calibrated against Tuenti's ~36pt of visible ink).
 */
const bandedLogoHeight = (aspect: number) => {
  if (aspect >= 3) return 36;
  if (aspect >= 1.7) return 46;
  return 54;
};

type PromoProps = {
  /** Marketing mockup shown on merchant profiles (decorative number/date). */
  variant?: "promo";
};

type OwnedProps = {
  /** A card the user actually holds: real balance + sender attribution. */
  variant: "owned";
  remainingCents: number;
  originalCents?: number | null;
  currency: string;
  /** Short sender attribution, e.g. "María P." */
  senderLabel?: string | null;
  /** Security hold: amber accent + "EN VERIFICACIÓN" instead of validity. */
  held?: boolean;
};

type Props = (PromoProps | OwnedProps) & {
  merchantName: string;
  logoUrl?: string | null;
  style?: StyleProp<ViewStyle>;
};

const MerchantGiftCardHero: React.FC<Props> = (props) => {
  const { merchantName, logoUrl, style } = props;
  const hasLogo = Boolean(logoUrl);
  const initial = merchantName.trim().charAt(0).toUpperCase() || "C";
  const [logoAspect, setLogoAspect] = useState<number | null>(null);
  const [logoAreaWidth, setLogoAreaWidth] = useState(0);

  useEffect(() => {
    if (!logoUrl) return;
    let cancelled = false;
    Image.getSize(logoUrl, (width, height) => {
      if (!cancelled && width > 0 && height > 0) setLogoAspect(width / height);
    });
    return () => {
      cancelled = true;
    };
  }, [logoUrl]);

  const bandedLogoStyle = useMemo(() => {
    if (!logoAspect || !logoAreaWidth) return null;
    const width = Math.min(bandedLogoHeight(logoAspect) * logoAspect, logoAreaWidth);
    return { width, height: width / logoAspect, resizeMode: "contain" as const };
  }, [logoAspect, logoAreaWidth]);

  const held = props.variant === "owned" && props.held;

  return (
    <View style={[styles.giftCard, held ? styles.giftCardHeld : null, style]}>
      <View style={styles.giftCardTopRow}>
        <View
          style={[styles.merchantLogoArea, bandedLogoStyle ? styles.merchantLogoAreaAuto : null]}
          onLayout={(event) => setLogoAreaWidth(event.nativeEvent.layout.width)}
        >
          {hasLogo ? (
            <Image source={{ uri: logoUrl as string }} style={bandedLogoStyle ?? styles.logo} />
          ) : (
            <View style={styles.logoFallback}>
              <Text style={styles.logoInitial}>{initial}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardBrandColumn}>
          <Image source={papayalBrandRing} style={styles.brandRing} />
        </View>
      </View>
      <View style={styles.contactlessSlot}>
        <ContactlessGlyph />
      </View>

      {props.variant === "owned" ? (
        <View style={styles.giftCardBottomBlock}>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceValue}>
              {formatMoney(centsToDollars(props.remainingCents), props.currency)}
            </Text>
            {typeof props.originalCents === "number" &&
            props.originalCents !== props.remainingCents ? (
              <Text style={styles.balanceOriginal}>
                de {formatMoney(centsToDollars(props.originalCents), props.currency)}
              </Text>
            ) : null}
          </View>
          <View style={styles.giftCardMetaRow}>
            <Text style={styles.giftCardCaption} numberOfLines={1}>
              {props.senderLabel ? `DE: ${props.senderLabel.toUpperCase()}` : "TARJETA DE REGALO"}
            </Text>
            {props.held ? (
              <View style={styles.heldPill}>
                <Feather name="lock" size={10} color="#B45309" />
                <Text style={styles.heldPillLabel}>EN VERIFICACIÓN</Text>
              </View>
            ) : (
              <View style={styles.validBlock}>
                <Text style={styles.validLabel}>SIN VENCIMIENTO</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.giftCardBottomBlock}>
          <Text style={styles.cardNumber}>1234 5678 9009 8765</Text>
          <View style={styles.giftCardMetaRow}>
            <Text style={styles.giftCardCaption}>TARJETA DE REGALO</Text>
            <View style={styles.validBlock}>
              <Text style={styles.validLabel}>VÁLIDA HASTA</Text>
              <Text style={styles.validDate}>08/28</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const ContactlessGlyph: React.FC = () => (
  <Svg width={28} height={22} viewBox="0 0 28 22" style={styles.contactlessGlyph}>
    <Path
      d="M9 6.5c2.2 2.2 2.2 6.8 0 9"
      stroke={theme.colors.mutedTeal42}
      strokeWidth={2}
      strokeLinecap="round"
      fill="none"
    />
    <Path
      d="M14 3.5c3.9 3.9 3.9 11.1 0 15"
      stroke={theme.colors.mutedTeal42}
      strokeWidth={2}
      strokeLinecap="round"
      fill="none"
    />
    <Path
      d="M19 1c5.2 5.2 5.2 14.8 0 20"
      stroke={theme.colors.mutedTeal42}
      strokeWidth={2}
      strokeLinecap="round"
      fill="none"
    />
  </Svg>
);

const styles = StyleSheet.create({
  giftCard: {
    width: "90%",
    alignSelf: "center",
    aspectRatio: 1.86,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.subtleTealBorder,
    padding: theme.spacing(2),
    justifyContent: "space-between",
    position: "relative",
    ...theme.shadow.md
  },
  giftCardHeld: {
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.55)"
  },
  giftCardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between"
  },
  merchantLogoArea: {
    width: "58%",
    height: 40,
    alignItems: "flex-start",
    justifyContent: "center"
  },
  merchantLogoAreaAuto: {
    height: "auto",
    minHeight: 40
  },
  cardBrandColumn: {
    alignItems: "center",
    justifyContent: "flex-start"
  },
  logo: {
    width: "100%",
    height: "100%",
    resizeMode: "contain"
  },
  logoFallback: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.secondary,
    alignItems: "center",
    justifyContent: "center"
  },
  logoInitial: {
    color: theme.colors.card,
    fontFamily: theme.fonts.black,
    fontSize: 20
  },
  brandRing: {
    width: 30,
    height: 30,
    resizeMode: "contain"
  },
  contactlessGlyph: {
    alignSelf: "flex-end"
  },
  contactlessSlot: {
    position: "absolute",
    right: theme.spacing(2.25),
    top: "50%",
    transform: [{ translateY: -11 }]
  },
  giftCardBottomBlock: {
    gap: theme.spacing(1.1)
  },
  cardNumber: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    letterSpacing: 2
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: theme.spacing(0.75)
  },
  balanceValue: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.extraBold,
    fontSize: 24,
    letterSpacing: 0.5
  },
  balanceOriginal: {
    color: theme.colors.mutedTeal55,
    fontFamily: theme.fonts.semiBold,
    fontSize: 13
  },
  giftCardMetaRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: theme.spacing(1)
  },
  giftCardCaption: {
    flexShrink: 1,
    color: theme.colors.mutedTeal55,
    fontFamily: theme.fonts.bold,
    fontSize: 11,
    letterSpacing: 1.2
  },
  validBlock: {
    alignItems: "flex-end"
  },
  validLabel: {
    color: theme.colors.mutedTeal55,
    fontFamily: theme.fonts.bold,
    fontSize: 8,
    letterSpacing: 0.7
  },
  validDate: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.bold,
    fontSize: 12,
    marginTop: 1
  },
  heldPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(0.4),
    backgroundColor: "#FEF3C7",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#F59E0B",
    paddingHorizontal: theme.spacing(0.9),
    paddingVertical: theme.spacing(0.35)
  },
  heldPillLabel: {
    color: "#78350F",
    fontFamily: theme.fonts.bold,
    fontSize: 8,
    letterSpacing: 0.7
  }
});

export default MerchantGiftCardHero;
