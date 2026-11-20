import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";

import { theme } from "../theme";

type Props = {
  onPress: () => void;
  /** Text shown next to the arrow. Only rendered when `showLabel` is true. */
  label?: string;
  showLabel?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * The one back affordance in the app. Every screen that can be dismissed uses
 * this — same size, icon, color and pressed state — so back never looks or
 * behaves differently from one screen to the next. Do not hand-roll another
 * arrow-left Pressable; extend this instead.
 */
const BackButton: React.FC<Props> = ({
  onPress,
  label = "Volver",
  showLabel = false,
  disabled = false,
  style,
  accessibilityLabel
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    hitSlop={10}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={{ disabled }}
    style={({ pressed }) => [
      styles.button,
      showLabel ? styles.buttonWithLabel : null,
      pressed && !disabled ? styles.pressed : null,
      disabled ? styles.disabled : null,
      style
    ]}
  >
    <Feather name="arrow-left" size={22} color={theme.colors.text} />
    {showLabel ? <Text style={styles.label}>{label}</Text> : null}
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing(0.5),
    alignSelf: "flex-start",
    backgroundColor: "transparent"
  },
  buttonWithLabel: {
    justifyContent: "flex-start",
    paddingRight: theme.spacing(1)
  },
  pressed: {
    backgroundColor: "rgba(13, 47, 50, 0.08)"
  },
  disabled: {
    opacity: 0.4
  },
  label: {
    color: theme.colors.text,
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.typography.body
  }
});

export default BackButton;
