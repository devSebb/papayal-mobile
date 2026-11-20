import React, { useCallback, useMemo, useState } from "react";
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
  type NavigationProp
} from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";

import Button from "../../ui/components/Button";
import { publicMerchantsApi } from "../../api/endpoints";
import { setPendingPostAuthIntent } from "../../navigation/postAuthIntent";
import { usePurchaseDraft } from "../../domain/purchase/purchaseDraftStore";
import {
  GuestHomeStackParamList,
  GuestTabsParamList,
  RootStackParamList
} from "../../navigation";
import {
  MerchantProfileError,
  MerchantProfileLoading,
  MerchantProfileScaffold,
  merchantDisplayName,
  resolveAmountPresets
} from "../merchant/merchantProfileUi";

type RouteProps = RouteProp<GuestHomeStackParamList, "GuestMerchantProfile">;
type Nav = NativeStackNavigationProp<GuestHomeStackParamList, "GuestMerchantProfile">;
type TabNav = BottomTabNavigationProp<GuestTabsParamList>;

const TAB_BAR_DEFAULT_STYLE = {
  position: "absolute" as const,
  elevation: 0,
  borderTopWidth: 0
};

/**
 * Public (signed-out) merchant profile. Renders the exact same scaffold as the
 * signed-in MerchantProfileScreen — the only difference is the bottom bar,
 * which routes to the login screen instead of checkout. The picked amount and
 * merchant are stored in the purchase draft + post-auth intent, so after
 * authenticating the user lands on the buy flow with both already filled in.
 */
const GuestMerchantProfileScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const tabNavigation = navigation.getParent<TabNav>();
  const route = useRoute<RouteProps>();
  const { setMerchant, setAmount } = usePurchaseDraft();
  const { id } = route.params;
  const [selectedAmountCents, setSelectedAmountCents] = useState<number | null>(null);

  // The Auth routes live on the root stack; walk up instead of hardcoding a
  // depth so the CTAs keep working if this screen is ever nested differently.
  const rootNavigation = React.useMemo(() => {
    let nav: NavigationProp<any> = navigation;
    let parent = nav.getParent();
    while (parent) {
      nav = parent;
      parent = nav.getParent();
    }
    return nav as unknown as NavigationProp<RootStackParamList>;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      tabNavigation?.setOptions({ tabBarStyle: { display: "none" } });
      return () => {
        tabNavigation?.setOptions({ tabBarStyle: TAB_BAR_DEFAULT_STYLE });
      };
    }, [tabNavigation])
  );

  const {
    data: merchant,
    isLoading,
    isError
  } = useQuery({
    queryKey: ["publicMerchant", id],
    queryFn: () => publicMerchantsApi.detail(id),
    enabled: !!id
  });

  const displayName = merchantDisplayName(merchant);
  const amountPresets = useMemo(() => resolveAmountPresets(merchant), [merchant]);

  /** Carries the selection across the auth boundary (the draft provider lives
   *  above the auth switch, so it survives login/signup) and drops the user
   *  into the buy flow for this merchant once authenticated. */
  const goToAuth = useCallback(
    (amountCents: number | null) => {
      if (!merchant) return;
      setMerchant({
        id: merchant.id,
        name: displayName,
        logoUrl: merchant.logo_url ?? null
      });
      setAmount(amountCents, "USD");
      setPendingPostAuthIntent({ type: "buy_gift_card", merchantId: merchant.id });
      rootNavigation.navigate("Auth", { screen: "Login" });
    },
    [displayName, merchant, rootNavigation, setAmount, setMerchant]
  );

  const handleSelectAmount = (amountCents: number) => {
    setSelectedAmountCents(amountCents);
  };

  const handleOtherAmount = () => {
    setSelectedAmountCents(null);
    goToAuth(null);
  };

  if (isLoading) {
    return <MerchantProfileLoading onBack={() => navigation.goBack()} />;
  }

  if (isError || !merchant) {
    return <MerchantProfileError onBack={() => navigation.goBack()} />;
  }

  return (
    <MerchantProfileScaffold
      merchant={merchant}
      amountPresets={amountPresets}
      selectedAmountCents={selectedAmountCents}
      onBack={() => navigation.goBack()}
      onSelectAmount={handleSelectAmount}
      onOtherAmount={handleOtherAmount}
    >
      <Button
        label="Iniciar sesión para comprar"
        onPress={() => goToAuth(selectedAmountCents)}
        variant="primary"
      />
    </MerchantProfileScaffold>
  );
};

export default GuestMerchantProfileScreen;
