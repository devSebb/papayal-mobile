import React from "react";
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";

import { theme } from "../theme";

type Props = {
  title?: string;
  subtitle?: string;
  icon?: keyof typeof Feather.glyphMap;
  iconColor?: string;
  onBack?: () => void;
  backLabel?: string;
  showBackLabel?: boolean;
  disabledBack?: boolean;
  danger?: boolean;
  style?: StyleProp<ViewStyle>;
};

const AppHeader: React.FC<Props> = ({
  title,
  subtitle,
  icon,
  iconColor,
  onBack,
  backLabel = "Volver",
  showBackLabel = true,
  disabledBack = false,
  danger = false,
  style
}) => {
  const hasTopRow = Boolean(onBack || icon);
  const resolvedIconColor = iconColor ?? (danger ? theme.colors.danger : theme.colors.text);

  return (
    <View style={[styles.container, style]}>
      {hasTopRow ? (
        <View style={styles.topRow}>
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel={backLabel}
              disabled={disabledBack}
            >
              <Feather name="arrow-left" size={20} color={theme.colors.text} />
              {showBackLabel ? <Text style={styles.backLabel}>{backLabel}</Text> : null}
            </TouchableOpacity>
          ) : (
            <View style={styles.backPlaceholder} />
          )}
          {icon ? (
            <View style={styles.iconBadge}>
              <Feather name={icon} size={20} color={resolvedIconColor} />
            </View>
          ) : null}
        </View>
      ) : null}
      {title ? (
        <Text style={[styles.title, danger ? styles.titleDanger : null]}>{title}</Text>
      ) : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing(0.5)
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(0.5)
  },
  backButton: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(0.5),
    paddingVertical: theme.spacing(0.5),
    paddingHorizontal: theme.spacing(0.5),
    borderRadius: theme.radius.md
  },
  backPlaceholder: {
    width: 36,
    height: 36
  },
  backLabel: {
    color: theme.colors.text,
    fontFamily: theme.fonts.semiBold
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.58)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(13, 47, 50, 0.08)"
  },
  title: {
    fontSize: theme.typography.subheading,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text
  },
  titleDanger: {
    color: theme.colors.danger
  },
  subtitle: {
    color: theme.colors.muted,
    lineHeight: 20
  }
});

export default AppHeader;
