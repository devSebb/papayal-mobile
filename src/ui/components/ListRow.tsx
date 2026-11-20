import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { theme } from "../theme";

type FeatherIcon = keyof typeof Feather.glyphMap;

type ListRowVariant = "default" | "accent" | "danger";

type ListRowProps = {
  icon: FeatherIcon;
  title: string;
  subtitle?: string;
  onPress: () => void | Promise<void>;
  /** "accent" tints the icon chip papaya (the one "give" action per screen); "danger" is destructive red. */
  variant?: ListRowVariant;
  /** Navigation rows keep the chevron; action rows (logout) drop it. */
  chevron?: boolean;
  disabled?: boolean;
  loading?: boolean;
};

const RIPPLE_COLOR = "rgba(13, 47, 50, 0.08)";

export const ListRow: React.FC<ListRowProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  variant = "default",
  chevron = true,
  disabled,
  loading
}) => {
  const iconColor =
    variant === "danger"
      ? theme.colors.danger
      : variant === "accent"
      ? theme.colors.primary
      : theme.colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      android_ripple={{ color: RIPPLE_COLOR }}
      style={({ pressed }) => [
        styles.row,
        disabled ? styles.rowDisabled : null,
        pressed && Platform.OS === "ios" ? styles.rowPressed : null
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          variant === "accent" ? styles.iconAccent : null,
          variant === "danger" ? styles.iconDanger : null
        ]}
      >
        <Feather name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, variant === "danger" ? styles.titleDanger : null]}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "danger" ? theme.colors.danger : theme.colors.primary}
        />
      ) : chevron ? (
        <Feather name="chevron-right" size={18} color={theme.colors.muted} />
      ) : null}
    </Pressable>
  );
};

export const ListDivider: React.FC = () => <View style={styles.divider} />;

type ListGroupProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Inset-grouped list container in the Card dialect (white, radius 18, soft
 * teal shadow). Shadow lives on the outer view and clipping on the inner one
 * so Android ripples stay bounded without eating the iOS shadow.
 */
export const ListGroup: React.FC<ListGroupProps> = ({ children, style }) => (
  <View style={[styles.group, style]}>
    <View style={styles.groupClip}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  group: {
    backgroundColor: theme.colors.card,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.secondary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 5
  },
  groupClip: {
    borderRadius: 18,
    overflow: "hidden"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1),
    minHeight: 56,
    paddingVertical: theme.spacing(1.25),
    paddingHorizontal: theme.spacing(1.25),
    backgroundColor: theme.colors.card
  },
  rowPressed: {
    backgroundColor: "#F8F2E6"
  },
  rowDisabled: {
    opacity: 0.55
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border
  },
  iconAccent: {
    backgroundColor: "#FFF3DC",
    borderColor: "#F5DCA9"
  },
  iconDanger: {
    backgroundColor: "#FFF5F5",
    borderColor: "#F4C7C7"
  },
  text: {
    flex: 1,
    gap: 2
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    fontSize: 16
  },
  titleDanger: {
    color: theme.colors.danger
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    lineHeight: 18
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginLeft: theme.spacing(6.5)
  }
});
