import React from "react";
import { ActivityIndicator } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import LoginScreen from "../screens/LoginScreen";
import WelcomeScreen from "../screens/WelcomeScreen";
import SignupScreen from "../screens/SignupScreen";
import HomeScreen from "../screens/HomeScreen";
import WalletListScreen from "../screens/WalletListScreen";
import GiftCardDetailScreen from "../screens/GiftCardDetailScreen";
import RedemptionTokenScreen from "../screens/RedemptionTokenScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ActivityScreen from "../screens/ActivityScreen";
import { useAuth } from "../auth/authStore";
import { theme } from "../ui/theme";
import Screen from "../ui/components/Screen";

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
};

export type WalletStackParamList = {
  WalletList: undefined;
  GiftCardDetail: { id: string };
  RedemptionToken: { id: string };
  Activity: undefined;
};

export type AppTabsParamList = {
  HomeTab: undefined;
  WalletTab: undefined;
  ProfileTab: undefined;
};

const RootStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const WalletStack = createNativeStackNavigator<WalletStackParamList>();
const Tab = createBottomTabNavigator<AppTabsParamList>();

const WalletStackNavigator = () => (
  <WalletStack.Navigator>
    <WalletStack.Screen
      name="WalletList"
      component={WalletListScreen}
      options={{ title: "Wallet" }}
    />
    <WalletStack.Screen
      name="GiftCardDetail"
      component={GiftCardDetailScreen}
      options={{ title: "Gift Card" }}
    />
    <WalletStack.Screen
      name="RedemptionToken"
      component={RedemptionTokenScreen}
      options={{ title: "Redemption Token" }}
    />
    <WalletStack.Screen
      name="Activity"
      component={ActivityScreen}
      options={{ title: "Activity" }}
    />
  </WalletStack.Navigator>
);

const AppTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: theme.colors.primary,
      tabBarInactiveTintColor: theme.colors.navbarMuted,
      tabBarLabelStyle: { fontSize: 12, fontFamily: theme.fonts.regular, fontWeight: "600" },
      tabBarStyle: {
        backgroundColor: theme.colors.navbar,
        borderTopColor: theme.colors.border,
        height: 82,
        paddingTop: 6,
        paddingBottom: 14
      },
      tabBarItemStyle: { paddingVertical: 4 },
      tabBarIcon: ({ color, size }) => {
        const iconMap: Record<string, keyof typeof Feather.glyphMap> = {
          HomeTab: "home",
          WalletTab: "credit-card",
          ProfileTab: "user"
        };
        const icon = iconMap[route.name] ?? "circle";
        return <Feather name={icon} size={size} color={color} />;
      }
    })}
  >
    <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: "Home" }} />
    <Tab.Screen
      name="WalletTab"
      component={WalletStackNavigator}
      options={{ title: "Wallet" }}
    />
    <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: "Profile" }} />
  </Tab.Navigator>
);

const AuthNavigator = () => (
  <AuthStack.Navigator initialRouteName="Welcome">
    <AuthStack.Screen
      name="Welcome"
      component={WelcomeScreen}
      options={{ headerShown: false }}
    />
    <AuthStack.Screen
      name="Login"
      component={LoginScreen}
      options={{ headerShown: false }}
    />
    <AuthStack.Screen
      name="Signup"
      component={SignupScreen}
      options={{ headerShown: false }}
    />
  </AuthStack.Navigator>
);

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: theme.colors.primary,
    background: theme.colors.background,
    card: theme.colors.background,
    text: theme.colors.text,
    border: theme.colors.border
  }
};

const RootNavigator = () => {
  const { accessToken, hydrated } = useAuth();

  if (!hydrated) {
    return (
      <Screen centerContent>
        <ActivityIndicator color={theme.colors.primary} />
      </Screen>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {accessToken ? (
          <RootStack.Screen name="App" component={AppTabs} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;

