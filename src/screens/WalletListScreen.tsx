import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import Button from "../ui/components/Button";
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

const PAGE_SIZE = 20;
const TAB_LABELS: Record<TabKey, string> = {
  all: "All",
  received: "Received",
  sent: "Sent",
  redeemed: "Redeemed"
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
    color: theme.colors.secondary
  },
  Expired: {
    backgroundColor: "#FDECEF",
    borderColor: "#F5B7C0",
    color: theme.colors.danger
  }
} as const;

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
  if (!timestamp) return "Recent";
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return "Recent";
  const date = new Date(parsed);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const SummaryChip: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.chip}>
    <Text style={styles.chipLabel}>{label}</Text>
    <Text style={styles.chipValue}>{value}</Text>
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

const GiftCardRow: React.FC<{ item: GiftCardVM; onPress: () => void }> = ({ item, onPress }) => {
  const statusStyle = statusStyles[item.status];
  const expiresLabel = item.expiresAt ? `Expires ${item.expiresAt}` : null;
  const merchantInitial = item.merchantLabel.charAt(0).toUpperCase();
  const hasLogo = Boolean(item.merchantLogoUrl);
  const logoSource = hasLogo ? { uri: item.merchantLogoUrl as string } : merchantPlaceholder;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.row}>
      <Card>
        <View style={styles.rowTop}>
          <View style={styles.badgeCircle}>
            <Image source={logoSource} style={styles.badgeImage} />
            {!hasLogo ? <Text style={styles.badgeInitial}>{merchantInitial}</Text> : null}
          </View>
          <View style={styles.rowMiddle}>
            <Text style={styles.merchant}>{item.merchantLabel}</Text>
            <View style={[styles.statusPill, { backgroundColor: statusStyle.backgroundColor, borderColor: statusStyle.borderColor }]}>
              <Text style={[styles.statusText, { color: statusStyle.color }]}>{item.status}</Text>
            </View>
            {expiresLabel ? <Text style={styles.muted}>{expiresLabel}</Text> : null}
          </View>
          <View style={styles.amountColumn}>
            <Text style={styles.amount}>{item.remainingFormatted}</Text>
            <Text style={styles.amountSmall}>of {item.originalFormatted}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const LatestActivitySection: React.FC<{
  items: ActivityItem[];
  onSeeAll: () => void;
  onPressItem: (cardId: string) => void;
}> = ({ items, onSeeAll, onPressItem }) => (
  <View style={styles.activitySection}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Latest activity</Text>
      <TouchableOpacity onPress={onSeeAll}>
        <Text style={styles.link}>See all</Text>
      </TouchableOpacity>
    </View>
    {items.length === 0 ? (
      <Text style={styles.muted}>No activity yet.</Text>
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
                {item.subtitle ?? "Gift card"} • {formatTimestamp(item.timestamp)}
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

    const redeemedCount = mappedCards.filter((card) => card.isRedeemed).length;

    return {
      activeBalanceLabel,
      totalCards: mappedCards.length,
      redeemedCount
    };
  }, [mappedCards]);

  const tabCards = classification[activeTab] ?? [];
  const page = pageByTab[activeTab] ?? 1;
  const pagedCards = tabCards.slice(0, page * PAGE_SIZE);

  const listData = useMemo(() => {
    const base: Array<{ type: "activity" | "card" | "empty"; key: string; card?: GiftCardVM }> = [
      { type: "activity", key: `activity-${activeTab}` }
    ];
    if (pagedCards.length === 0) {
      base.push({ type: "empty", key: `empty-${activeTab}` });
    } else {
      pagedCards.forEach((card) => base.push({ type: "card", key: card.id, card }));
    }
    return base;
  }, [activeTab, pagedCards]);

  const handleEndReached = useCallback(() => {
    const total = tabCards.length;
    const nextPage = pageByTab[activeTab] ?? 1;
    if (nextPage * PAGE_SIZE >= total) return;
    setPageByTab((prev) => ({ ...prev, [activeTab]: nextPage + 1 }));
  }, [activeTab, pageByTab, tabCards.length]);

  const isBusy = !isQueryEnabled || isLoading || isRefetching;

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Billetera</Text>
      <View style={styles.chipsRow}>
        {summary.activeBalanceLabel ? (
          <SummaryChip label="Active balance" value={summary.activeBalanceLabel} />
        ) : null}
        <SummaryChip label="Cards" value={`${summary.totalCards}`} />
        <SummaryChip label="Redeemed" value={`${summary.redeemedCount}`} />
      </View>
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

  const renderItem = ({
    item
  }: {
    item: { type: "activity" | "card" | "empty"; key: string; card?: GiftCardVM };
  }) => {
    if (item.type === "activity") {
      return (
        <LatestActivitySection
          items={activityFeed}
          onSeeAll={() => navigation.navigate("Activity")}
          onPressItem={(cardId) => navigation.navigate("GiftCardDetail", { id: cardId })}
        />
      );
    }
    if (item.type === "empty") {
      if (!classification.hasSenderRecipientFields && (activeTab === "received" || activeTab === "sent")) {
        return (
          <EmptyState
            message="Classification for received/sent requires sender and recipient fields."
            actionLabel="View All"
            onAction={() => setActiveTab("all")}
          />
        );
      }
      if (!classification.canClassifyTransfers && (activeTab === "received" || activeTab === "sent")) {
        return <EmptyState message="Fetching account info to classify transfers..." />;
      }
      return (
        <EmptyState
          message={isBusy ? "Loading gift cards..." : "No gift cards in this tab yet."}
        />
      );
    }
    if (item.card) {
      return (
        <GiftCardRow
          item={item.card}
          onPress={() => navigation.navigate("GiftCardDetail", { id: item.card!.id })}
        />
      );
    }
    return null;
  };

  return (
    <Screen style={styles.screen} edges={["left", "right"]}>
      <FlatList
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
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
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
  list: {
    gap: theme.spacing(1.5),
    paddingBottom: theme.spacing(2),
    paddingHorizontal: theme.spacing(2)
  },
  header: {
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing(1),
    // paddingHorizontal: theme.spacing(2),
    gap: theme.spacing(1)
  },
  title: {
    fontSize: theme.typography.heading,
    fontWeight: "800",
    color: theme.colors.text
  },
  chipsRow: {
    flexDirection: "row",
    gap: theme.spacing(1),
    flexWrap: "wrap"
  },
  chip: {
    paddingHorizontal: theme.spacing(1.5),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth
  },
  chipLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.small
  },
  chipValue: {
    color: theme.colors.text,
    fontWeight: "700",
    marginTop: 2
  },
  tabsRow: {
    flexDirection: "row",
    gap: theme.spacing(1)
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
    backgroundColor: "#FDF3DB",
    borderColor: theme.colors.primary
  },
  tabLabel: {
    color: theme.colors.muted,
    fontWeight: "600"
  },
  tabLabelActive: {
    color: theme.colors.secondary
  },
  row: {
    width: "100%"
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1.2)
  },
  badgeCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EEF2F3",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    overflow: "hidden"
  },
  badgeImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  badgeInitial: {
    position: "absolute",
    textAlign: "center",
    width: "100%",
    fontWeight: "700",
    color: theme.colors.secondary
  },
  rowMiddle: {
    flex: 1,
    gap: theme.spacing(0.5)
  },
  merchant: {
    fontSize: theme.typography.subheading,
    fontWeight: "700",
    color: theme.colors.text
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
  amountSmall: {
    color: theme.colors.muted,
    marginTop: 2
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
    color: theme.colors.text
  },
  link: {
    color: theme.colors.secondary,
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

