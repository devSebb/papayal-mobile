import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import Button from "../ui/components/Button";
import TopNavBar from "../ui/components/TopNavBar";
import { theme } from "../ui/theme";
import { giftCardApi, meApi } from "../api/endpoints";
import { WalletStackParamList } from "../navigation";
import { useAuth } from "../auth/authStore";
import { centsToDollars, formatMoney } from "../utils/money";
import { mapGiftCardVM } from "../domain/wallet/mapGiftCardVM";
import { classifyGiftCards } from "../domain/wallet/classifyGiftCards";
import { buildActivityFeed } from "../domain/wallet/buildActivityFeed";
import { ActivityItem, GiftCardVM, TabKey } from "../domain/wallet/types";
import { GiftCard } from "../types/api";

const merchantPlaceholder = require("../../assets/merchant-default.png");

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
  totalCards: number;
  gastadoLabel: string | null;
}> = ({ balanceLabel, totalCards, gastadoLabel }) => (
  <View style={styles.summaryBanner}>
    <View style={styles.summaryLeft}>
      <Text style={styles.summaryBalanceLabel}>Saldo Disponible</Text>
      <Text style={styles.summaryBalanceValue}>{balanceLabel ?? "—"}</Text>
    </View>
    <View style={styles.summaryRight}>
      <View style={styles.summaryStatItem}>
        <Text style={styles.summaryStatLabel}>Tarjetas</Text>
        <Text style={styles.summaryStatValue}>{totalCards}</Text>
      </View>
      <View style={styles.summaryStatItem}>
        <Text style={styles.summaryStatLabel}>Gastado</Text>
        <Text style={styles.summaryStatValue}>{gastadoLabel ?? "—"}</Text>
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
  const logoSource = hasLogo ? { uri: item.merchantLogoUrl as string } : merchantPlaceholder;
  const statusLabel = statusLabels[item.status] ?? item.status;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.row}>
      <Card style={styles.cardWithAccent}>
        <View style={styles.rowTop}>
          <View style={styles.merchantLogoContainer}>
            <Image source={logoSource} style={styles.merchantLogoImage} />
            {!hasLogo ? <Text style={styles.badgeInitial}>{merchantInitial}</Text> : null}
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
    </TouchableOpacity>
  );
};

type ListItem =
  | { type: "card"; key: string; card: GiftCardVM }
  | { type: "empty"; key: string }
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

const EmptyState: React.FC<{ message: string; actionLabel?: string; onAction?: () => void }> = ({
  message,
  actionLabel,
  onAction
}) => (
  <Card style={styles.emptyCard}>
    <Text style={styles.muted}>{message}</Text>
    {actionLabel && onAction ? (
      <Button label={actionLabel} variant="ghost" onPress={onAction} style={styles.emptyAction} />
    ) : null}
  </Card>
);

const WalletListScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<WalletStackParamList>>();
  const { accessToken } = useAuth();
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

    const cardsWithCurrency = mappedCards.filter((c) => !!c.currency);
    const spentCurrencies = new Set(cardsWithCurrency.map((c) => c.currency).filter(Boolean) as string[]);
    const canShowGastado = cardsWithCurrency.length > 0 && spentCurrencies.size === 1;
    const gastadoCents = canShowGastado
      ? cardsWithCurrency.reduce((sum, c) => sum + (c.redeemedDeltaCents ?? 0), 0)
      : 0;
    const gastadoLabel = canShowGastado
      ? formatMoney(centsToDollars(gastadoCents), cardsWithCurrency[0]?.currency)
      : null;

    return {
      activeBalanceLabel,
      totalCards: mappedCards.length,
      gastadoLabel
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
  }, [activeTab, currentPage, pageCount, pagedCards]);

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

  const isBusy = !isQueryEnabled || isLoading || isRefetching;

  const renderHeader = () => (
    <View style={styles.header}>
      <SummaryBanner
        balanceLabel={summary.activeBalanceLabel}
        totalCards={summary.totalCards}
        gastadoLabel={summary.gastadoLabel}
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
            message="Clasificar recibidas/enviadas requiere campos de remitente y destinatario."
            actionLabel="Ver todas"
            onAction={() => setActiveTab("all")}
          />
        );
      }
      if (!classification.canClassifyTransfers && (activeTab === "received" || activeTab === "sent")) {
        return <EmptyState message="Obteniendo datos de la cuenta para clasificar transferencias..." />;
      }
      return (
        <EmptyState
          message={isBusy ? "Cargando tarjetas de regalo..." : "Aún no hay tarjetas en esta pestaña."}
        />
      );
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
        contentContainerStyle={styles.list}
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
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(0.5)
  },
  list: {
    gap: theme.spacing(1.5),
    paddingBottom: theme.spacing(2),
    paddingHorizontal: theme.spacing(2)
  },
  header: {
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing(1),
    gap: theme.spacing(1)
  },
  summaryBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingBottom: theme.spacing(2)
  },
  summaryLeft: {
    paddingBottom: theme.spacing(1.5),
    paddingRight: theme.spacing(2),
    marginRight: theme.spacing(2),
    marginLeft: theme.spacing(1),
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: theme.colors.primary,
    borderBottomRightRadius: theme.radius.md,
    gap: theme.spacing(1)
  },
  summaryBalanceLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text
  },
  summaryBalanceValue: {
    fontSize: 32,
    fontWeight: "800",
    color: theme.colors.text,
    marginTop: 2
  },

  summaryRight: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryStatItem: {
    alignItems: "center" as const,
    gap: theme.spacing(1)
  },
  summaryStatLabel: {
    fontSize: 18,
    fontWeight: "500",
    color: theme.colors.muted
  },
  summaryStatValue: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 2,
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
    fontWeight: "600"
  },
  tabLabelActive: {
    color: theme.colors.card
  },
  row: {
    width: "100%"
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1.2)
  },
  cardWithAccent: {
    borderRightWidth: 4,
    borderRightColor: theme.colors.primary,
    overflow: "hidden"
  },
  merchantLogoContainer: {
    width: 55,
    height: 55,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  merchantLogoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain"
  },
  badgeInitial: {
    position: "absolute",
    textAlign: "center",
    width: "100%",
    fontWeight: "700",
    fontSize: theme.typography.heading,
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
    fontWeight: "700",
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
    fontWeight: "500",
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
    fontWeight: "700",
    fontSize: theme.typography.small
  },
  amountColumn: {
    alignItems: "flex-end"
  },
  amount: {
    fontSize: 22,
    fontWeight: "800",
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
    fontWeight: "700",
    color: theme.colors.text,
    marginLeft: theme.spacing(0.5)
  },
  link: {
    color: theme.colors.secondary,
    fontWeight: "700"
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
    fontWeight: "600"
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
    fontWeight: "700"
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
    fontWeight: "700",
    color: theme.colors.text
  },
  activitySubtitle: {
    color: theme.colors.muted,
    marginTop: 2
  },
  activityAmount: {
    fontWeight: "700",
    color: theme.colors.secondary
  },
  emptyCard: {
    width: "100%"
  },
  emptyAction: {
    marginTop: theme.spacing(1)
  }
});

export default WalletListScreen;

