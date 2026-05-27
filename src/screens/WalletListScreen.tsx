import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import TopNavBar from "../ui/components/TopNavBar";
import { EmptyStateCard, SkeletonBlock } from "../ui/components/StateViews";
import { theme } from "../ui/theme";
import { giftCardApi, meApi } from "../api/endpoints";
import { AppTabsParamList, WalletStackParamList } from "../navigation";
import { useAuth } from "../auth/authStore";
import { centsToDollars, formatMoney } from "../utils/money";
import { mapGiftCardVM } from "../domain/wallet/mapGiftCardVM";
import { classifyGiftCards } from "../domain/wallet/classifyGiftCards";
import { buildActivityFeed } from "../domain/wallet/buildActivityFeed";
import { ActivityItem, GiftCardVM, TabKey } from "../domain/wallet/types";
import { GiftCard } from "../types/api";

const walletDecorationImage = require("../../assets/wallet-decoration.png");

const WALLET_CARD_BG = "#F5EEDC";
const WALLET_HEADING = "#2D3E50";

/** Same top/bottom inset so "Total Disponible" and "Tarjetas Activas" align across columns */
const WALLET_SUMMARY_PAD_V = theme.spacing(1.5);
const WALLET_SUMMARY_LABEL_VALUE_GAP = theme.spacing(0.75);

const SUMMARY_L_STROKE = 2.5;
const SUMMARY_L_RADIUS = 14;
const CARD_ACCENT_STROKE = 4;

const SummaryLeftWithGradientBorder: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const idBase = useId().replace(/:/g, "");
  const gradVertical = `${idBase}-sv`;
  const gradHorizontal = `${idBase}-sh`;

  const paths = useMemo(() => {
    const { w, h } = box;
    if (w <= 0 || h <= 0) return { vertical: "", bottom: "" };
    const s = SUMMARY_L_STROKE / 2;
    const r = SUMMARY_L_RADIUS;
    const x = w - s;
    const y = h - s;
    const vertical = `M ${x} 0 L ${x} ${y - r}`;
    const bottom = `M ${x} ${y - r} A ${r} ${r} 0 0 1 ${w - r - s} ${y} L 0 ${y}`;
    return { vertical, bottom };
  }, [box]);

  return (
    <View
      style={styles.summaryLeftOuter}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setBox({ w: width, h: height });
      }}
    >
      {box.w > 0 && box.h > 0 ? (
        <Svg
          width={box.w}
          height={box.h}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Defs>
            <LinearGradient
              id={gradVertical}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
              gradientUnits="objectBoundingBox"
            >
              <Stop offset="0%" stopColor={theme.colors.background} />
              <Stop offset="100%" stopColor={theme.colors.primary} />
            </LinearGradient>
            <LinearGradient
              id={gradHorizontal}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
              gradientUnits="objectBoundingBox"
            >
              <Stop offset="0%" stopColor={theme.colors.background} />
              <Stop offset="100%" stopColor={theme.colors.primary} />
            </LinearGradient>
          </Defs>
          <Path
            d={paths.vertical}
            stroke={`url(#${gradVertical})`}
            strokeWidth={SUMMARY_L_STROKE}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d={paths.bottom}
            stroke={`url(#${gradHorizontal})`}
            strokeWidth={SUMMARY_L_STROKE}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      ) : null}
      <View style={styles.summaryLeftInner}>{children}</View>
    </View>
  );
};

const GiftCardRightGradientAccent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const uid = useId().replace(/:/g, "");
  const gradId = `${uid}-card`;

  const x = box.w > 0 ? box.w - CARD_ACCENT_STROKE / 2 : 0;

  return (
    <View
      style={styles.cardAccentWrap}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setBox({ w: width, h: height });
      }}
    >
      {children}
      {box.w > 0 && box.h > 0 ? (
        <Svg
          width={box.w}
          height={box.h}
          style={[StyleSheet.absoluteFill, styles.cardAccentSvg]}
          pointerEvents="none"
        >
          <Defs>
            <LinearGradient
              id={gradId}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
              gradientUnits="objectBoundingBox"
            >
              <Stop offset="0%" stopColor={theme.colors.background} />
              <Stop offset="100%" stopColor={theme.colors.primary} />
            </LinearGradient>
          </Defs>
          <Path
            d={`M ${x} 0 L ${x} ${box.h}`}
            stroke={`url(#${gradId})`}
            strokeWidth={CARD_ACCENT_STROKE}
            fill="none"
            strokeLinecap="butt"
          />
        </Svg>
      ) : null}
    </View>
  );
};

