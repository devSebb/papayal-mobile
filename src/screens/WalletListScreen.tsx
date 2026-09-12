import React, { useCallback, useId, useMemo, useRef, useState } from "react";
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
import { activityApi, giftCardApi, loadsApi, meApi } from "../api/endpoints";
import { AppTabsParamList, WalletStackParamList } from "../navigation";
import { useAuth } from "../auth/authStore";
import { centsToDollars, formatMoney } from "../utils/money";
import { mapGiftCardVM } from "../domain/wallet/mapGiftCardVM";
import { classifyGiftCards } from "../domain/wallet/classifyGiftCards";
import { GiftCardVM, TabKey } from "../domain/wallet/types";
import { ActivityEvent, GiftCard, SentLoad } from "../types/api";
import { activityIcon, activitySubtitle, activityTitle, formatActivityDate } from "./activityCopy";

const walletDecorationImage = require("../../assets/wallet-decoration.png");

const WALLET_CARD_BG = "#F5EEDC";
const WALLET_HEADING = "#2D3E50";

/** Same top/bottom inset so both summary tiles align across columns */
const WALLET_SUMMARY_PAD_V = theme.spacing(1.5);
const WALLET_SUMMARY_LABEL_VALUE_GAP = theme.spacing(0.75);

const SUMMARY_L_STROKE = 2.5;
const SUMMARY_L_RADIUS = 14;

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
        <Svg width={box.w} height={box.h} style={StyleSheet.absoluteFill} pointerEvents="none">
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

const TAB_LABELS: Record<TabKey, string> = {
  cards: "Mis tarjetas",
  sent: "Enviadas",
  activity: "Historial"
};

const RELATIVE_DAY_FORMATTER = new Intl.DateTimeFormat("es-EC", {
  day: "numeric",
  month: "short"
});

/** "Recargada hace 2 días" while that's meaningful, then a plain date. */
const lastLoadedLabel = (iso?: string | null, now = new Date()) => {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return null;
  const days = Math.floor((now.getTime() - parsed) / 86_400_000);
  if (days <= 0) return "Recargada hoy";
  if (days === 1) return "Recargada ayer";
  if (days < 30) return `Recargada hace ${days} días`;
  return `Recargada el ${RELATIVE_DAY_FORMATTER.format(new Date(parsed))}`;
};

const SummaryBanner: React.FC<{ title: string; value: string | null; merchantCount: number }> = ({
  title,
  value,
  merchantCount
}) => (
  <View style={styles.walletStrip}>
    <View style={styles.walletMainRow}>
      <SummaryLeftWithGradientBorder>
        <Text style={styles.summaryBalanceLabel} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.summaryBalanceValue}>{value ?? "—"}</Text>
      </SummaryLeftWithGradientBorder>
      <View style={styles.activeCardsCard}>
        <View style={styles.activeCardsTextBlock}>
          <Text style={styles.activeCardsLabel}>Comercios</Text>
          <Text style={styles.activeCardsValue}>{merchantCount}</Text>
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

const MerchantLogo: React.FC<{ label: string; logoUrl?: string | null }> = ({ label, logoUrl }) => (
  <View style={styles.merchantLogoContainer}>
    {logoUrl ? (
      <Image source={{ uri: logoUrl }} style={styles.merchantLogoImage} />
    ) : (
      <Text style={styles.badgeInitial}>{label.charAt(0).toUpperCase()}</Text>
    )}
  </View>
);

