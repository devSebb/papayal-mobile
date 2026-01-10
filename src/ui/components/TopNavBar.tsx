import React from "react";
import { Image, StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from "react-native";
import { NavigationProp, ParamListBase, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { theme } from "../theme";

type Props = {
  style?: StyleProp<ViewStyle>;
};

const TopNavBar: React.FC<Props> = ({ style }) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const tabNavigation = navigation.getParent<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, theme.spacing(1));

  const navigateToTab = (name: string, params?: Record<string, unknown>) => {
    if (tabNavigation) {
      tabNavigation.navigate(name, params);
      return;
    }
    navigation.navigate(name, params);
  };

  const handleHome = () => navigateToTab("HomeTab");
  const handleHelp = () => navigateToTab("ProfileTab", { screen: "Help" });

  return (
    <View style={[styles.container, { paddingTop: topPadding }, style]}>
      <TouchableOpacity
        onPress={handleHome}
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityLabel="Go to home"
      >
        <Image source={require("../../../assets/favicon.png")} style={styles.logo} />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleHelp}
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityLabel="Open help"
      >
        <Feather name="help-circle" size={24} color={theme.colors.text} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(1.5)
  },
  iconButton: {
    padding: theme.spacing(1),
    borderRadius: theme.radius.md,
    backgroundColor: "transparent",
    borderWidth: 0
  },
  logo: {
    width: 28,
    height: 28,
    resizeMode: "contain"
  }
});

export default TopNavBar;

