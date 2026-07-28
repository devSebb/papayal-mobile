import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";

import { theme } from "../theme";
import BackButton from "./BackButton";

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
            <BackButton
              onPress={onBack}
              label={backLabel}
              showLabel={showBackLabel}
              disabled={disabledBack}
            />
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
  backPlaceholder: {
    width: 40,
    height: 40
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
