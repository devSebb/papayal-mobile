import React from "react";
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring
} from "react-native-reanimated";

import { theme } from "../theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  merchantId?: string;
  name: string;
  categoryLabel?: string;
  logoUrl?: string | null;
  countLabel?: string;
  amountLabel?: string;
  onPress?: () => void;
};

const SPRING_CONFIG = { damping: 15, stiffness: 300 };
export const MERCHANT_SHELF_PAGE_PADDING = 20;
export const MERCHANT_SHELF_CARD_GAP = 14;

export const getMerchantShelfCardMetrics = (width: number) => {
  const cardsVisible = width >= 900 ? 4.5 : 2.5;
  const cardWidth = Math.round(
    (width - MERCHANT_SHELF_PAGE_PADDING - MERCHANT_SHELF_CARD_GAP * cardsVisible) /
      cardsVisible
  );

  return {
    cardWidth,
    cardHeight: Math.round(cardWidth / 1.5),
    cardGap: MERCHANT_SHELF_CARD_GAP,
    pagePadding: MERCHANT_SHELF_PAGE_PADDING
  };
};

const MerchantGridCard: React.FC<Props> = React.memo(({ name, categoryLabel = "Comercio", logoUrl, onPress }) => {
  const { width } = useWindowDimensions();
  const { cardWidth, cardHeight } = getMerchantShelfCardMetrics(width);
  const initial = name?.trim()?.charAt(0)?.toUpperCase?.() || "C";
  const hasLogo = Boolean(logoUrl);
  const source = hasLogo ? { uri: logoUrl as string } : undefined;

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <AnimatedPressable
      style={[styles.tile, animatedStyle]}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.97, SPRING_CONFIG);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING_CONFIG);
      }}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${categoryLabel}`}
      hitSlop={6}
    >
      <View style={[styles.card, { width: cardWidth, height: cardHeight }]}>
        <View style={styles.logoArea}>
          {hasLogo && source ? (
            <Image source={source} style={styles.logoImage} resizeMode="contain" />
          ) : (
            <View style={styles.logoFallback}>
              <Text style={styles.logoInitial}>{initial}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={[styles.labelBlock, { width: cardWidth }]}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.category} numberOfLines={1}>
          {categoryLabel}
        </Text>
      </View>
    </AnimatedPressable>
  );
});

MerchantGridCard.displayName = "MerchantGridCard";

const styles = StyleSheet.create({
  tile: {
    alignSelf: "flex-start"
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(2),
    ...theme.shadow.sm
  },
  logoArea: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center"
  },
  logoImage: {
    width: "100%",
    height: "100%"
  },
  logoFallback: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: theme.colors.secondary,
    alignItems: "center",
    justifyContent: "center"
  },
  logoInitial: {
    color: "#FFFFFF",
    fontFamily: theme.fonts.black,
    fontSize: 26
  },
  labelBlock: {
    marginTop: 10,
    paddingLeft: 2
  },
  name: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.extraBold,
    fontSize: theme.typography.small,
    lineHeight: 18
  },
  category: {
    color: theme.colors.captionMuted,
    fontFamily: theme.fonts.semiBold,
    fontSize: 11,
    lineHeight: 14,
    marginTop: 1
  }
});

export default MerchantGridCard;
