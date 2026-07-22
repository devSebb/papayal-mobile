import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  RouteProp
} from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import Screen from "../ui/components/Screen";
import Button from "../ui/components/Button";
import AppHeader from "../ui/components/AppHeader";
import MerchantGiftCardHero from "../ui/components/MerchantGiftCardHero";
import { EmptyStateCard, SkeletonBlock } from "../ui/components/StateViews";
import { theme } from "../ui/theme";
import { merchantsApi } from "../api/endpoints";
import { AppTabsParamList, HomeStackParamList } from "../navigation";
import { CATEGORY_MAP } from "../constants/categories";
import { Merchant } from "../types/api";
import {
  GIFT_CARD_MAX_AMOUNT_USD as MAX_AMOUNT,
  GIFT_CARD_MIN_AMOUNT_USD as MIN_AMOUNT
} from "../domain/purchase/giftCardAmountLimits";
import { usePurchaseDraft } from "../domain/purchase/purchaseDraftStore";
import { centsToDollars, formatMoney } from "../utils/money";

type RouteProps = RouteProp<HomeStackParamList, "MerchantProfile">;
type NavProps = NativeStackNavigationProp<HomeStackParamList, "MerchantProfile">;
type TabNavProps = BottomTabNavigationProp<AppTabsParamList>;

type CoverageInfo = {
  icon: keyof typeof Feather.glyphMap;
  text: string;
};

const FALLBACK_PRESETS_USD = [5, 10, 25];
const TAB_BAR_DEFAULT_STYLE = {
  position: "absolute" as const,
  elevation: 0,
  borderTopWidth: 0
};
const TRUST_PILLS: { icon: keyof typeof Feather.glyphMap; label: string }[] = [
  { icon: "shield", label: "Seguro" },
  { icon: "check-circle", label: "Confiable" },
  { icon: "zap", label: "Rápido" }
];
const HOW_IT_WORKS: { icon: keyof typeof Feather.glyphMap; title: string; text: string }[] = [
  { icon: "tag", title: "Eliges el monto", text: "Define cuánto quieres enviar." },
  { icon: "message-square", title: "Tu familia recibe un código", text: "Lo recibe listo para usar." },
  { icon: "check-circle", title: "Lo canjea en el local", text: "Presenta el código al pagar." }
];

const MerchantProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavProps>();
  const tabNavigation = navigation.getParent<TabNavProps>();
  const route = useRoute<RouteProps>();
  const insets = useSafeAreaInsets();
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
  const categoriesLabel = categorySubtitle(merchant);
  const amountPresets = useMemo(() => resolveAmountPresets(merchant), [merchant]);
  const lowestPreset = amountPresets[0] ?? MIN_AMOUNT * 100;
  const coverage = coverageInfo(merchant, displayName);
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
    return (
      <Screen style={styles.screen} edges={["top", "left", "right"]}>
        <AppHeader onBack={() => navigation.goBack()} showBackLabel={false} style={styles.header} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 112 }]}
        >
          <View style={styles.loadingHeroBand}>
            <SkeletonBlock width="86%" height={170} radius={24} />
          </View>
          <SkeletonBlock width="68%" height={28} radius={14} style={styles.loadingLine} />
          <SkeletonBlock width="50%" height={18} radius={9} style={styles.loadingSmallLine} />
          <View style={styles.loadingChipRow}>
            <SkeletonBlock width={72} height={42} radius={21} />
            <SkeletonBlock width={72} height={42} radius={21} />
            <SkeletonBlock width={72} height={42} radius={21} />
            <SkeletonBlock width={82} height={42} radius={21} />
          </View>
          <SkeletonBlock height={112} radius={18} style={styles.loadingLine} />
          <SkeletonBlock height={84} radius={18} style={styles.loadingLine} />
        </ScrollView>
        <View style={[styles.ctaBar, { paddingBottom: insets.bottom + theme.spacing(1) }]}>
          <SkeletonBlock height={50} radius={theme.radius.lg} />
        </View>
      </Screen>
    );
  }

  if (isError || !merchant) {
    return (
      <Screen centerContent>
        <EmptyStateCard
          icon="alert-circle"
          title="No pudimos cargar el comercio"
          message="Revisa tu conexión e intenta abrirlo nuevamente."
          actionLabel="Volver"
          onAction={() => navigation.goBack()}
          style={styles.errorCard}
        />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen} edges={["top", "left", "right"]}>
      <AppHeader onBack={() => navigation.goBack()} showBackLabel={false} style={styles.header} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 118 }]}
      >
        <View style={styles.heroBand}>
          <MerchantGiftCardHero
            merchantName={displayName}
            logoUrl={merchant.logo_url}
          />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.storeName}>{displayName}</Text>
          <Text style={styles.categorySubtitle}>{categoriesLabel}</Text>
          <Text style={styles.brandLine}>Envía saldo a tu familia en Ecuador, al instante.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Elige el monto</Text>
          <View style={styles.amountRow}>
            {amountPresets.map((amountCents) => {
              const selected = selectedAmountCents === amountCents;
              return (
                <Pressable
                  key={amountCents}
                  onPress={() => handleSelectAmount(amountCents)}
                  style={[styles.amountChip, selected ? styles.amountChipSelected : null]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.amountChipLabel, selected ? styles.amountChipLabelSelected : null]}>
                    {amountLabel(amountCents)}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={handleOtherAmount}
              style={styles.amountChip}
              accessibilityRole="button"
              accessibilityLabel="Elegir otro monto"
            >
              <Text style={styles.amountChipLabel}>Otro</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.stepsStrip}>
          {HOW_IT_WORKS.map((step) => (
            <View key={step.title} style={styles.stepItem}>
              <View style={styles.stepIcon}>
                <Feather name={step.icon} size={18} color={theme.colors.secondary} />
              </View>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.trustRow}>
          {TRUST_PILLS.map((pill) => (
            <View key={pill.label} style={styles.trustPill}>
              <Feather name={pill.icon} size={15} color={theme.colors.secondary} />
              <Text style={styles.trustLabel}>{pill.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.coverageSection}>
          <Text style={styles.sectionTitle}>Canje</Text>
          <View style={styles.coverageRow}>
            <View style={styles.coverageIcon}>
              <Feather name={coverage.icon} size={19} color={theme.colors.primary} />
            </View>
            <Text style={styles.coverageText}>{coverage.text}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + theme.spacing(1) }]}>
        <Button
          label={
            selectedAmountUsd
              ? `Enviar ${amountLabel(selectedAmountCents)}`
              : `Enviar tarjeta · desde ${amountLabel(lowestPreset)}`
          }
          onPress={handlePrimaryAction}
          variant="primary"
        />
      </View>
    </Screen>
  );
};

const merchantDisplayName = (merchant?: Merchant | null) =>
  merchant ? merchant.store_name || merchant.name : "Comercio";

const categorySubtitle = (merchant?: Merchant | null) => {
  const labels =
    merchant?.categories
      ?.map((category) => CATEGORY_MAP[category]?.label ?? category)
      .filter(Boolean) ?? [];
  return labels.length > 0 ? labels.join(" · ") : "Tarjeta de regalo";
};

const resolveAmountPresets = (merchant?: Merchant | null) => {
  const rawPresets = merchant?.amountPresets ?? merchant?.amount_presets;
  const presets = rawPresets?.length ? rawPresets : FALLBACK_PRESETS_USD.map((amount) => amount * 100);
  const min = MIN_AMOUNT * 100;
  const max = MAX_AMOUNT * 100;
  const clean = Array.from(
    new Set(
      presets
        .map((amount) => Math.round(amount))
        .filter((amount) => Number.isFinite(amount) && amount >= min && amount <= max)
    )
  ).sort((a, b) => a - b);

  return clean.length > 0 ? clean : [min];
};

const coverageInfo = (merchant: Merchant | undefined | null, merchantName: string): CoverageInfo => {
  const coverageText = merchant?.coverageText ?? merchant?.coverage_text;
  if (coverageText?.trim()) {
    return { icon: "map-pin", text: coverageText.trim() };
  }

  const locationsCount = merchant?.locationsCount ?? merchant?.locations_count ?? null;
  if (typeof locationsCount === "number" && locationsCount > 1) {
    return { icon: "map", text: `Canjeable en ${locationsCount} locales en Ecuador.` };
  }

  if (merchant?.isNational || merchant?.is_national) {
    return { icon: "map", text: `Canjeable en locales de ${merchantName} en todo el Ecuador.` };
  }

  if (merchant?.address?.trim()) {
    return { icon: "map-pin", text: merchant.address.trim() };
  }

  return { icon: "map-pin", text: "Canjeable en comercios afiliados en Ecuador." };
};

const amountLabel = (amountCents: number | null) =>
  formatMoney(centsToDollars(amountCents) ?? 0, "USD");

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    paddingVertical: 0
  },
  header: {
    paddingHorizontal: theme.spacing(2),
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(0.5)
  },
  content: {
    paddingBottom: theme.spacing(12)
  },
  heroBand: {
    paddingHorizontal: theme.spacing(2),
    paddingTop: theme.spacing(1.5),
    paddingBottom: theme.spacing(1.75),
    backgroundColor: theme.colors.background
  },
  titleBlock: {
    paddingHorizontal: theme.spacing(2),
    paddingTop: theme.spacing(2),
    gap: theme.spacing(0.35)
  },
  storeName: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.black,
    fontSize: 28,
    lineHeight: 34
  },
  categorySubtitle: {
    color: theme.colors.captionMuted,
    fontFamily: theme.fonts.semiBold,
    fontSize: 15,
    lineHeight: 21
  },
  brandLine: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    fontSize: 17,
    lineHeight: 23,
    marginTop: theme.spacing(1)
  },
  section: {
    paddingHorizontal: theme.spacing(2),
    paddingTop: theme.spacing(2.5)
  },
  sectionTitle: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.extraBold,
    fontSize: 18,
    marginBottom: theme.spacing(1.25)
  },
  amountRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing(1)
  },
  amountChip: {
    minHeight: 42,
    minWidth: 66,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing(1.6)
  },
  amountChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  amountChipLabel: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.extraBold,
    fontSize: 16
  },
  amountChipLabelSelected: {
    color: theme.colors.secondary
  },
  stepsStrip: {
    marginTop: theme.spacing(2.5),
    marginHorizontal: theme.spacing(2),
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.68)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.cardBorder,
    padding: theme.spacing(1.25),
    gap: theme.spacing(1)
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1),
    minHeight: 48
  },
  stepIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7E6"
  },
  stepTitle: {
    flex: 0.95,
    color: theme.colors.secondary,
    fontFamily: theme.fonts.extraBold,
    fontSize: 14,
    lineHeight: 18
  },
  stepText: {
    flex: 1.1,
    color: theme.colors.captionMuted,
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    lineHeight: 18
  },
  trustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing(0.75),
    paddingHorizontal: theme.spacing(2),
    paddingTop: theme.spacing(2)
  },
  trustPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(0.45),
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.cardBorder,
    paddingVertical: theme.spacing(0.75),
    paddingHorizontal: theme.spacing(1.1)
  },
  trustLabel: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.bold,
    fontSize: 13
  },
  coverageSection: {
    paddingHorizontal: theme.spacing(2),
    paddingTop: theme.spacing(2.5)
  },
  coverageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1),
    paddingVertical: theme.spacing(1.25),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.cardBorder
  },
  coverageIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7E6"
  },
  coverageText: {
    flex: 1,
    color: theme.colors.text,
    fontFamily: theme.fonts.semiBold,
    fontSize: 15,
    lineHeight: 21
  },
  ctaBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.cardBorder,
    paddingTop: theme.spacing(1),
    paddingHorizontal: theme.spacing(2),
    shadowColor: theme.colors.secondary,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 12
  },
  loadingHeroBand: {
    alignItems: "center",
    paddingHorizontal: theme.spacing(2),
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2.5),
    backgroundColor: "rgba(13, 47, 50, 0.08)"
  },
  loadingLine: {
    marginHorizontal: theme.spacing(2),
    marginTop: theme.spacing(2)
  },
  loadingSmallLine: {
    marginHorizontal: theme.spacing(2),
    marginTop: theme.spacing(0.75)
  },
  loadingChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    marginTop: theme.spacing(2),
    paddingHorizontal: theme.spacing(2)
  },
  errorCard: {
    width: "100%"
  }
});

export default MerchantProfileScreen;
