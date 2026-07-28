import React, { useCallback, useMemo, useState } from "react";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  RouteProp
} from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";

import Button from "../ui/components/Button";
import { merchantsApi } from "../api/endpoints";
import { AppTabsParamList, HomeStackParamList } from "../navigation";
import { usePurchaseDraft } from "../domain/purchase/purchaseDraftStore";
import { GIFT_CARD_MIN_AMOUNT_USD as MIN_AMOUNT } from "../domain/purchase/giftCardAmountLimits";
import {
  MerchantProfileError,
  MerchantProfileLoading,
  MerchantProfileScaffold,
  amountLabel,
  merchantDisplayName,
  resolveAmountPresets
} from "./merchant/merchantProfileUi";

type RouteProps = RouteProp<HomeStackParamList, "MerchantProfile">;
type NavProps = NativeStackNavigationProp<HomeStackParamList, "MerchantProfile">;
type TabNavProps = BottomTabNavigationProp<AppTabsParamList>;

const TAB_BAR_DEFAULT_STYLE = {
  position: "absolute" as const,
  elevation: 0,
  borderTopWidth: 0
};

const MerchantProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavProps>();
  const tabNavigation = navigation.getParent<TabNavProps>();
  const route = useRoute<RouteProps>();
  const { setMerchant, setAmount } = usePurchaseDraft();
  const { id } = route.params;
  const [selectedAmountCents, setSelectedAmountCents] = useState<number | null>(null);

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
    queryKey: ["merchant", id],
    queryFn: () => merchantsApi.detail(id),
    enabled: !!id
  });

  const displayName = merchantDisplayName(merchant);
  const amountPresets = useMemo(() => resolveAmountPresets(merchant), [merchant]);
  const lowestPreset = amountPresets[0] ?? MIN_AMOUNT * 100;
  const selectedAmountUsd = selectedAmountCents ? selectedAmountCents / 100 : null;

  const seedMerchant = useCallback(
    (amountCents: number | null) => {
      if (!merchant) return;
      setMerchant({
        id: merchant.id,
        name: displayName,
        logoUrl: merchant.logo_url ?? null
      });
      setAmount(amountCents, "USD");
    },
    [displayName, merchant, setAmount, setMerchant]
  );

  const handleSelectAmount = (amountCents: number) => {
    setSelectedAmountCents(amountCents);
    seedMerchant(amountCents);
  };

  const handleOtherAmount = () => {
    if (!merchant) return;
    setSelectedAmountCents(null);
    seedMerchant(null);
    navigation.navigate("BuyGiftCardStart", { merchantId: merchant.id });
  };

  const handlePrimaryAction = () => {
    if (!merchant) return;
    if (!selectedAmountCents) {
      seedMerchant(null);
      navigation.navigate("BuyGiftCardStart", { merchantId: merchant.id });
      return;
    }

    seedMerchant(selectedAmountCents);
    navigation.navigate("DeliveryProfile");
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
        label={
          selectedAmountUsd
            ? `Enviar ${amountLabel(selectedAmountCents)}`
            : `Enviar tarjeta · desde ${amountLabel(lowestPreset)}`
        }
        onPress={handlePrimaryAction}
        variant="primary"
      />
    </MerchantProfileScaffold>
  );
};

export default MerchantProfileScreen;
