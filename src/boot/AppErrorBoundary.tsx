import React, { Component, ErrorInfo, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import * as Sentry from "@sentry/react-native";

import { theme } from "../ui/theme";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
};

/**
 * Top-level error boundary to prevent silent black screens in production.
 * Catches React errors in the component tree and displays a fallback UI
 * instead of crashing with no feedback.
 */
export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Hide native splash so our fallback UI is visible
    SplashScreen.hideAsync().catch(() => {});
    // Report to Sentry. captureException is already a no-op when Sentry.init
    // never ran (no EXPO_PUBLIC_SENTRY_DSN); the getClient() guard makes the
    // "only when initialized" intent explicit.
    if (Sentry.getClient() !== undefined) {
      Sentry.captureException(error, {
        contexts: {
          react: { componentStack: errorInfo.componentStack ?? null }
        }
      });
    }
    // Log for debugging (visible in Xcode console for TestFlight builds)
    if (__DEV__) {
      console.error("[AppErrorBoundary] Caught error:", error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Algo salió mal</Text>
          <Text style={styles.message}>
            La app no pudo iniciarse. Por favor, intenta de nuevo más tarde.
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={styles.debug} selectable>
              {this.state.error.toString()}
            </Text>
          )}
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  title: {
    fontSize: 20,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text,
    marginBottom: 12
  },
  message: {
    fontSize: 16,
    color: theme.colors.muted,
    textAlign: "center"
  },
  debug: {
    marginTop: 24,
    fontSize: 12,
    color: theme.colors.danger,
    fontFamily: theme.fonts.medium,
    letterSpacing: 0.3
  }
});
