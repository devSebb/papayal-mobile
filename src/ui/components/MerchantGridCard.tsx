import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring
} from "react-native-reanimated";

import { theme } from "../theme";
import { getMerchantColors } from "../../utils/merchantColors";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  merchantId?: string;
  name: string;
  logoUrl?: string | null;
  countLabel?: string;
  amountLabel?: string;
  onPress?: () => void;
};

const SPRING_CONFIG = { damping: 15, stiffness: 300 };

const MerchantGridCard: React.FC<Props> = ({
  merchantId,
  name,
  logoUrl,
  countLabel,
  amountLabel,
  onPress
}) => {
  const initial = name?.trim()?.charAt(0)?.toUpperCase?.() || "C";
  const hasLogo = Boolean(logoUrl);
  const source = hasLogo ? { uri: logoUrl as string } : undefined;
  const colors = getMerchantColors(merchantId);

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const metadataText = [countLabel, amountLabel].filter(Boolean).join(" · ");

  return (
    <AnimatedPressable
      style={[styles.card, animatedStyle]}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.96, SPRING_CONFIG);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING_CONFIG);
      }}
      accessibilityRole="button"
      accessibilityLabel={`Comercio ${name}`}
      hitSlop={6}
    >
      {/* Accent bar */}
      <View style={[styles.accent, { backgroundColor: colors.accent + "4D" }]} />

      {/* Brand zone */}
      <View style={[styles.brandZone, { backgroundColor: colors.bg }]}>
        <View style={[styles.logoWrap, !hasLogo ? styles.logoPlaceholder : null]}>
          {hasLogo && source ? (
            <Image source={source} style={styles.logoImage} />
          ) : (
            <Text style={styles.logoInitial}>{initial}</Text>
          )}
        </View>
      </View>

      {/* Content zone */}
      <View style={styles.contentZone}>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        {metadataText ? (
          <Text style={styles.metadata} numberOfLines={1}>
            {metadataText}
          </Text>
        ) : null}
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    minHeight: 180,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#1A1A1A",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  accent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    zIndex: 1
  },
  brandZone: {
    height: 96,
    alignItems: "center",
    justifyContent: "center"
  },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  logoPlaceholder: {
    backgroundColor: theme.colors.primary
  },
  logoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  logoInitial: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 24
  },
  contentZone: {
    padding: 14,
    gap: 4
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text
  },
  metadata: {
    fontSize: theme.typography.small,
    fontWeight: "500",
    color: theme.colors.muted
  }
});

export default MerchantGridCard;