const PAGE_SIZE = 6;
const TAB_LABELS: Record<TabKey, string> = {
  all: "Todas",
  received: "Recibidas",
  sent: "Enviadas",
  redeemed: "Canjeadas"
};

const statusStyles = {
  Active: {
    backgroundColor: "#E6F4EC",
    borderColor: "#CDE7D8",
    color: theme.colors.success
  },
  Redeemed: {
    backgroundColor: "#F3F4F6",
    borderColor: theme.colors.border,
    color: theme.colors.muted
  },
  Expired: {
    backgroundColor: "#F3F4F6",
    borderColor: theme.colors.border,
    color: theme.colors.muted
  }
} as const;

const statusLabels: Record<GiftCardVM["status"], string> = {
  Active: "Activa",
  Redeemed: "Inactiva",
  Expired: "Inactiva"
};

const iconForActivity: Record<ActivityItem["kind"], { name: keyof typeof Feather.glyphMap; color: string }> = {
  redeemed: { name: "shopping-bag", color: theme.colors.primary },
  expired: { name: "clock", color: theme.colors.danger },
  added: { name: "gift", color: theme.colors.secondary },
  received: { name: "arrow-down-left", color: theme.colors.secondary },
  sent: { name: "arrow-up-right", color: theme.colors.secondary }
};

const sortValueForCard = (card: GiftCard) => {
  const candidate = card.updated_at ?? card.created_at ?? card.expires_at;
  const parsed = candidate ? Date.parse(candidate) : NaN;
  if (!Number.isNaN(parsed)) return parsed;
  const numericId = Number.parseInt(card.id, 10);
  return Number.isNaN(numericId) ? 0 : numericId;
};

const formatTimestamp = (timestamp?: string) => {
  if (!timestamp) return "Reciente";
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return "Reciente";
  const date = new Date(parsed);
  return date.toLocaleDateString("es", { month: "short", day: "numeric", year: "numeric" });
};

const shortName = (full: string) => {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1
    ? parts[0] + " " + parts[parts.length - 1][0] + "."
    : parts[0];
};

const SummaryBanner: React.FC<{
  balanceLabel: string | null;
  activeCardsCount: number;
}> = ({ balanceLabel, activeCardsCount }) => (
  <View style={styles.walletStrip}>
    <View style={styles.walletMainRow}>
      <SummaryLeftWithGradientBorder>
        <Text style={styles.summaryBalanceLabel}>Total Disponible</Text>
        <Text style={styles.summaryBalanceValue}>{balanceLabel ?? "—"}</Text>
      </SummaryLeftWithGradientBorder>
      <View style={styles.activeCardsCard}>
        <View style={styles.activeCardsTextBlock}>
          <Text style={styles.activeCardsLabel}>Tarjetas Activas</Text>
          <Text style={styles.activeCardsValue}>{activeCardsCount}</Text>
        </View>
        <Image source={walletDecorationImage} style={styles.walletDecoration} />
      </View>
    </View>
  </View>
);

const TabButton: React.FC<{ tab: TabKey; active: boolean; onPress: () => void }> = ({
  tab,
  active,
  onPress
}) => (
  <TouchableOpacity
    style={[styles.tab, active ? styles.tabActive : null]}
    accessibilityRole="tab"
    accessibilityState={{ selected: active }}
    onPress={onPress}
  >
    <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>{TAB_LABELS[tab]}</Text>
  </TouchableOpacity>
);

const GiftCardRow: React.FC<{ item: GiftCardVM; senderName?: string; onPress: () => void }> = ({
  item,
  senderName,
  onPress
}) => {
  const statusStyle = statusStyles[item.status];
  const merchantInitial = item.merchantLabel.charAt(0).toUpperCase();
  const hasLogo = Boolean(item.merchantLogoUrl);
  const logoSource = hasLogo ? { uri: item.merchantLogoUrl as string } : null;
  const statusLabel = statusLabels[item.status] ?? item.status;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.row}>
      <GiftCardRightGradientAccent>
        <Card style={styles.cardWithAccent}>
          <View style={styles.rowTop}>
            <View style={styles.merchantLogoContainer}>
              {logoSource ? (
                <Image source={logoSource} style={styles.merchantLogoImage} />
              ) : (
                <Text style={styles.badgeInitial}>{merchantInitial}</Text>
              )}
            </View>
            <View style={styles.rowMiddle}>
              <Text style={styles.merchantTitle} numberOfLines={1}>
                {item.merchantLabel}
              </Text>
              <View style={styles.senderRow}>
                <Text style={styles.senderLabel}>
                  {senderName ? `de: ${senderName}` : "Propia"}
                </Text>
                <View style={[styles.statusPill, { backgroundColor: statusStyle.backgroundColor, borderColor: statusStyle.borderColor }]}>
                  <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusLabel}</Text>
                </View>
              </View>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.amountColumn}>
              <Text style={styles.amount}>{item.remainingFormatted}</Text>
              <Text style={styles.muted}>de {item.originalFormatted}</Text>
            </View>
          </View>
        </Card>
      </GiftCardRightGradientAccent>
    </TouchableOpacity>
  );
};

