import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { theme } from "../theme";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type Props = {
  label: string;
  onPress: () => void | Promise<void>;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  labelColor?: string;
  accessibilityLabel?: string;
};

const Button: React.FC<Props> = ({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
  labelColor,
  accessibilityLabel
}) => {
  const isDisabled = disabled || loading;
  const resolvedLabelColor =
    labelColor ??
    (variant === "primary"
      ? theme.colors.secondary
      : variant === "secondary" || variant === "danger"
      ? "#FFFFFF"
      : theme.colors.secondary);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={10}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "ghost" ? theme.colors.primary : resolvedLabelColor}
        />
      ) : (
        <Text
          style={[
            styles.label,
            { color: resolvedLabelColor },
            variant === "ghost" ? styles.ghostLabel : null
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: theme.spacing(1.2),
    paddingHorizontal: theme.spacing(2),
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: theme.spacing(0.25),
    shadowColor: theme.colors.secondary,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  primary: {
    backgroundColor: theme.colors.primary
  },
  secondary: {
    backgroundColor: theme.colors.secondary
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border
  },
  danger: {
    backgroundColor: theme.colors.danger
  },
  pressed: {
    opacity: 0.9
  },
  disabled: {
    opacity: 0.5
  },
  label: {
    fontSize: theme.typography.body,
    fontWeight: "700",
    fontFamily: theme.fonts.regular,
    letterSpacing: 0.1,
    textAlign: "center",
    flexShrink: 1
  },
  ghostLabel: {
    color: theme.colors.secondary
  }
});

export default Button;