/** One card per merchant (D1): its spendable balance, and why the rest isn't. */
const GiftCardRow: React.FC<{ item: GiftCardVM; onPress: () => void }> = ({ item, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.row}>
    <Card style={styles.cardWithAccent}>
      <View style={styles.rowTop}>
        <MerchantLogo label={item.merchantLabel} logoUrl={item.merchantLogoUrl} />
        <View style={styles.rowMiddle}>
          <Text style={styles.merchantTitle} numberOfLines={1}>
            {item.merchantLabel}
          </Text>
          <View style={styles.senderRow}>
            {item.isFrozen ? (
              <View style={styles.warnPill}>
                <Feather name="lock" size={12} color="#B45309" />
                <Text style={styles.warnPillLabel}>Congelada</Text>
              </View>
            ) : item.isHeld ? (
              <View style={styles.warnPill}>
                <Feather name="lock" size={12} color="#B45309" />
                <Text style={styles.warnPillLabel}>{item.heldFormatted} en revisión</Text>
              </View>
            ) : (
              <Text style={styles.senderLabel} numberOfLines={1}>
                {lastLoadedLabel(item.lastLoadedAt ?? item.updatedAt) ?? "Tarjeta de regalo digital"}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.cardDivider} />
        <View style={styles.amountColumn}>
          {item.isEmpty ? (
            <Text style={[styles.amount, styles.muted]}>Sin saldo</Text>
          ) : (
            <>
              <Text style={styles.amount}>{item.availableFormatted}</Text>
              <Text style={styles.muted}>Disponible</Text>
            </>
          )}
        </View>
      </View>
    </Card>
  </TouchableOpacity>
);

/** One purchase this account paid for (§8.2 "Enviadas"). */
const SentLoadRow: React.FC<{ item: SentLoad; onPress: () => void }> = ({ item, onPress }) => {
  const merchantLabel = item.gift_card?.merchant?.store_name?.trim() || "Comercio";
  const recipientName =
    item.recipient?.name?.trim() || item.recipient?.full_name?.trim() || "destinatario";
  const claimed = item.claim_status === "claimed";

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.row}>
      <Card style={styles.cardWithAccent}>
        <View style={styles.rowTop}>
          <MerchantLogo label={merchantLabel} logoUrl={item.gift_card?.merchant?.logo_url} />
          <View style={styles.rowMiddle}>
            <Text style={styles.merchantTitle} numberOfLines={1}>
              {formatMoney(centsToDollars(item.amount_cents), item.currency)} ·{" "}
              {item.is_self ? "para ti" : `para ${recipientName}`}
            </Text>
            <View style={styles.senderRow}>
              <Text style={styles.senderLabel} numberOfLines={1}>
                {merchantLabel}
              </Text>
              <View style={claimed ? styles.okPill : styles.warnPill}>
                <Text style={claimed ? styles.okPillLabel : styles.warnPillLabel}>
                  {claimed ? "Reclamada" : "Pendiente de reclamar"}
                </Text>
              </View>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={theme.colors.muted} />
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const ActivityRow: React.FC<{ event: ActivityEvent; onPress?: () => void }> = ({
  event,
  onPress
}) => {
  const icon = activityIcon(event.type);
  return (
    <TouchableOpacity
      style={styles.activityRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.9}
    >
      <View style={[styles.iconCircle, { backgroundColor: `${icon.color}1A` }]}>
        <Feather name={icon.name} size={18} color={icon.color} />
      </View>
      <View style={styles.activityText}>
        <Text style={styles.activityTitle}>{activityTitle(event)}</Text>
        <Text style={styles.activitySubtitle}>
          {activitySubtitle(event)} • {formatActivityDate(event.created_at)}
        </Text>
      </View>
      <Text style={styles.activityAmount}>
        {formatMoney(centsToDollars(event.amount_cents), event.currency)}
      </Text>
    </TouchableOpacity>
  );
};

type ListItem =
  | { type: "card"; key: string; card: GiftCardVM }
  | { type: "sent"; key: string; load: SentLoad }
  | { type: "activity"; key: string; event: ActivityEvent }
  | { type: "empty"; key: string }
  | { type: "error"; key: string }
  | { type: "skeleton"; key: string };

const WalletSkeletonRows: React.FC = () => (
  <View style={styles.skeletonRows}>
    {Array.from({ length: 4 }).map((_, index) => (
      <Card key={`wallet-skeleton-${index}`} style={styles.cardWithAccent}>
        <View style={styles.rowTop}>
          <SkeletonBlock width={64} height={42} radius={12} />
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

/**
 * "Mis tarjetas": one row per merchant card, the purchases this account paid
 * for, and the server-built history. There is no grouping left to do here —
 * a recipient holds exactly one card per merchant (D1) — so the list is a
 * straight render of what the API returns.
 */
const WalletListScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<WalletStackParamList>>();
  const tabNavigation = navigation.getParent<NavigationProp<AppTabsParamList>>();
  const { accessToken } = useAuth();
  const tabBarHeight = useBottomTabBarHeight();
  const isQueryEnabled = !!accessToken;

  const [activeTab, setActiveTab] = useState<TabKey>("cards");
  const listRef = useRef<FlatList<ListItem>>(null);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: meApi.me,
    enabled: isQueryEnabled
  });

  const {
    data: giftCards,
    isLoading,
    isRefetching,
    error,
    refetch
  } = useQuery({
    queryKey: ["giftCards"],
    queryFn: giftCardApi.list,
    enabled: isQueryEnabled
  });

  const {
    data: sentPage,
    isLoading: sentLoading,
    isRefetching: sentRefetching,
    error: sentError,
    refetch: refetchSent
  } = useQuery({
    queryKey: ["sentLoads"],
    queryFn: () => loadsApi.sent(),
    enabled: isQueryEnabled && activeTab === "sent"
  });

  const {
    data: activityPage,
    isLoading: activityLoading,
    isRefetching: activityRefetching,
    error: activityError,
    refetch: refetchActivity
  } = useQuery({
    queryKey: ["activity"],
    queryFn: () => activityApi.list(),
    enabled: isQueryEnabled && activeTab === "activity"
  });

  const mappedCards = useMemo(() => {
    const now = new Date();
    return (giftCards ?? [])
      .slice()
      .sort(
        (a: GiftCard, b: GiftCard) =>
          (b.spendable_cents ?? b.remaining_balance_cents ?? 0) -
          (a.spendable_cents ?? a.remaining_balance_cents ?? 0)
      )
      .map((card) => mapGiftCardVM(card, now));
  }, [giftCards]);

  const { cards } = useMemo(
    () => classifyGiftCards(mappedCards, user?.id),
    [mappedCards, user?.id]
  );

  const summary = useMemo(() => {
    const withBalance = cards.filter((card) => card.availableCents > 0);
    if (withBalance.length === 1) {
      return {
        title: `Tienes saldo en ${withBalance[0].merchantLabel}`,
        value: withBalance[0].availableFormatted,
        merchantCount: 1
      };
    }
    return {
      title: withBalance.length > 1 ? "Comercios con saldo" : "Saldo disponible",
      value:
        withBalance.length > 1
          ? String(withBalance.length)
          : formatMoney(0, cards[0]?.currency ?? "USD"),
      merchantCount: withBalance.length
    };
  }, [cards]);

  const refetchActive = useCallback(() => {
    if (activeTab === "sent") return refetchSent();
    if (activeTab === "activity") return refetchActivity();
    return refetch();
  }, [activeTab, refetch, refetchActivity, refetchSent]);

  const isBusy =
    !isQueryEnabled ||
    (activeTab === "cards" && (isLoading || isRefetching)) ||
    (activeTab === "sent" && (sentLoading || sentRefetching)) ||
    (activeTab === "activity" && (activityLoading || activityRefetching));

  const listData = useMemo(() => {
    const items: ListItem[] = [];

    if (activeTab === "sent") {
      if (sentLoading && !sentPage) return [{ type: "skeleton", key: "sent-skeleton" } as ListItem];
      if (sentError && !sentPage) return [{ type: "error", key: "sent-error" } as ListItem];
      const loads = sentPage?.loads ?? [];
      if (loads.length === 0) return [{ type: "empty", key: "empty-sent" } as ListItem];
      loads.forEach((load) => items.push({ type: "sent", key: `sent-${load.id}`, load }));
      return items;
    }

    if (activeTab === "activity") {
      if (activityLoading && !activityPage) {
        return [{ type: "skeleton", key: "activity-skeleton" } as ListItem];
      }
      if (activityError && !activityPage) {
        return [{ type: "error", key: "activity-error" } as ListItem];
      }
      const events = activityPage?.events ?? [];
      if (events.length === 0) return [{ type: "empty", key: "empty-activity" } as ListItem];
      events.forEach((event, index) =>
        items.push({ type: "activity", key: `activity-${index}-${event.created_at}`, event })
      );
      return items;
    }

    if (isLoading && !giftCards) return [{ type: "skeleton", key: "wallet-skeleton" } as ListItem];
    if (error && !giftCards) return [{ type: "error", key: "wallet-error" } as ListItem];
    if (cards.length === 0) return [{ type: "empty", key: "empty-cards" } as ListItem];
    cards.forEach((card) => items.push({ type: "card", key: card.id, card }));
    return items;
  }, [
    activeTab,
    activityError,
    activityLoading,
    activityPage,
    cards,
    error,
    giftCards,
    isLoading,
    sentError,
    sentLoading,
    sentPage
  ]);

  const selectTab = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const renderHeader = () => (
    <View style={styles.header}>
      <SummaryBanner
        title={summary.title}
        value={summary.value}
        merchantCount={summary.merchantCount}
      />
      <View style={styles.tabsRow}>
        {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => (
          <TabButton key={tab} tab={tab} active={tab === activeTab} onPress={() => selectTab(tab)} />
        ))}
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (activeTab === "sent") {
      return (
        <EmptyStateCard
          icon="send"
          title="Aún no has enviado recargas"
          message="Cuando envíes una tarjeta de regalo digital o recargues la de alguien, la verás aquí."
          actionLabel="Enviar una tarjeta"
          onAction={() => tabNavigation?.navigate("HomeTab")}
        />
      );
    }
    if (activeTab === "activity") {
      return (
        <EmptyStateCard
          icon="clock"
          title="Aún no hay movimientos"
          message="Tus recargas, regalos y canjes aparecerán aquí."
        />
      );
    }
    return (
      <EmptyStateCard
        icon="gift"
        title="Aún no tienes tarjetas"
        message="Cuando recibas o envíes una tarjeta de regalo digital, la verás aquí."
        actionLabel="Enviar una tarjeta"
        onAction={() => tabNavigation?.navigate("HomeTab")}
      />
    );
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === "skeleton") return <WalletSkeletonRows />;
    if (item.type === "empty") return renderEmpty();
    if (item.type === "error") {
      return (
        <EmptyStateCard
          icon="wifi-off"
          title="No pudimos cargar tus tarjetas"
          message="Revisa tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={() => refetchActive()}
        />
      );
    }
    if (item.type === "card") {
      return (
        <GiftCardRow
          item={item.card}
          onPress={() => navigation.navigate("GiftCard", { id: item.card.id })}
        />
      );
    }
    if (item.type === "sent") {
      const cardId = item.load.gift_card?.id;
      return (
        <SentLoadRow
          item={item.load}
          onPress={() => {
            if (cardId) navigation.navigate("GiftCard", { id: String(cardId) });
          }}
        />
      );
    }
    const eventCardId = item.event.gift_card_id;
    return (
      <ActivityRow
        event={item.event}
        onPress={
          eventCardId
            ? () => navigation.navigate("GiftCard", { id: String(eventCardId) })
            : undefined
        }
      />
    );
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
            onRefresh={() => refetchActive()}
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
  cardWithAccent: {
    overflow: "hidden"
  },
  merchantLogoContainer: {
    width: 64,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#F8FAFB",
    paddingHorizontal: theme.spacing(0.9),
    paddingVertical: theme.spacing(0.55)
  },
  merchantLogoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain"
  },
  badgeInitial: {
    textAlign: "center",
    fontFamily: theme.fonts.black,
    fontSize: 20,
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
    gap: theme.spacing(1),
    minWidth: 0
  },
  cardDivider: {
    width: 2,
    alignSelf: "stretch",
    backgroundColor: theme.colors.primary,
    borderRadius: 1
  },
  senderLabel: {
    flexShrink: 1,
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.muted
  },
  warnPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(0.35),
    alignSelf: "flex-start",
    paddingHorizontal: theme.spacing(1),
    paddingVertical: theme.spacing(0.35),
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B"
  },
  warnPillLabel: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.typography.small,
    color: "#78350F"
  },
  okPill: {
    alignSelf: "flex-start",
    paddingHorizontal: theme.spacing(1),
    paddingVertical: theme.spacing(0.35),
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    backgroundColor: "#E6F4EC",
    borderColor: "#CDE7D8"
  },
  okPillLabel: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.typography.small,
    color: theme.colors.success
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
  }
});

export default WalletListScreen;
