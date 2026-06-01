import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
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
  logoUrl?: string | null;
  countLabel?: string;
  amountLabel?: string;
  onPress?: () => void;
};

const SPRING_CONFIG = { damping: 15, stiffness: 300 };

const MerchantGridCard: React.FC<Props> = ({ name, logoUrl, onPress }) => {
  const initial = name?.trim()?.charAt(0)?.toUpperCase?.() || "C";
  const hasLogo = Boolean(logoUrl);
  const source = hasLogo ? { uri: logoUrl as string } : undefined;

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <AnimatedPressable
      style={[styles.card, animatedStyle]}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.97, SPRING_CONFIG);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING_CONFIG);
      }}
      accessibilityRole="button"
      accessibilityLabel={`Comercio ${name}`}
      hitSlop={6}
    >
      <View style={styles.logoArea}>
        {hasLogo && source ? (
          <Image source={source} style={styles.logoImage} resizeMode="contain" />
        ) : (
          <View style={styles.logoFallback}>
            <Text style={styles.logoInitial}>{initial}</Text>
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {name}
      </Text>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(252, 165, 15, 0.42)",
    minHeight: 146,
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(2),
    gap: theme.spacing(1)
  },
  logoArea: {
    flexGrow: 1,
    minHeight: 72,
    width: "100%",
    alignItems: "center",
    justifyContent: "center"
  },
  logoImage: {
    width: "100%",
    height: 80,
    maxHeight: 96
  },
  logoFallback: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: theme.colors.secondary,
    alignItems: "center",
    justifyContent: "center"
  },
  logoInitial: {
    color: "#FFFFFF",
    fontFamily: theme.fonts.black,
    fontSize: 26
  },
  name: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    fontSize: theme.typography.small,
    lineHeight: 18,
    textAlign: "center"
  }
});

export default MerchantGridCard;
