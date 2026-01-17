import React from "react";
import { ActivityIndicator } from "react-native";
import { NavigationContainer, DefaultTheme, NavigatorScreenParams } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import LoginScreen from "../screens/LoginScreen";
import WelcomeScreen from "../screens/WelcomeScreen";
import SignupScreen from "../screens/SignupScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/ResetPasswordScreen";
import HomeScreen from "../screens/HomeScreen";
import WalletListScreen from "../screens/WalletListScreen";
import GiftCardDetailScreen from "../screens/GiftCardDetailScreen";
import RedemptionTokenScreen from "../screens/RedemptionTokenScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SettingsScreen from "../screens/SettingsScreen";
import TermsScreen from "../screens/TermsScreen";
import LegalPrivacyScreen from "../screens/settings/LegalPrivacyScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import ActivityScreen from "../screens/ActivityScreen";
import HelpScreen from "../screens/HelpScreen";
import { useAuth } from "../auth/authStore";
import { theme } from "../ui/theme";
import Screen from "../ui/components/Screen";
import BuyGiftCardStartScreen from "../screens/buy/BuyGiftCardStartScreen";
import DeliveryProfileScreen from "../screens/buy/DeliveryProfileScreen";
import PurchaseConfirmationScreen from "../screens/buy/PurchaseConfirmationScreen";
import CompleteDetailsScreen from "../screens/buy/CompleteDetailsScreen";
import StripePaymentScreen from "../screens/buy/StripePaymentScreen";
import PurchaseSuccessScreen from "../screens/buy/PurchaseSuccessScreen";
import AnimatedTabBar from "../ui/components/AnimatedTabBar";

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
  ForgotPassword: { email?: string };
  ResetPassword: { token?: string };
};

export type HomeStackParamList = {
  Home: undefined;
  BuyGiftCardStart: undefined;
  DeliveryProfile: undefined;
  PurchaseConfirmation: undefined;
  CompleteDetails:
    | {
        missing?: string[];
        returnTo?: "StripePayment";
      }
    | undefined;
  StripePayment: undefined;
  PurchaseSuccess: {
    merchantName?: string;
    amountLabel?: string;
    recipientEmail?: string;
    demo?: boolean;
  };
};

export type WalletStackParamList = {
  WalletList: undefined;
  GiftCardDetail: { id: string };
  RedemptionToken: { id: string };
  Activity: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
  Terms: undefined;
  LegalPrivacy: undefined;
  EditProfile: undefined;
  Help: undefined;
};

export type AppTabsParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList> | undefined;
  WalletTab: NavigatorScreenParams<WalletStackParamList> | undefined;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

const RootStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const WalletStack = createNativeStackNavigator<WalletStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const Tab = createBottomTabNavigator<AppTabsParamList>();

const HomeStackNavigator = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="Home" component={HomeScreen} />
    <HomeStack.Screen name="BuyGiftCardStart" component={BuyGiftCardStartScreen} />
    <HomeStack.Screen name="DeliveryProfile" component={DeliveryProfileScreen} />
    <HomeStack.Screen
      name="PurchaseConfirmation"
      component={PurchaseConfirmationScreen}
      options={{ presentation: "card" }}
    />
    <HomeStack.Screen
      name="CompleteDetails"
      component={CompleteDetailsScreen}
      options={{ animation: "slide_from_right" }}
    />
    <HomeStack.Screen name="StripePayment" component={StripePaymentScreen} />
    <HomeStack.Screen
      name="PurchaseSuccess"
      component={PurchaseSuccessScreen}
      options={{ animation: "slide_from_right" }}
    />
  </HomeStack.Navigator>
);

const WalletStackNavigator = () => (
  <WalletStack.Navigator>
    <WalletStack.Screen
      name="WalletList"
      component={WalletListScreen}
      options={{ title: "Billetera", headerShown: false }}
    />
    <WalletStack.Screen
      name="GiftCardDetail"
      component={GiftCardDetailScreen}
      options={{ title: "Tarjeta de regalo" }}
    />
    <WalletStack.Screen
      name="RedemptionToken"
      component={RedemptionTokenScreen}
      options={{ title: "Token de canje" }}
    />
    <WalletStack.Screen
      name="Activity"
      component={ActivityScreen}
      options={{ title: "Actividad" }}
    />
  </WalletStack.Navigator>
);

const ProfileStackNavigator = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="Profile" component={ProfileScreen} />
    <ProfileStack.Screen name="Settings" component={SettingsScreen} />
    <ProfileStack.Screen name="Terms" component={TermsScreen} />
    <ProfileStack.Screen name="LegalPrivacy" component={LegalPrivacyScreen} />
    <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
    <ProfileStack.Screen name="Help" component={HelpScreen} />
  </ProfileStack.Navigator>
);

const AppTabs = () => (
  <Tab.Navigator
    tabBar={(props) => <AnimatedTabBar {...props} />}
    screenOptions={{
      headerShown: false,
      tabBarShowLabel: false,
      tabBarStyle: {
        // backgroundColor: "transparent",
        position: "absolute",
        elevation: 0,
        borderTopWidth: 0
      }
    }}
  >
    <Tab.Screen name="HomeTab" component={HomeStackNavigator} options={{ title: "Inicio" }} />
    <Tab.Screen
      name="WalletTab"
      component={WalletStackNavigator}
      options={{ title: "Billetera" }}
    />
    <Tab.Screen name="ProfileTab" component={ProfileStackNavigator} options={{ title: "Perfil" }} />
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
    <AuthStack.Screen
      name="ForgotPassword"
      component={ForgotPasswordScreen}
      options={{ headerShown: false }}
    />
    <AuthStack.Screen
      name="ResetPassword"
      component={ResetPasswordScreen}
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

