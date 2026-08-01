import React, { useEffect } from "react";
import { NavigationContainer, DefaultTheme, NavigatorScreenParams, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { setupNotificationResponseListener, handleInitialNotification } from "../notifications/handler";
import { setupAppLinkListener, handleInitialAppLink } from "../linking/handler";
import { navigationIntegration, reportFloating } from "../boot/sentry";

import LoginScreen from "../screens/LoginScreen";
import WelcomeScreen from "../screens/WelcomeScreen";
import SignupScreen from "../screens/SignupScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/ResetPasswordScreen";
import HomeScreen from "../screens/HomeScreen";
import WalletListScreen from "../screens/WalletListScreen";
import GiftCardDetailScreen from "../screens/GiftCardDetailScreen";
import MerchantWalletScreen from "../screens/MerchantWalletScreen";
import MerchantRedemptionFlowScreen from "../screens/MerchantRedemptionFlowScreen";
import RedemptionTokenScreen from "../screens/RedemptionTokenScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SettingsScreen from "../screens/SettingsScreen";
import LegalPrivacyScreen from "../screens/settings/LegalPrivacyScreen";
import DeleteAccountScreen from "../screens/settings/DeleteAccountScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import ActivityScreen from "../screens/ActivityScreen";
import HelpScreen from "../screens/HelpScreen";
import GuestBrowseScreen from "../screens/guest/GuestBrowseScreen";
import GuestMerchantProfileScreen from "../screens/guest/GuestMerchantProfileScreen";
import AuthRequiredScreen from "../screens/guest/AuthRequiredScreen";
import { useAuth } from "../auth/authStore";
import { theme } from "../ui/theme";
import BuyGiftCardStartScreen from "../screens/buy/BuyGiftCardStartScreen";
import DeliveryProfileScreen from "../screens/buy/DeliveryProfileScreen";
import PurchaseConfirmationScreen from "../screens/buy/PurchaseConfirmationScreen";
import CompleteDetailsScreen from "../screens/buy/CompleteDetailsScreen";
import StripePaymentScreen from "../screens/buy/StripePaymentScreen";
import PurchaseSuccessScreen from "../screens/buy/PurchaseSuccessScreen";
import MerchantProfileScreen from "../screens/MerchantProfileScreen";
import InterestsScreen from "../screens/InterestsScreen";
import ClaimVerificationScreen from "../screens/ClaimVerificationScreen";
import ClaimLandingScreen from "../screens/ClaimLandingScreen";
import EmailVerificationScreen from "../screens/EmailVerificationScreen";
import type { ClaimVerificationDetails } from "../types/api";
import AnimatedTabBar from "../ui/components/AnimatedTabBar";
import BackButton from "../ui/components/BackButton";
import { consumePendingPostAuthIntent } from "./postAuthIntent";

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
  Interests: {
    formData: {
      first_name: string;
      last_name: string;
      email: string;
      password: string;
      password_confirmation: string;
      phone: string;
    };
  };
  ClaimVerification: {
    /** Full signup payload (including interests) to re-POST with the OTP. */
    formData: {
      first_name: string;
      last_name: string;
      email: string;
      password: string;
      password_confirmation: string;
      phone: string;
      interests: string[];
    };
    /** Masked channel info from the 409 auth.claim_verification_required. */
    details: ClaimVerificationDetails;
  };
  EmailVerification: {
    /** Address the 6-digit code was sent to; used for verify + resend. */
    email: string;
    /** Masked form for display, e.g. "s•••@gmail.com". */
    maskedEmail?: string | null;
    /** Seconds until a resend is allowed (from signup/login response). */
    resendAvailableIn?: number;
  };
  ForgotPassword: { email?: string };
  ResetPassword: { token?: string };
  /** Gift teaser behind a papayal.app/claim/<token> deep link (signed out). */
  ClaimLanding: { token: string };
};

export type HomeStackParamList = {
  Home: undefined;
  MerchantProfile: { id: string };
  BuyGiftCardStart: { merchantId?: string } | undefined;
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
    paymentIntentId?: string;
    cardReady?: boolean;
  };
};