type ListItem =
  | { type: "card"; key: string; card: GiftCardVM }
  | { type: "empty"; key: string }
  | { type: "skeleton"; key: string }
  | { type: "activity"; key: string }
  | { type: "pagination"; key: string };

const PaginationControls: React.FC<{
  page: number;
  pageCount: number;
  start: number;
  end: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}> = ({ page, pageCount, start, end, total, onPrev, onNext }) => (
  <View style={styles.paginationContainer}>
    <TouchableOpacity
      style={[styles.paginationButton, page === 1 ? styles.paginationButtonDisabled : null]}
      onPress={onPrev}
      disabled={page === 1}
      accessibilityLabel="Página anterior"
    >
      <Feather
        name="chevron-left"
        size={16}
        color={page === 1 ? theme.colors.muted : theme.colors.text}
      />
      <Text style={[styles.paginationButtonLabel, page === 1 ? styles.muted : null]}>Anterior</Text>
    </TouchableOpacity>
    <Text style={styles.paginationLabel}>
      {start}-{end} de {total}
    </Text>
    <TouchableOpacity
      style={[styles.paginationButton, page === pageCount ? styles.paginationButtonDisabled : null]}
      onPress={onNext}
      disabled={page === pageCount}
      accessibilityLabel="Página siguiente"
    >
      <Text style={[styles.paginationButtonLabel, page === pageCount ? styles.muted : null]}>Siguiente</Text>
      <Feather
        name="chevron-right"
        size={16}
        color={page === pageCount ? theme.colors.muted : theme.colors.text}
      />
    </TouchableOpacity>
  </View>
);

const LatestActivitySection: React.FC<{
  items: ActivityItem[];
  onSeeAll: () => void;
  onPressItem: (cardId: string) => void;
}> = ({ items, onSeeAll, onPressItem }) => (
  <View style={styles.activitySection}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Actividad reciente</Text>
      <TouchableOpacity onPress={onSeeAll}>
        <Text style={styles.link}>Ver todo</Text>
      </TouchableOpacity>
    </View>
    {items.length === 0 ? (
      <Text style={styles.muted}>Aún no hay actividad.</Text>
    ) : (
      items.map((item) => {
        const icon = iconForActivity[item.kind];
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.activityRow}
            onPress={() => onPressItem(item.cardId)}
          >
            <View style={[styles.iconCircle, { backgroundColor: `${icon.color}1A` }]}>
              <Feather name={icon.name} size={18} color={icon.color} />
            </View>
            <View style={styles.activityText}>
              <Text style={styles.activityTitle}>{item.title}</Text>
              <Text style={styles.activitySubtitle}>
                {item.subtitle ?? "Tarjeta de regalo"} • {formatTimestamp(item.timestamp)}
              </Text>
            </View>
            {item.amountLabel ? <Text style={styles.activityAmount}>{item.amountLabel}</Text> : null}
          </TouchableOpacity>
        );
      })
    )}
  </View>
);

const WalletSkeletonRows: React.FC = () => (
  <View style={styles.skeletonRows}>
    {Array.from({ length: 4 }).map((_, index) => (
      <Card key={`wallet-skeleton-${index}`} style={styles.cardWithAccent}>
        <View style={styles.rowTop}>
          <SkeletonBlock width={56} height={56} radius={16} />
          <View style={styles.rowMiddle}>
            <SkeletonBlock width="76%" height={18} radius={9} />
            <SkeletonBlock width="58%" height={28} radius={14} style={styles.skeletonLine} />
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.amountColumn}>
            <SkeletonBlock width={72} height={22} radius={11} />
            <SkeletonBlock width={48} height={16} radius={8} style={styles.skeletonLine} />
          </View>
        </View>
      </Card>
    ))}
  </View>
);

