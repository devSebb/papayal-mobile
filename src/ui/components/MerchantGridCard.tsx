import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";

type Props = {
  name: string;
  logoUrl?: string | null;
  countLabel?: string;
  amountLabel?: string;
  onPress?: () => void;
};

const MerchantGridCard: React.FC<Props> = ({ name, logoUrl, countLabel, amountLabel, onPress }) => {
  const initial = name?.trim()?.charAt(0)?.toUpperCase?.() || "C";
  const hasLogo = Boolean(logoUrl);
  const source = hasLogo ? { uri: logoUrl as string } : undefined;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Comercio ${name}`}
      hitSlop={6}
    >
      <View style={styles.accent} />
      <View style={styles.logoRow}>
        <View style={[styles.logoWrap, !hasLogo ? styles.logoPlaceholder : null]}>
          {hasLogo && source ? (
            <Image source={source} style={styles.logoImage} />
          ) : (
            <Text style={styles.logoInitial}>{initial}</Text>
          )}
        </View>
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {name}
      </Text>
      {(countLabel || amountLabel) && (
        <View style={styles.badges}>
          {countLabel && (
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>{countLabel}</Text>
            </View>
          )}
          {amountLabel && (
            <View style={[styles.badge, styles.badgeSecondary]}>
              <Text style={[styles.badgeLabel, styles.badgeLabelSecondary]}>{amountLabel}</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(1.5),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.secondary,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    gap: theme.spacing(1)
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.95
  },
  accent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start"
  },
  logoWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: "hidden",
    backgroundColor: "#F8F5EF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border
  },
  logoPlaceholder: {
    backgroundColor: "#F2F4F5"
  },
  logoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  logoInitial: {
    color: theme.colors.secondary,
    fontWeight: "800",
    fontSize: 18
  },
  name: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: theme.typography.body,
    marginTop: theme.spacing(0.25)
  },
  badges: {
    flexDirection: "row",
    gap: theme.spacing(0.5),
    flexWrap: "wrap"
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#F7F8F9",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border
  },
  badgeSecondary: {
    backgroundColor: "#FFF8EC",
    borderColor: "#F5D49A"
  },
  badgeLabel: {
    color: theme.colors.secondary,
    fontWeight: "700",
    fontSize: theme.typography.small
  },
  badgeLabelSecondary: {
    color: theme.colors.secondary
  }
});

export default MerchantGridCard;