export type WalletStackParamList = {
  WalletList: undefined;
  GiftCardDetail: { id: string };
  /** Aggregated per-merchant balance: card carousel + history + redeem CTA. */
  MerchantWallet: { merchantId: string | null };
  /** Guided card-by-card redemption at the register. initialCardId = explicit
   *  user pick from the carousel; omitted for the default (crumbs-first) queue. */
  MerchantRedemptionFlow: { merchantId: string | null; initialCardId?: string };
  RedemptionToken: { id: string };
  Activity: undefined;
  /** Gift teaser behind a papayal.app/claim/<token> deep link (signed in). */
  ClaimLanding: { token: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
  LegalPrivacy: undefined;
  DeleteAccount: undefined;
  EditProfile: undefined;
  Help: undefined;
};

export type AppTabsParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList> | undefined;
  WalletTab: NavigatorScreenParams<WalletStackParamList> | undefined;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

export type GuestHomeStackParamList = {
  GuestHome: undefined;
  GuestMerchantProfile: { id: string };
};

export type GuestTabsParamList = {
  HomeTab: NavigatorScreenParams<GuestHomeStackParamList> | undefined;
  WalletTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList> | undefined;
  GuestApp: undefined;
  App: NavigatorScreenParams<AppTabsParamList> | undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const WalletStack = createNativeStackNavigator<WalletStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const GuestHomeStack = createNativeStackNavigator<GuestHomeStackParamList>();
const Tab = createBottomTabNavigator<AppTabsParamList>();
const GuestTab = createBottomTabNavigator<GuestTabsParamList>();

const HomeStackNavigator = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="Home" component={HomeScreen} />
    <HomeStack.Screen name="MerchantProfile" component={MerchantProfileScreen} />
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

// Native headers would render the platform chevron; headerLeft swaps in the
// same BackButton every custom-header screen uses, so back looks identical
// everywhere in the app.
const walletScreenOptions = ({
  navigation
}: {
  navigation: { canGoBack: () => boolean; goBack: () => void };
}) => ({
  headerTitleStyle: { fontFamily: theme.fonts.semiBold },
  headerBackTitleStyle: { fontFamily: theme.fonts.regular },
  headerBackVisible: false,
  headerLeft: () =>
    navigation.canGoBack() ? <BackButton onPress={() => navigation.goBack()} /> : null
});

const WalletStackNavigator = () => (
  <WalletStack.Navigator screenOptions={walletScreenOptions}>
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
      name="MerchantWallet"
      component={MerchantWalletScreen}
      options={{ title: "Mi saldo" }}
    />
    <WalletStack.Screen
      name="MerchantRedemptionFlow"
      component={MerchantRedemptionFlowScreen}
      options={{ title: "Canjear en tienda" }}
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
    <WalletStack.Screen
      name="ClaimLanding"
      component={ClaimLandingScreen}
      options={{ title: "Tu regalo" }}
    />
  </WalletStack.Navigator>
);

const ProfileStackNavigator = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="Profile" component={ProfileScreen} />
    <ProfileStack.Screen name="Settings" component={SettingsScreen} />
    <ProfileStack.Screen name="LegalPrivacy" component={LegalPrivacyScreen} />
    <ProfileStack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
    <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
    <ProfileStack.Screen name="Help" component={HelpScreen} />
  </ProfileStack.Navigator>
);

const GuestHomeStackNavigator = () => (
  <GuestHomeStack.Navigator screenOptions={{ headerShown: false }}>
    <GuestHomeStack.Screen name="GuestHome" component={GuestBrowseScreen} />
    <GuestHomeStack.Screen name="GuestMerchantProfile" component={GuestMerchantProfileScreen} />
  </GuestHomeStack.Navigator>
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

const GuestWalletGate = () => <AuthRequiredScreen kind="wallet" />;
const GuestProfileGate = () => <AuthRequiredScreen kind="profile" />;

const GuestAppTabs = () => (
  <GuestTab.Navigator
    tabBar={(props) => <AnimatedTabBar {...props} />}
    screenOptions={{
      headerShown: false,
      tabBarShowLabel: false,
      tabBarStyle: {
        position: "absolute",
        elevation: 0,
        borderTopWidth: 0
      }
    }}
  >
    <GuestTab.Screen name="HomeTab" component={GuestHomeStackNavigator} options={{ title: "Explorar" }} />
    <GuestTab.Screen name="WalletTab" component={GuestWalletGate} options={{ title: "Billetera" }} />
    <GuestTab.Screen name="ProfileTab" component={GuestProfileGate} options={{ title: "Perfil" }} />
  </GuestTab.Navigator>
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
      name="Interests"
      component={InterestsScreen}
      options={{ headerShown: false }}
    />
    <AuthStack.Screen
      name="ClaimVerification"
      component={ClaimVerificationScreen}
      options={{ headerShown: false }}
    />
    <AuthStack.Screen
      name="EmailVerification"
      component={EmailVerificationScreen}
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
    <AuthStack.Screen
      name="ClaimLanding"
      component={ClaimLandingScreen}
      options={{ headerShown: false }}
    />
  </AuthStack.Navigator>
);

const navigationRef = createNavigationContainerRef<RootStackParamList>();

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
  const { accessToken } = useAuth();

  // Handle notification taps (foreground + cold start)
  useEffect(() => {
    if (!accessToken) return;
    const sub = setupNotificationResponseListener(navigationRef);
    reportFloating(handleInitialNotification(navigationRef), "handleInitialNotification");
    return () => sub.remove();
  }, [accessToken]);

  // Handle universal/deep links (papayal.app/claim, /reset) in both session
  // states — unlike notifications, links matter while signed out too.
  useEffect(() => {
    const sub = setupAppLinkListener(navigationRef, !!accessToken);
    reportFloating(handleInitialAppLink(navigationRef, !!accessToken), "handleInitialAppLink");
    return () => sub.remove();
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;

    const intent = consumePendingPostAuthIntent();
    if (!intent) return;

    const timer = setTimeout(() => {
      if (!navigationRef.isReady()) return;
      if (intent.type === "buy_gift_card") {
        navigationRef.navigate("App", {
          screen: "HomeTab",
          params: {
            screen: "BuyGiftCardStart",
            params: { merchantId: intent.merchantId }
          }
        });
      } else if (intent.type === "open_gift_card") {
        // Set by the claim deep-link flow: land on the card right after
        // signup/login (the claim itself already happened, OTP-verified).
        navigationRef.navigate("App", {
          screen: "WalletTab",
          params: {
            screen: "GiftCardDetail",
            params: { id: intent.giftCardId }
          }
        });
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [accessToken]);

  // BootGate ensures we only render after hydration is complete,
  // so we can directly switch based on accessToken without a loading state.
  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      // Gives Sentry screen-transition breadcrumbs, so a crash report says
      // which screen the user was on. No-op when Sentry has no DSN.
      onReady={() => navigationIntegration.registerNavigationContainer(navigationRef)}
    >
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {accessToken ? (
          <RootStack.Screen name="App" component={AppTabs} />
        ) : (
          <>
            <RootStack.Screen name="Auth" component={AuthNavigator} />
            <RootStack.Screen name="GuestApp" component={GuestAppTabs} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