const EmptyState: React.FC<{
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({
  icon = "credit-card",
  title,
  message,
  actionLabel,
  onAction
}) => (
  <EmptyStateCard
    icon={icon}
    title={title}
    message={message}
    actionLabel={actionLabel}
    onAction={onAction}
  />
);

const WalletListScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<WalletStackParamList>>();
  const tabNavigation = navigation.getParent<NavigationProp<AppTabsParamList>>();
  const { accessToken } = useAuth();
  const tabBarHeight = useBottomTabBarHeight();
  const isQueryEnabled = !!accessToken;

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: meApi.me,
    enabled: isQueryEnabled
  });

  const {
    data: giftCards,
    isLoading,
    isRefetching,
    refetch
  } = useQuery({
    queryKey: ["giftCards"],
    queryFn: giftCardApi.list,
    enabled: isQueryEnabled
  });

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [pageByTab, setPageByTab] = useState<Record<TabKey, number>>({
    all: 1,
    received: 1,
    sent: 1,
    redeemed: 1
  });
  const listRef = useRef<FlatList<ListItem>>(null);

  useEffect(() => {
    setPageByTab({ all: 1, received: 1, sent: 1, redeemed: 1 });
  }, [giftCards]);

  const mappedCards = useMemo(() => {
    const now = new Date();
    return (giftCards ?? [])
      .slice()
      .sort((a, b) => sortValueForCard(b) - sortValueForCard(a))
      .map((card) => mapGiftCardVM(card, now));
  }, [giftCards]);

  const classification = useMemo(
    () => classifyGiftCards(mappedCards, user?.id),
    [mappedCards, user?.id]
  );

  const activityFeed = useMemo(
    () => buildActivityFeed(giftCards ?? [], user?.id).slice(0, 7),
    [giftCards, user?.id]
  );

  const senderNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const card of giftCards ?? []) {
      if (card.recipient_id === user?.id && card.sender) {
        const fullName =
          card.sender.full_name?.trim() ||
          [card.sender.name, card.sender.last_name].filter(Boolean).join(" ").trim() ||
          card.sender.name?.trim() ||
          null;
        if (fullName) {
          map.set(card.id, shortName(fullName));
        }
      }
    }
    return map;
  }, [giftCards, user?.id]);

  const summary = useMemo(() => {
    const activeCards = mappedCards.filter((card) => card.status === "Active");
    const activeWithAmounts = activeCards.filter(
      (card) => typeof card.remainingBalanceCents === "number" && !!card.currency
    );
    const currencies = new Set(
      activeWithAmounts.map((card) => card.currency).filter(Boolean) as string[]
    );
    const canShowActiveBalance =
      activeWithAmounts.length === activeCards.length &&
      activeWithAmounts.length > 0 &&
      currencies.size === 1;
    const activeBalanceCents = canShowActiveBalance
      ? activeWithAmounts.reduce((sum, card) => sum + (card.remainingBalanceCents ?? 0), 0)
      : null;
    const activeBalanceLabel =
      canShowActiveBalance && activeBalanceCents !== null
        ? formatMoney(centsToDollars(activeBalanceCents), activeWithAmounts[0]?.currency)
        : null;

    return {
      activeBalanceLabel,
      activeCardsCount: activeCards.length
    };
  }, [mappedCards]);

  const tabCards = classification[activeTab] ?? [];
  const totalCards = tabCards.length;
  const page = pageByTab[activeTab] ?? 1;
  const pageCount = Math.max(1, Math.ceil(totalCards / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalCards);
  const rangeStart = totalCards === 0 ? 0 : startIndex + 1;
  const rangeEnd = totalCards === 0 ? 0 : endIndex;
  const pagedCards = tabCards.slice(startIndex, endIndex);
  const isBusy = !isQueryEnabled || isLoading || isRefetching;
  const isInitialLoading = !isQueryEnabled || (isLoading && !giftCards);

  useEffect(() => {
    setPageByTab((prev) => {
      const current = prev[activeTab] ?? 1;
      const nextPage = Math.min(current, pageCount);
      if (nextPage === current) return prev;
      return { ...prev, [activeTab]: nextPage };
    });
  }, [activeTab, pageCount]);

  const listData = useMemo(() => {
    const items: ListItem[] = [];
    if (isInitialLoading) {
      items.push({ type: "skeleton", key: "wallet-skeleton" });
      return items;
    }
    if (pagedCards.length === 0) {
      items.push({ type: "empty", key: `empty-${activeTab}` });
    } else {
      pagedCards.forEach((card) => items.push({ type: "card", key: card.id, card }));
    }
    if (pageCount > 1) {
      items.push({ type: "pagination", key: `pagination-${activeTab}-${currentPage}` });
    }
    items.push({ type: "activity", key: `activity-${activeTab}` });
    return items;
  }, [activeTab, currentPage, isInitialLoading, pageCount, pagedCards]);

  const changePage = useCallback(
    (delta: number) => {
      setPageByTab((prev) => {
        const current = prev[activeTab] ?? 1;
        const next = Math.min(pageCount, Math.max(1, current + delta));
        if (next === current) return prev;
        return { ...prev, [activeTab]: next };
      });
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    },
    [activeTab, pageCount]
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <SummaryBanner
        balanceLabel={summary.activeBalanceLabel}
        activeCardsCount={summary.activeCardsCount}
      />
      <Text style={styles.sectionTitle}>Mis Tarjetas</Text>
      <View style={styles.tabsRow}>
        {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => (
          <TabButton
            key={tab}
            tab={tab}
            active={tab === activeTab}
            onPress={() => setActiveTab(tab)}
          />
        ))}
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === "activity") {
      return (
        <LatestActivitySection
          items={activityFeed}
          onSeeAll={() => navigation.navigate("Activity")}
          onPressItem={(cardId) => navigation.navigate("GiftCardDetail", { id: cardId })}
        />
      );
    }
    if (item.type === "pagination") {
      return (
        <PaginationControls
          page={currentPage}
          pageCount={pageCount}
          start={rangeStart}
          end={rangeEnd}
          total={totalCards}
          onPrev={() => changePage(-1)}
          onNext={() => changePage(1)}
        />
      );
    }
    if (item.type === "empty") {
      if (!classification.hasSenderRecipientFields && (activeTab === "received" || activeTab === "sent")) {
        return (
          <EmptyState
            icon="info"
            title="No podemos separar estas tarjetas todavía"
            message="Clasificar recibidas/enviadas requiere campos de remitente y destinatario."
            actionLabel="Ver todas"
            onAction={() => setActiveTab("all")}
          />
        );
      }
      if (!classification.canClassifyTransfers && (activeTab === "received" || activeTab === "sent")) {
        return (
          <EmptyState
            icon="user"
            title="Preparando tu clasificación"
            message="Estamos obteniendo los datos de tu cuenta para separar recibidas y enviadas."
          />
        );
      }
      return (
        <EmptyState
          icon="gift"
          title="Aún no hay tarjetas"
          message="Cuando compres o recibas una tarjeta, aparecerá en esta sección."
          actionLabel="Comprar tarjeta"
          onAction={() => tabNavigation?.navigate("HomeTab")}
        />
      );
    }
    if (item.type === "skeleton") {
      return <WalletSkeletonRows />;
    }
    if (item.type === "card") {
      return (
        <GiftCardRow
          item={item.card}
          senderName={senderNameMap.get(item.card.id)}
          onPress={() => navigation.navigate("GiftCardDetail", { id: item.card.id })}
        />
      );
    }
    return null;
  };

  return (
    <Screen style={styles.screen} edges={["left", "right"]}>
      <View style={styles.navContainer}>
        <TopNavBar />
      </View>
      <FlatList
        ref={listRef}
        data={listData}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        stickyHeaderIndices={[0]}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + theme.spacing(2) }]}
        refreshControl={
          <RefreshControl
            refreshing={isBusy}
            onRefresh={() => refetch()}
            tintColor={theme.colors.primary}
          />
        }
        initialNumToRender={12}
        removeClippedSubviews
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    paddingVertical: 0
  },
  navContainer: {
    paddingHorizontal: theme.spacing(2),
    paddingTop: theme.spacing(2)
  },
  list: {
    gap: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(2)
  },
  header: {
    backgroundColor: theme.colors.background,
    paddingTop: theme.spacing(0.5),
    paddingBottom: theme.spacing(1),
    gap: theme.spacing(1)
  },
  walletStrip: {
    paddingBottom: theme.spacing(2)
  },
  walletMainRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: theme.spacing(1.5)
  },
  summaryLeftOuter: {
    flex: 1,
    minWidth: 0,
    marginRight: theme.spacing(0.5),
    position: "relative"
  },
  summaryLeftInner: {
    paddingTop: WALLET_SUMMARY_PAD_V,
    paddingBottom: WALLET_SUMMARY_PAD_V,
    paddingRight: theme.spacing(1.75),
    paddingLeft: theme.spacing(0.25),
    gap: WALLET_SUMMARY_LABEL_VALUE_GAP
  },
  summaryBalanceLabel: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: WALLET_HEADING,
    letterSpacing: -0.2
  },
  summaryBalanceValue: {
    fontSize: 30,
    fontFamily: theme.fonts.extraBold,
    color: WALLET_HEADING,
    letterSpacing: -0.6
  },
  activeCardsCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: WALLET_CARD_BG,
    borderRadius: 14,
    paddingTop: WALLET_SUMMARY_PAD_V,
    paddingLeft: theme.spacing(1.5),
    paddingRight: theme.spacing(1.25),
    paddingBottom: WALLET_SUMMARY_PAD_V,
    overflow: "hidden",
    justifyContent: "flex-start"
  },
  activeCardsTextBlock: {
    gap: WALLET_SUMMARY_LABEL_VALUE_GAP
  },
  activeCardsLabel: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: WALLET_HEADING,
    letterSpacing: -0.2,
    zIndex: 1
  },
  activeCardsValue: {
    fontSize: 28,
    fontFamily: theme.fonts.extraBold,
    color: WALLET_HEADING,
    letterSpacing: -0.5,
    zIndex: 1
  },
  walletDecoration: {
    position: "absolute",
    right: -2,
    bottom: -8,
    width: 88,
    height: 88,
    opacity: 0.38,
    resizeMode: "contain"
  },
  tabsRow: {
    flexDirection: "row",
    gap: theme.spacing(1),
    marginLeft: theme.spacing(0.5)
  },
  tab: {
    paddingVertical: theme.spacing(0.8),
    paddingHorizontal: theme.spacing(1.4),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  tabActive: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary
  },
  tabLabel: {
    color: theme.colors.muted,
    fontFamily: theme.fonts.semiBold
  },
  tabLabelActive: {
    color: theme.colors.card
  },
  row: {
    width: "100%"
  },
  skeletonRows: {
    gap: theme.spacing(1.5)
  },
  skeletonLine: {
    marginTop: theme.spacing(0.6)
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1.2)
  },
  cardAccentWrap: {
    width: "100%",
    position: "relative"
  },
  cardAccentSvg: {
    zIndex: 2
  },
  cardWithAccent: {
    overflow: "hidden"
  },
  merchantLogoContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: "rgba(252, 165, 15, 0.32)",
    padding: theme.spacing(0.7)
  },
  merchantLogoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain"
  },
  badgeInitial: {
    textAlign: "center",
    fontFamily: theme.fonts.black,
    fontSize: 24,
    color: theme.colors.secondary
  },
  rowMiddle: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    gap: theme.spacing(0.25),
    minWidth: 0
  },
  merchantTitle: {
    fontSize: theme.typography.body,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text
  },
  senderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1)
  },
  cardDivider: {
    width: 2,
    alignSelf: "stretch",
    backgroundColor: theme.colors.primary,
    borderRadius: 1
  },
  senderLabel: {
    flexShrink: 0,
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.muted
  },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: theme.spacing(1),
    paddingVertical: theme.spacing(0.4),
    borderRadius: theme.radius.sm,
    borderWidth: 1
  },
  statusText: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.typography.small
  },
  amountColumn: {
    alignItems: "flex-end"
  },
  amount: {
    fontSize: 22,
    fontFamily: theme.fonts.extraBold,
    color: theme.colors.text
  },
  muted: {
    color: theme.colors.muted
  },
  activitySection: {
    gap: theme.spacing(1),
    marginTop: theme.spacing(1)
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionTitle: {
    fontSize: theme.typography.subheading,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    marginLeft: theme.spacing(0.5)
  },
  link: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.bold
  },
  paginationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing(1),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border
  },
  paginationLabel: {
    color: theme.colors.muted,
    fontFamily: theme.fonts.semiBold
  },
  paginationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(0.5),
    paddingHorizontal: theme.spacing(1.2),
    paddingVertical: theme.spacing(0.7),
    borderRadius: theme.radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background
  },
  paginationButtonDisabled: {
    opacity: 0.6
  },
  paginationButtonLabel: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bold
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1),
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing(1),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  activityText: {
    flex: 1
  },
  activityTitle: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.text
  },
  activitySubtitle: {
    color: theme.colors.muted,
    marginTop: 2
  },
  activityAmount: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.secondary
  },
});

export default WalletListScreen;
