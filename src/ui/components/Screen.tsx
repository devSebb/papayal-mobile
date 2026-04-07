import React from "react";
import { ScrollView, StyleSheet, View, ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../theme";

type Props = ViewProps & {
  scrollable?: boolean;
  centerContent?: boolean;
  safeAreaColor?: string;
  edges?: ("top" | "bottom" | "left" | "right")[];
  /** When used with scrollable, rendered above the ScrollView so it does not scroll away */
  header?: React.ReactNode;
};

const Screen: React.FC<Props> = ({
  children,
  style,
  scrollable = false,
  centerContent = false,
  safeAreaColor,
  edges = ["top", "left", "right"],
  header,
  ...rest
}) => {
  const flattenedStyle = StyleSheet.flatten(style) || {};
  const backgroundColor = safeAreaColor ?? flattenedStyle.backgroundColor ?? theme.colors.background;

  const hasFixedHeader = Boolean(header) && scrollable;

  const content = (
    <View
      style={[
        styles.inner,
        centerContent ? styles.center : null,
        hasFixedHeader ? styles.innerBelowFixedHeader : null,
        style
      ]}
      {...rest}
    >
      {children}
    </View>
  );

  const safeStyles = [styles.safe, { backgroundColor }];

  return (
    <SafeAreaView style={safeStyles} edges={edges}>
      {hasFixedHeader ? <View style={styles.fixedHeader}>{header}</View> : null}
      {scrollable ? (
        <ScrollView
          style={[styles.scroll, { backgroundColor }]}
          contentContainerStyle={styles.scrollContent}
        >
          {content}
        </ScrollView>
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
    padding: theme.spacing(2)
  },
  innerBelowFixedHeader: {
    paddingTop: 0
  },
  fixedHeader: {
    paddingHorizontal: theme.spacing(2),
    paddingBottom: theme.spacing(1)
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing(18)
  },
  center: {
    justifyContent: "center",
    alignItems: "center"
  }
});

export default Screen;

