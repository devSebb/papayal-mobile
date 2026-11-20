import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControlProps,
  ScrollView,
  StyleSheet,
  View,
  ViewProps
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../theme";

type Props = ViewProps & {
  scrollable?: boolean;
  centerContent?: boolean;
  safeAreaColor?: string;
  edges?: ("top" | "bottom" | "left" | "right")[];
  /** When used with scrollable, rendered above the ScrollView so it does not scroll away */
  header?: React.ReactNode;
  /** Keeps focused inputs visible when the keyboard opens on scrollable screens */
  keyboardAware?: boolean;
  keyboardVerticalOffset?: number;
  /**
   * Touch handling for the inner ScrollView. Defaults to "handled". Screens
   * hosting native composite inputs (e.g. Stripe's CardField) should pass
   * "always" so the ScrollView never swallows the first tap routed through the
   * native field.
   */
  keyboardShouldPersistTaps?: "always" | "never" | "handled";
  /** Pull-to-refresh for scrollable screens; ignored when scrollable is false */
  refreshControl?: React.ReactElement<RefreshControlProps>;
};

const Screen: React.FC<Props> = ({
  children,
  style,
  scrollable = false,
  centerContent = false,
  safeAreaColor,
  edges = ["top", "left", "right"],
  header,
  keyboardAware = true,
  keyboardVerticalOffset = 0,
  keyboardShouldPersistTaps = "handled",
  refreshControl,
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
  const scrollView = (
    <ScrollView
      style={[styles.scroll, { backgroundColor }]}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {content}
    </ScrollView>
  );

  return (
    <SafeAreaView style={safeStyles} edges={edges}>
      {hasFixedHeader ? <View style={styles.fixedHeader}>{header}</View> : null}
      {scrollable ? (
        keyboardAware ? (
          <KeyboardAvoidingView
            style={styles.keyboardAvoider}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={keyboardVerticalOffset}
          >
            {scrollView}
          </KeyboardAvoidingView>
        ) : (
          scrollView
        )
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
  keyboardAvoider: {
    flex: 1
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
