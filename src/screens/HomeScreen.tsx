import React, { useEffect, useRef, useState, useMemo } from "react";
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { CompositeNavigationProp, useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import Button from "../ui/components/Button";
import MerchantGridCard from "../ui/components/MerchantGridCard";
import { EmptyStateCard, SkeletonBlock } from "../ui/components/StateViews";
import { theme } from "../ui/theme";
import { giftCardApi, merchantsApi, meApi } from "../api/endpoints";
import { AppTabsParamList, HomeStackParamList } from "../navigation";
import { useAuth } from "../auth/authStore";
import TopNavBar from "../ui/components/TopNavBar";
import { formatMoney } from "../utils/money";
import { GiftCard, Merchant } from "../types/api";
import { CATEGORIES } from "../constants/categories";

const heroImage = require("../../assets/home-hero.png");

type MerchantAggregate = {
  id: string;
  name: string;
  logoUrl?: string | null;
  count: number;
  totalRemainingCents: number;
  currencies: Set<string>;
};

type MerchantCardItem = {
  id: string;
  name: string;
  logoUrl?: string | null;
  countLabel: string;
  amountLabel: string;
};

const HomeScreen: React.FC = () => {
  type NavProps = CompositeNavigationProp<
    NativeStackNavigationProp<HomeStackParamList>,
    BottomTabNavigationProp<AppTabsParamList>
  >;

  const navigation = useNavigation<NavProps>();
  const { accessToken } = useAuth();
  const isQueryEnabled = !!accessToken;
  const { width } = useWindowDimensions();
  const numColumns = width >= 900 ? 3 : 2;

  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: meApi.me,
    enabled: isQueryEnabled
  });
  const { data: giftCards, isLoading: isLoadingGiftCards } = useQuery({
    queryKey: ["giftCards"],
    queryFn: giftCardApi.list,
    enabled: isQueryEnabled
  });
  const {
    data: merchants,
    isLoading: isLoadingMerchants,
    refetch: refetchMerchants
  } = useQuery<Merchant[]>({
    queryKey: ["merchants"],
    queryFn: merchantsApi.list,
    enabled: isQueryEnabled
  });

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const didAutoSelect = useRef(false);

  const merchantsList: Merchant[] = merchants ?? [];

  // Only show category chips for categories that have at least one merchant
  const availableCategories = useMemo(
    () => CATEGORIES.filter((cat) => merchantsList.some((m) => m.categories?.includes(cat.key))),
    [merchantsList]
  );

  // Client-side filter
  const filteredMerchants = useMemo(
    () =>
      selectedCategory
        ? merchantsList.filter((m) => m.categories?.includes(selectedCategory))
        : merchantsList,
    [merchantsList, selectedCategory]
  );

  // Auto-select first interest that has matching merchants
  useEffect(() => {
    if (didAutoSelect.current || !data?.interests?.length || !merchantsList.length) return;
    const firstMatch = data.interests.find((interest) =>
      merchantsList.some((m) => m.categories?.includes(interest))
    );
    if (firstMatch) {
      setSelectedCategory(firstMatch);
      didAutoSelect.current = true;
    }
  }, [data?.interests, merchantsList]);

  const merchantAggregates = deriveMerchantAggregates(giftCards ?? []);

  const merchantCards = merchantAggregates.map((agg: MerchantAggregate) => {
    const currencies = Array.from(agg.currencies);
    const hasMulti = currencies.length > 1;
    const currencyCode = currencies.length === 1 ? currencies[0] : undefined;
    const countLabel = `${agg.count} ${agg.count === 1 ? "tarjeta" : "tarjetas"}`;
    const amountLabel = hasMulti
      ? "Multi"
      : formatMoney(agg.totalRemainingCents / 100, currencyCode);
    return {
      id: agg.id,
      name: agg.name,
      logoUrl: agg.logoUrl,
      countLabel,
      amountLabel
    };
  });

  const isBusy = isLoading || !accessToken;
  const isMerchantBusy = isLoadingMerchants || !accessToken;
  const hasMerchants = filteredMerchants.length > 0;

  return (
    <Screen scrollable edges={["left", "right"]}>
      <TopNavBar />
      <Text style={styles.title}>Bienvenido</Text>
      <Text style={styles.subtitle}>Administra tus tarjetas y canjes fácilmente.</Text>

      <Card style={[styles.card, styles.heroCard]}>
        <Text style={styles.heroTitle}>Tarjetas de regalo digitales para lo esencial en Ecuador.</Text>
        <View style={styles.heroSubSection}>
          <Text style={styles.heroSubtitle}>Rápido. Seguro.</Text>

          <View style={styles.heroActionRow}>
            <View style={styles.heroImageWrap}>
              <Image source={heroImage} style={styles.heroImage} />
            </View>
          </View>
        </View>

        <View style={styles.flowSection}>
          <Text style={styles.flowTitle}>Cómo funciona</Text>
          <View style={styles.flowSteps}>
            <View style={styles.flowStep}>
              <Feather name="shopping-bag" size={28} color={theme.colors.secondary} />
              <Text style={styles.flowLabel}>Elige una{"\n"}tienda</Text>
            </View>
            <Feather name="arrow-right" size={20} color={theme.colors.navbarMuted} />
            <View style={styles.flowStep}>
              <Feather name="send" size={28} color={theme.colors.secondary} />
              <Text style={styles.flowLabel}>Envía la{"\n"}tarjeta</Text>
            </View>
            <Feather name="arrow-right" size={20} color={theme.colors.navbarMuted} />
            <View style={styles.flowStep}>
              <Feather name="map-pin" size={28} color={theme.colors.secondary} />
              <Text style={styles.flowLabel}>Gasta{"\n"}localmente</Text>
            </View>
          </View>
        </View>

        <Button
          label="Comprar tarjeta de regalo"
          onPress={() => navigation.navigate("BuyGiftCardStart")}
          variant="primary"
          style={styles.promoButton}
        />
      </Card>

      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.flowTitle}>Comercios</Text>
          {isMerchantBusy ? <Text style={styles.muted}>Cargando...</Text> : null}
        </View>

        {/* Category filter bar — only shown when merchants have categories */}
        {!isMerchantBusy && availableCategories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterBar}
            style={styles.filterBarWrapper}
          >
            <Pressable
              onPress={() => setSelectedCategory(null)}
              style={[styles.filterChip, selectedCategory === null && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, selectedCategory === null && styles.filterChipTextActive]}>
                Todos
              </Text>
            </Pressable>
            {availableCategories.map((cat) => (
              <Pressable
                key={cat.key}
                onPress={() => setSelectedCategory(selectedCategory === cat.key ? null : cat.key)}
                style={[styles.filterChip, selectedCategory === cat.key && styles.filterChipActive]}
              >
                <Text style={styles.filterChipEmoji}>{cat.emoji}</Text>
                <Text style={[styles.filterChipText, selectedCategory === cat.key && styles.filterChipTextActive]}>
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {isMerchantBusy ? (
          <View style={styles.gridSkeletons}>
            {Array.from({ length: numColumns * 2 }).map((_, idx) => (
              <SkeletonTile key={`skeleton-${idx}`} wide={numColumns === 3} />
            ))}
          </View>
        ) : hasMerchants ? (
          <FlatList
            data={filteredMerchants}
            numColumns={numColumns}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={numColumns > 1 ? styles.gridColumn : undefined}
            ItemSeparatorComponent={() => <View style={{ height: theme.spacing(1) }} />}
            renderItem={({ item }) => (
              <View style={styles.gridItem}>
                <MerchantGridCard
                  merchantId={item.id}
                  name={item.store_name || item.name}
                  logoUrl={item.logo_url}
                  onPress={() => {
                    navigation.navigate("MerchantProfile", { id: item.id });
                  }}
                />
              </View>
            )}
          />
        ) : (
          <EmptyStateCard
            icon="shopping-bag"
            title={selectedCategory ? "No hay comercios en esta categoría" : "No hay comercios disponibles"}
            message={
              selectedCategory
                ? "Prueba con otra categoría o vuelve a ver todos los comercios."
                : "Los comercios aparecerán aquí cuando estén disponibles."
            }
            actionLabel={selectedCategory ? "Ver todos" : "Reintentar"}
            onAction={() => {
              if (selectedCategory) {
                setSelectedCategory(null);
                return;
              }
              void refetchMerchants();
            }}
          />
        )}
      </View>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Cuenta</Text>
        {isBusy ? (
          <AccountSkeleton />
        ) : data ? (
          <>
            <View style={styles.userInfo}>
              <Text style={styles.name}>{data.name ?? "Usuario anónimo"}</Text>
              <Text style={styles.email}>{data.email}</Text>
              {data.phone ? <Text style={styles.muted}>{data.phone}</Text> : null}
            </View>
            <Button
              label="Editar perfil"
              onPress={() => navigation.navigate("ProfileTab", { screen: "EditProfile" })}
              variant="secondary"
              style={styles.button}
              disabled={isBusy}
            />
          </>
        ) : (
          <Text style={styles.muted}>No pudimos obtener tu perfil.</Text>
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Acciones rápidas</Text>
        <Button
          label="Abrir billetera"
          onPress={() => navigation.navigate("WalletTab")}
          variant="primary"
          style={styles.button}
        />
      </Card>
    </Screen>
  );
};

const pickMerchantName = (card: GiftCard) =>
  card.merchant_store_name?.trim() ||
  card.store_name?.trim() ||
  card.merchant_name?.trim() ||
  card.merchant?.name?.trim?.() ||
  card.store?.name?.trim?.() ||
  card.name?.trim() ||
  "Comercio";

const buildMerchantKey = (card: GiftCard, displayName: string) =>
  card.merchant_id ??
  `${card.merchant_logo_url ?? "no-logo"}|${card.merchant_name ?? ""}|${card.store_name ?? ""}|${displayName}`;

const deriveMerchantAggregates = (giftCards: GiftCard[]): MerchantAggregate[] => {
  const map = new Map<string, MerchantAggregate>();

  giftCards.forEach((card) => {
    const displayName = pickMerchantName(card);
    const key = buildMerchantKey(card, displayName);
    const existing = map.get(key);

    const next: MerchantAggregate = existing ?? {
      id: key,
      name: displayName,
      logoUrl: card.merchant_logo_url ?? null,
      count: 0,
      totalRemainingCents: 0,
      currencies: new Set<string>()
    };

    next.count += 1;
    if (typeof card.remaining_balance_cents === "number" && Number.isFinite(card.remaining_balance_cents)) {
      next.totalRemainingCents += card.remaining_balance_cents;
    }
    if (card.currency) {
      next.currencies.add(card.currency);
    }
    if (!next.logoUrl && card.merchant_logo_url) {
      next.logoUrl = card.merchant_logo_url;
    }

    map.set(key, next);
  });

  return Array.from(map.values());
};

const SkeletonTile: React.FC<{ wide: boolean; key?: React.Key }> = ({ wide }) => (
  <View style={[styles.skeletonCard, wide ? styles.skeletonThird : undefined]} />
);

const AccountSkeleton: React.FC = () => (
  <View style={styles.accountSkeleton}>
    <SkeletonBlock width="58%" height={22} radius={11} />
    <SkeletonBlock width="72%" height={18} radius={9} />
    <SkeletonBlock width="42%" height={18} radius={9} />
    <SkeletonBlock height={46} radius={theme.radius.md} style={styles.accountSkeletonButton} />
  </View>
);

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text
  },
  subtitle: {
    color: theme.colors.muted,
    // marginBottom: theme.spacing(1)
  },
  heroCard: {
    gap: theme.spacing(2),
    marginBottom: theme.spacing(1)
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: theme.fonts.extraBold,
    lineHeight: 36,
    color: theme.colors.text
  },
  heroSubSection: {
    gap: theme.spacing(0.4)
  },
  heroSubtitle: {
    fontSize: 20,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text
  },
  heroActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(0.75),
    paddingVertical: 0,
  },
  heroButton: {
    flexShrink: 0
  },
  heroImageWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing(1.5),
    marginBottom: -theme.spacing(5)
  }, 
  heroImage: {
    width: 220,
    height: 180,
    resizeMode: "contain"
  },
  flowSection: {
    gap: theme.spacing(1)
  },
  flowTitle: {
    fontSize: theme.typography.subheading,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text
  },
  flowSteps: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    // gap: theme.spacing(1)
  },
  flowStep: {
    alignItems: "center",
    gap: theme.spacing(0.5),
    flexGrow: 1,
    minWidth: 90
  },
  flowLabel: {
    color: theme.colors.text,
    textAlign: "center",
    fontSize: theme.typography.small
  },
  promoButton: {
    marginTop: theme.spacing(1)
  },
  card: {
    marginTop: theme.spacing(1.5)
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(1)
  },
  gridContent: {
    gap: theme.spacing(1)
  },
  gridColumn: {
    gap: theme.spacing(1)
  },
  gridItem: {
    flex: 1
  },
  filterBarWrapper: {
    marginBottom: theme.spacing(1.5)
  },
  filterBar: {
    flexDirection: "row",
    gap: theme.spacing(0.75),
    paddingVertical: theme.spacing(0.25)
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(0.5),
    paddingVertical: theme.spacing(0.6),
    paddingHorizontal: theme.spacing(1.25),
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background
  },
  filterChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary
  },
  filterChipEmoji: {
    fontSize: 14
  },
  filterChipText: {
    fontSize: theme.typography.small,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text
  },
  filterChipTextActive: {
    color: theme.colors.secondary
  },
  gridSkeletons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing(1)
  },
  skeletonCard: {
    flexBasis: "48%",
    height: 124,
    borderRadius: 20,
    backgroundColor: theme.colors.card,
    borderWidth: 1.5,
    borderColor: "rgba(252, 165, 15, 0.35)"
  },
  skeletonThird: {
    flexBasis: "31%"
  },
  accountSkeleton: {
    gap: theme.spacing(0.85)
  },
  accountSkeletonButton: {
    marginTop: theme.spacing(0.75)
  },
  sectionTitle: {
    fontSize: theme.typography.subheading,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text,
    marginBottom: theme.spacing(1)
  },
  muted: {
    color: theme.colors.muted
  },
  userInfo: {
    gap: theme.spacing(0.5)
  },
  name: {
    fontSize: theme.typography.subheading,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text
  },
  email: {
    color: theme.colors.muted
  },
  button: {
    marginTop: theme.spacing(1)
  }
});

export default HomeScreen;
