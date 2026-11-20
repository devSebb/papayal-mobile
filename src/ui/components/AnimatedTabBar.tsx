import React, { useContext, useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { StackActions, type NavigationState, type PartialState } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from "react-native-reanimated";
import { runOnJS } from "react-native-worklets";

import { theme } from "../theme";
import { hapticSelection } from "../../utils/haptics";

const AnimatedIcon = Animated.createAnimatedComponent(Feather);

const iconMap: Record<string, keyof typeof Feather.glyphMap> = {
  HomeTab: "home",
  WalletTab: "credit-card",
  ProfileTab: "user"
};
const ICON_SIZE = 22;
/**
 * Optical size correction. Every Feather glyph is drawn with the same stroke
 * width, but the house packs a roof + door into the box, so at the shared size
 * it reads heavier than the card and the person. Nudging it down evens out the
 * perceived weight across the bar.
 */
const iconSizeMap: Record<string, number> = {
  HomeTab: 20
};
const tabRootScreens: Record<string, string> = {
  HomeTab: "Home",
  WalletTab: "WalletList",
  ProfileTab: "Profile"
};

const shouldHideTabBar = (options: BottomTabBarProps["descriptors"][string]["options"]) => {
  const tabBarStyle = StyleSheet.flatten(options.tabBarStyle as any) as
    | { display?: string }
    | undefined;
  return tabBarStyle?.display === "none";
};

const AnimatedTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, theme.spacing(1));
  // Report the real height so useBottomTabBarHeight() matches this custom bar;
  // without it, react-navigation only knows the default bar's estimate and
  // screens pad too little, hiding content behind the floating rail.
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);
  // const bottomPadding = Math.max(bottomInset, theme.spacing(3));
  const panX = useSharedValue(0);
  
  const railPaddingX = theme.spacing(0.5);
  const railWidth = Math.min(width, 620);

  const railInnerWidth = railWidth - railPaddingX * 2;

  // Tabs tile the rail exactly — no gap, no distributed slack. The indicator is
  // positioned with `index * tabWidth`, so any spacing between the buttons would
  // desync it from the icons, and the drift compounds with each tab (the last
  // one, Perfil, ends up furthest off).
  const tabWidth = useMemo(() => {
    return railInnerWidth / state.routes.length;
  }, [railInnerWidth, state.routes.length]);

  const indicatorWidth = useMemo(() => {
    return Math.max(tabWidth - theme.spacing(1), tabWidth * 0.82);
  }, [tabWidth]);

  const indicatorCenterOffset = useMemo(() => {
    return (tabWidth - indicatorWidth) / 2;
  }, [tabWidth, indicatorWidth]);

  // IMPORTANT: initial value includes offset
  const indicatorX = useSharedValue(state.index * tabWidth + indicatorCenterOffset);
  const animatedIndex = useSharedValue(state.index);

  useEffect(() => {
    indicatorX.value = withSpring(state.index * tabWidth + indicatorCenterOffset, {
      damping: 18,
      stiffness: 240,
      mass: 0.6
    });

    animatedIndex.value = withSpring(state.index, {
      damping: 16,
      stiffness: 200,
      mass: 0.7
    });
  }, [state.index, tabWidth, indicatorCenterOffset]);

  const switchTo = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= state.routes.length) return;
    const route = state.routes[targetIndex];
    const isFocused = state.index === targetIndex;
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true
    });
    if (event.defaultPrevented) return;

    if (!isFocused) {
      hapticSelection();
      navigation.navigate({ name: route.name, merge: true, params: undefined });
      return;
    }

    const nestedState = route.state as NavigationState | PartialState<NavigationState> | undefined;
    const stackIndex = nestedState?.index ?? 0;
    const stackKey = nestedState?.key;
    const rootRouteName = nestedState?.routeNames?.[0] ?? tabRootScreens[route.name];

    if (stackIndex > 0) {
      if (stackKey) {
        navigation.dispatch({ ...StackActions.popToTop(), target: stackKey });
      } else if (rootRouteName) {
        navigation.navigate({
          name: route.name,
          merge: true,
          params: { screen: rootRouteName }
        });
      }
    }
  };

  const gesture = Gesture.Pan()
    // .activeOffsetX([-12, 12])
    .onUpdate((event) => {
      panX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX > 52) {
        runOnJS(switchTo)(state.index - 1);
      } else if (event.translationX < -52) {
        runOnJS(switchTo)(state.index + 1);
      }
      panX.value = withSpring(0, { damping: 15, stiffness: 140 });
    })
    .onFinalize(() => {
      panX.value = withSpring(0, { damping: 15, stiffness: 140 });
    });

  const railStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panX.value * 0.05 },
      {
        scale: interpolate(Math.abs(panX.value), [0, 120], [1, 0.96], Extrapolation.CLAMP)
      }
    ]
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value + panX.value * 0.12 }]
  }));

  const focusedRoute = state.routes[state.index];
  const focusedOptions = focusedRoute ? descriptors[focusedRoute.key]?.options : undefined;
  const isHidden = Boolean(focusedOptions && shouldHideTabBar(focusedOptions));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.wrapper,
          isHidden ? styles.hidden : null,
          // { paddingBottom: bottomPadding },
          railStyle
        ]}
        pointerEvents={isHidden ? "none" : "auto"}
        onLayout={(event) => onHeightChange?.(event.nativeEvent.layout.height)}
      >
        <View style={[styles.rail, { width: railWidth, paddingBottom: bottomInset + theme.spacing(2) }]} pointerEvents="box-none">
          <Animated.View style={[styles.indicator, { width: indicatorWidth }, indicatorStyle]} />
          {state.routes.map((route, index) => {
            const options = descriptors[route.key]?.options || {};
            const rawLabel = options.tabBarLabel ?? options.title ?? route.name;
            const label = typeof rawLabel === "function" ? route.name : String(rawLabel ?? route.name);
            const icon = iconMap[route.name] ?? "circle";
            const isFocused = state.index === index;

            const iconAnimatedStyle = useAnimatedStyle(() => {
              const scale = interpolate(
                animatedIndex.value,
                [index - 1, index, index + 1],
                [0.94, 1.2, 0.94],
                Extrapolation.CLAMP
              );
              const color = interpolateColor(
                animatedIndex.value,
                [index - 1, index, index + 1],
                [theme.colors.navbarMuted, theme.colors.secondary, theme.colors.navbarMuted]
              );
              const opacity = interpolate(
                animatedIndex.value,
                [index - 1, index, index + 1],
                [0.5, 1, 0.5],
                Extrapolation.CLAMP
              );
              return {
                transform: [{ scale }],
                color,
                opacity
              };
            });

            const labelAnimatedStyle = useAnimatedStyle(() => ({
              opacity: interpolate(
                animatedIndex.value,
                [index - 1, index, index + 1],
                [0.7, 1, 0.7],
                Extrapolation.CLAMP
              ),
              color: interpolateColor(
                animatedIndex.value,
                [index - 1, index, index + 1],
                [theme.colors.navbarMuted, theme.colors.primary, theme.colors.navbarMuted]
              )
            }));

            return (
              <Pressable
                key={route.key}
                onPress={() => switchTo(index)}
                onLongPress={() => switchTo(index)}
                style={[styles.tabButton, { width: tabWidth }]}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={label?.toString()}
                accessibilityHint={`Ir a ${label}`}
              >
                <AnimatedIcon
                  name={icon}
                  size={iconSizeMap[route.name] ?? ICON_SIZE}
                  style={iconAnimatedStyle}
                />
                <Animated.Text style={[styles.label, labelAnimatedStyle]} numberOfLines={1}>
                  {label}
                </Animated.Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    // paddingBottom: theme.spacing(3),
    backgroundColor: theme.colors.background
  },
  hidden: {
    display: "none"
  },
  rail: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: theme.spacing(0.75),
    paddingBottom: theme.spacing(4),
    paddingHorizontal: theme.spacing(0.5),
    shadowColor: "#00000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    overflow: "visible"
  },
  indicator: {
    position: "absolute",
    top: 6,
    left: theme.spacing(0.5),
    height: 55,
    // width: 50,
    backgroundColor: theme.colors.background,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6
  },
  tabButton: {
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
    paddingVertical: theme.spacing(0.1),
    // paddingHorizontal: theme.spacing(0.25),
    minHeight: 54
  },
  label: {
    fontSize: 12,
    fontFamily: theme.fonts.bold,
    letterSpacing: 0.15,
    color: theme.colors.navbarMuted
  }
});

export default AnimatedTabBar;
