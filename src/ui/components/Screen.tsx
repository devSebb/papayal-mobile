import React from "react";
import { ScrollView, StyleSheet, View, ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../theme";

type Props = ViewProps & {
  scrollable?: boolean;
  centerContent?: boolean;
  safeAreaColor?: string;
  edges?: ("top" | "bottom" | "left" | "right")[];
};

const Screen: React.FC<Props> = ({
  children,
  style,
  scrollable = false,
  centerContent = false,
  safeAreaColor,
  // Tabs and native headers already handle top/bottom insets, so default to only horizontal edges.
  edges = ["top", "left", "right"],
  ...rest
}) => {
  const content = (
    <View style={[styles.inner, centerContent ? styles.center : null, style]} {...rest}>
      {children}
    </View>
  );

  const safeStyles = [styles.safe, safeAreaColor ? { backgroundColor: safeAreaColor } : null];

  return (
    <SafeAreaView style={safeStyles} edges={edges}>
      {scrollable ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>{content}</ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  inner: {
    flex: 1,
    padding: theme.spacing(2),
    // backgroundColor: "blue"
  },
  scrollContent: {
    paddingBottom: theme.spacing(4)
  },
  center: {
    justifyContent: "center",
    alignItems: "center"
  }
});

export default Screen;

