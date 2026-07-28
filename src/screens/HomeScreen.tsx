import React, { useCallback, useMemo } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { CompositeNavigationProp, useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import Button from "../ui/components/Button";
import MerchantGridCard, {
  MERCHANT_SHELF_PAGE_PADDING,
  getMerchantShelfCardMetrics
} from "../ui/components/MerchantGridCard";
import HomeHeroCard from "../ui/components/HomeHeroCard";
import { EmptyStateCard, SkeletonBlock } from "../ui/components/StateViews";
import { theme } from "../ui/theme";
import { merchantsApi, meApi } from "../api/endpoints";
import { AppTabsParamList, HomeStackParamList } from "../navigation";
import { useAuth } from "../auth/authStore";
import TopNavBar from "../ui/components/TopNavBar";
import { Merchant } from "../types/api";
import { CATEGORIES } from "../constants/categories";

type CategoryShelf = {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  merchants: Merchant[];
};

type HomeListItem =
  | { type: "shelf"; key: string; shelf: CategoryShelf }
  | { type: "skeleton"; key: string };

const CATEGORY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  salud_y_medicina: "plus-circle",
  mascotas: "heart",
  servicios: "zap",
  supermercado: "shopping-cart",
  hogar: "home",
  tecnologia: "monitor",
  ropa_y_moda: "shopping-bag",
  belleza: "star",
  deportes_y_fitness: "activity",
  entretenimiento: "film",
  restaurantes: "coffee",
  educacion: "book-open",
  viajes: "map",
  bebes_y_ninos: "smile",
  otros: "grid"
};

const INCLUDE_UNCATEGORIZED_SHELF = true;

const HomeScreen: React.FC = () => {
  type NavProps = CompositeNavigationProp<
    NativeStackNavigationProp<HomeStackParamList>,
    BottomTabNavigationProp<AppTabsParamList>
  >;

  const navigation = useNavigation<NavProps>();
  const { accessToken } = useAuth();
  const isQueryEnabled = !!accessToken;

  const {
    data,
    isLoading,
    isRefetching: isRefetchingMe,
    refetch: refetchMe
  } = useQuery({
    queryKey: ["me"],
    queryFn: meApi.me,
    enabled: isQueryEnabled
  });
  const {
    data: merchants,
    isLoading: isLoadingMerchants,
    isRefetching: isRefetchingMerchants,
    refetch: refetchMerchants
  } = useQuery<Merchant[]>({
    queryKey: ["merchants"],
    queryFn: merchantsApi.list,
    enabled: isQueryEnabled
  });

  const merchantsList: Merchant[] = merchants ?? [];
  const isBusy = isLoading || !accessToken;
  const isMerchantBusy = isLoadingMerchants || !accessToken;
  const shelves = useMemo(
    () => buildMerchantShelves(merchantsList, data?.interests ?? []),
    [data?.interests, merchantsList]
  );
  const listData = useMemo<HomeListItem[]>(
    () =>
      isMerchantBusy
        ? Array.from({ length: 3 }, (_, index) => ({
            type: "skeleton" as const,
            key: `merchant-shelf-skeleton-${index}`
          }))
        : shelves.map((shelf) => ({ type: "shelf" as const, key: shelf.key, shelf })),
    [isMerchantBusy, shelves]
  );
  const refreshing = isRefetchingMe || isRefetchingMerchants;

  // Home only renders profile + merchant data, so pull-to-refresh refetches
  // exactly those; gift cards are fetched by the wallet screens that show them.
  const handleRefresh = useCallback(() => {
    void Promise.all([refetchMe(), refetchMerchants()]);
  }, [refetchMe, refetchMerchants]);

  const handlePressMerchant = useCallback(
    (merchant: Merchant) => {
      navigation.navigate("MerchantProfile", { id: merchant.id });
    },
    [navigation]
  );

  const renderHeader = useCallback(
    () => (
      <View style={styles.headerContent}>
        <TopNavBar />
        <Text style={styles.title}>Bienvenido</Text>
        <Text style={styles.subtitle}>Administra tus tarjetas y canjes fácilmente.</Text>

        <HomeHeroCard
          ctaLabel="Comprar tarjeta de regalo"
          onPressCta={() => navigation.navigate("BuyGiftCardStart")}
          style={styles.card}
        />
      </View>
    ),
    [navigation]
  );

  const renderFooter = useCallback(
    () => (
      <View style={styles.footerContent}>
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
      </View>
    ),
    [data, isBusy, navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: HomeListItem }) => {
      if (item.type === "skeleton") {
        return <MerchantShelfSkeleton />;
      }

      return <MerchantShelf shelf={item.shelf} onPressMerchant={handlePressMerchant} />;
    },
    [handlePressMerchant]
  );

  return (
    <Screen style={styles.screen} edges={["left", "right"]}>
      <FlatList
        data={listData}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          !isMerchantBusy ? (
            <View style={styles.emptyShelves}>
              <EmptyStateCard
                icon="shopping-bag"
                title="No hay comercios disponibles"
                message="Los comercios aparecerán aquí cuando estén disponibles."
                actionLabel="Reintentar"
                onAction={() => {
                  void refetchMerchants();
                }}
              />
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.shelfSeparator} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        initialNumToRender={4}
        removeClippedSubviews
        windowSize={7}
      />
    </Screen>
  );
};

const merchantDisplayName = (merchant: Merchant) => merchant.store_name || merchant.name;

