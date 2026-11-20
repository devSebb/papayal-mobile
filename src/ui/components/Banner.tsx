import React from "react";
import { StyleSheet, StyleProp, Text, View, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";

import { theme } from "../theme";

type BannerTone = "info" | "warning";

type BannerProps = {
  message: string;
  title?: string;
  icon?: keyof typeof Feather.glyphMap;
  /** info = brand cream (guidance), warning = amber (needs attention). */
  tone?: BannerTone;
  /** Tighter padding + smaller text for dense screens (e.g. redemption token). */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

const TONES: Record<
  BannerTone,
  { background: string; border: string; title: string; text: string; icon: string }
> = {
  info: {
    background: "#FFF7E6",
    border: "rgba(252, 165, 15, 0.55)",
    title: theme.colors.secondary,
    text: theme.colors.text,
    icon: theme.colors.primary
  },
  warning: {
    background: "#FEF3C7",
    border: "#F59E0B",
    title: "#78350F",
    text: "#78350F",
    icon: "#B45309"
  }
};

/**
 * Inline notice banner (same visual language as the security-hold notice):
 * full-width rounded card with icon, optional bold title, and a short body.
 * Informational — never blocks interaction.
 */
const Banner: React.FC<BannerProps> = ({
  message,
  title,
  icon = "info",
  tone = "info",
  compact = false,
  style
}) => {
  const palette = TONES[tone];

  return (
    <View
      style={[
        styles.container,
        compact ? styles.containerCompact : null,
        { backgroundColor: palette.background, borderColor: palette.border },
        style
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={title ? `${title}. ${message}` : message}
    >
      <Feather
        name={icon}
        size={compact ? 16 : 18}
        color={palette.icon}
        style={styles.icon}
      />
      <View style={styles.body}>
        {title && !compact ? (
          <Text style={[styles.title, { color: palette.title }]}>{title}</Text>
        ) : null}
        <Text
          style={[
            styles.message,
            compact ? styles.messageCompact : null,
            { color: palette.text }
          ]}
        >
          {message}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing(1),
    padding: theme.spacing(1.5),
    borderRadius: theme.radius.md,
    borderWidth: 1
  },
  containerCompact: {
    padding: theme.spacing(1),
    alignItems: "center"
  },
  icon: {
    marginTop: 1
  },
  body: {
    flex: 1,
    gap: theme.spacing(0.4)
  },
  title: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.typography.small + 1
  },
  message: {
    fontSize: theme.typography.small,
    lineHeight: 19
  },
  messageCompact: {
    lineHeight: 18
  }
});

export default Banner;
