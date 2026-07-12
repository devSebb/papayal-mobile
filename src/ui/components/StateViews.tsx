import React, { useEffect } from "react";
import { Animated, Easing, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";

import Button from "./Button";
import Card from "./Card";
import { theme } from "../theme";

type SkeletonBlockProps = {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

// Single Animated.Value shared by every SkeletonBlock so all placeholders
// pulse in sync and the app runs at most one animation loop (native driver).
// Refcounted: the loop starts with the first mounted block and stops with
// the last, so nothing animates while no skeletons are on screen.
const skeletonPulse = new Animated.Value(1);
let skeletonPulseLoop: Animated.CompositeAnimation | null = null;
let skeletonPulseConsumers = 0;

const retainSkeletonPulse = () => {
  skeletonPulseConsumers += 1;
  if (skeletonPulseConsumers > 1) return;
  skeletonPulseLoop = Animated.loop(
    Animated.sequence([
      Animated.timing(skeletonPulse, {
        toValue: 0.5,
        duration: 500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      }),
      Animated.timing(skeletonPulse, {
        toValue: 1,
        duration: 500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      })
    ])
  );
  skeletonPulseLoop.start();
};

const releaseSkeletonPulse = () => {
  skeletonPulseConsumers = Math.max(0, skeletonPulseConsumers - 1);
  if (skeletonPulseConsumers > 0) return;
  skeletonPulseLoop?.stop();
  skeletonPulseLoop = null;
  skeletonPulse.setValue(1);
};

export const SkeletonBlock: React.FC<SkeletonBlockProps> = ({
  width = "100%",
  height,
  radius = theme.radius.md,
  style
}) => {
  useEffect(() => {
    retainSkeletonPulse();
    return releaseSkeletonPulse;
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius: radius, opacity: skeletonPulse },
        style
      ]}
    />
  );
};

type EmptyStateCardProps = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
};

export const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  style
}) => (
  <Card style={[styles.emptyCard, style]}>
    <View style={styles.iconBadge}>
      <Feather name={icon} size={22} color={theme.colors.secondary} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyMessage}>{message}</Text>
    {actionLabel && onAction ? (
      <Button label={actionLabel} variant="ghost" onPress={onAction} style={styles.emptyAction} />
    ) : null}
  </Card>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: "rgba(255, 255, 255, 0.68)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(13, 47, 50, 0.08)"
  },
  emptyCard: {
    alignItems: "center",
    gap: theme.spacing(0.75),
    paddingVertical: theme.spacing(2.25)
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF8EC",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(252, 165, 15, 0.45)"
  },
  emptyTitle: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    fontSize: theme.typography.body,
    textAlign: "center"
  },
  emptyMessage: {
    color: theme.colors.muted,
    textAlign: "center",
    lineHeight: 20
  },
  emptyAction: {
    marginTop: theme.spacing(0.75)
  }
});