const buildMerchantShelves = (merchants: Merchant[], interests: string[]): CategoryShelf[] => {
  const shelvesByKey = new Map<string, CategoryShelf>();
  const knownCategoryKeys = new Set<string>(CATEGORIES.map((category) => category.key));

  CATEGORIES.forEach((category) => {
    const categoryMerchants = merchants.filter((merchant) =>
      merchant.categories?.includes(category.key)
    );

    if (categoryMerchants.length === 0) return;

    shelvesByKey.set(category.key, {
      key: category.key,
      label: category.label,
      icon: CATEGORY_ICONS[category.key] ?? "grid",
      merchants: categoryMerchants
    });
  });

  if (INCLUDE_UNCATEGORIZED_SHELF) {
    const uncategorizedMerchants = merchants.filter(
      (merchant) =>
        !merchant.categories?.some((categoryKey) => knownCategoryKeys.has(categoryKey))
    );

    if (uncategorizedMerchants.length > 0) {
      shelvesByKey.set("otros", {
        key: "otros",
        label: "Otros",
        icon: CATEGORY_ICONS.otros,
        merchants: uncategorizedMerchants
      });
    }
  }

  const orderedKeys: string[] = [];
  interests.forEach((interest) => {
    if (shelvesByKey.has(interest) && !orderedKeys.includes(interest)) {
      orderedKeys.push(interest);
    }
  });
  CATEGORIES.forEach((category) => {
    if (shelvesByKey.has(category.key) && !orderedKeys.includes(category.key)) {
      orderedKeys.push(category.key);
    }
  });
  if (shelvesByKey.has("otros")) {
    orderedKeys.push("otros");
  }

  return orderedKeys
    .map((key) => shelvesByKey.get(key))
    .filter((shelf): shelf is CategoryShelf => Boolean(shelf));
};

const MerchantShelf: React.FC<{
  shelf: CategoryShelf;
  onPressMerchant: (merchant: Merchant) => void;
}> = React.memo(({ shelf, onPressMerchant }) => {
  const { width } = useWindowDimensions();
  const { cardWidth, cardHeight, cardGap, pagePadding } = getMerchantShelfCardMetrics(width);

  const renderMerchant = useCallback(
    ({ item }: { item: Merchant }) => (
      <MerchantGridCard
        merchantId={item.id}
        name={merchantDisplayName(item)}
        categoryLabel={shelf.label}
        logoUrl={item.logo_url}
        onPress={() => onPressMerchant(item)}
      />
    ),
    [onPressMerchant, shelf.label]
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<Merchant> | null | undefined, index: number) => ({
      length: cardWidth + cardGap,
      offset: (cardWidth + cardGap) * index,
      index
    }),
    [cardGap, cardWidth]
  );

  return (
    <View style={styles.shelf}>
      <View style={styles.shelfHeader}>
        <Feather name={shelf.icon} size={18} color={theme.colors.primary} />
        <Text style={styles.shelfTitle}>{shelf.label}</Text>
      </View>
      <FlatList
        horizontal
        data={shelf.merchants}
        keyExtractor={(item) => item.id}
        renderItem={renderMerchant}
        ItemSeparatorComponent={() => <View style={{ width: cardGap }} />}
        contentContainerStyle={{
          paddingLeft: pagePadding,
          paddingRight: pagePadding,
          paddingBottom: theme.spacing(0.75)
        }}
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + cardGap}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={getItemLayout}
        initialNumToRender={4}
        removeClippedSubviews
        windowSize={5}
        extraData={`${cardWidth}-${cardHeight}`}
      />
    </View>
  );
});

MerchantShelf.displayName = "MerchantShelf";

const MerchantShelfSkeleton: React.FC = () => {
  const { width } = useWindowDimensions();
  const { cardWidth, cardHeight, cardGap, pagePadding } = getMerchantShelfCardMetrics(width);

  return (
    <View style={styles.shelf}>
      <View style={styles.shelfSkeletonHeader}>
        <SkeletonBlock width={22} height={22} radius={11} />
        <SkeletonBlock width={140} height={18} radius={9} />
      </View>
      <View style={[styles.shelfSkeletonRow, { paddingLeft: pagePadding, paddingRight: pagePadding }]}>
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonBlock
            key={`shelf-card-skeleton-${index}`}
            width={cardWidth}
            height={cardHeight}
            radius={18}
            style={index > 0 ? { marginLeft: cardGap } : undefined}
          />
        ))}
      </View>
    </View>
  );
};

const AccountSkeleton: React.FC = () => (
  <View style={styles.accountSkeleton}>
    <SkeletonBlock width="58%" height={22} radius={11} />
    <SkeletonBlock width="72%" height={18} radius={9} />
    <SkeletonBlock width="42%" height={18} radius={9} />
    <SkeletonBlock height={46} radius={theme.radius.md} style={styles.accountSkeletonButton} />
  </View>
);

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    paddingVertical: 0
  },
  listContent: {
    paddingBottom: theme.spacing(18)
  },
  headerContent: {
    paddingHorizontal: MERCHANT_SHELF_PAGE_PADDING,
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2)
  },
  footerContent: {
    paddingHorizontal: MERCHANT_SHELF_PAGE_PADDING,
    paddingTop: theme.spacing(2)
  },
  title: {
    fontSize: 28,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text
  },
  subtitle: {
    color: theme.colors.muted
  },
  card: {
    marginTop: theme.spacing(1.5)
  },
  shelf: {
    width: "100%"
  },
  shelfHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(0.75),
    marginBottom: theme.spacing(1.5),
    paddingHorizontal: MERCHANT_SHELF_PAGE_PADDING
  },
  shelfTitle: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.extraBold,
    fontSize: 16
  },
  shelfSeparator: {
    height: theme.spacing(3)
  },
  shelfSkeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(0.75),
    marginBottom: theme.spacing(1.5),
    paddingHorizontal: MERCHANT_SHELF_PAGE_PADDING
  },
  shelfSkeletonRow: {
    flexDirection: "row"
  },
  emptyShelves: {
    paddingHorizontal: MERCHANT_SHELF_PAGE_PADDING
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
