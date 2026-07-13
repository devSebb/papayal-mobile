import React from "react";
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";

import { theme } from "../theme";

type Props = {
  uri?: string | null;
  /** Used for the initials fallback — pass the display name, not raw fields. */
  name?: string | null;
  size?: number;
  onError?: () => void;
  style?: StyleProp<ViewStyle>;
};

const initialsFrom = (name?: string | null): string =>
  (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

/**
 * Photo avatar with an initials-on-teal fallback (never a gray silhouette).
 * Initials stay on teal: cream/white on papaya fails contrast (~1.9:1).
 * Purely decorative — the pressable parent owns the accessibility label.
 */
const Avatar: React.FC<Props> = ({ uri, name, size = 96, onError, style }) => {
  const dimensions = { width: size, height: size, borderRadius: size / 2 };
  const initials = initialsFrom(name);

  if (uri) {
    return (
      <View style={[styles.container, dimensions, style]}>
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode="cover"
          onError={onError}
          accessibilityIgnoresInvertColors
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.fallback, dimensions, style]}>
      {initials ? (
        <Text style={[styles.initials, { fontSize: size * 0.32 }]}>{initials}</Text>
      ) : (
        <Feather name="user" size={size * 0.42} color={theme.colors.background} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border
  },
  image: {
    width: "100%",
    height: "100%"
  },
  fallback: {
    backgroundColor: theme.colors.secondary,
    borderColor: "rgba(13, 47, 50, 0.2)"
  },
  initials: {
    color: theme.colors.background,
    fontFamily: theme.fonts.bold,
    letterSpacing: 1
  }
});

export default Avatar;
