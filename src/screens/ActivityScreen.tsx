import React, { useMemo } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import { EmptyStateCard, SkeletonBlock } from "../ui/components/StateViews";
import { theme } from "../ui/theme";
import { giftCardApi, meApi } from "../api/endpoints";
import { useAuth } from "../auth/authStore";
import { buildActivityFeed } from "../domain/wallet/buildActivityFeed";
import { ActivityItem } from "../domain/wallet/types";

const iconForKind: Record<ActivityItem["kind"], { name: keyof typeof Feather.glyphMap; color: string }> = {
  redeemed: { name: "shopping-bag", color: theme.colors.primary },
  expired: { name: "clock", color: theme.colors.danger },
  added: { name: "gift", color: theme.colors.secondary },
  received: { name: "arrow-down-left", color: theme.colors.secondary },
  sent: { name: "arrow-up-right", color: theme.colors.secondary }
};

const formatTimestamp = (timestamp?: string) => {
  if (!timestamp) return "Reciente";
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return "Reciente";
  const date = new Date(parsed);
  return date.toLocaleDateString("es-EC", { month: "short", day: "numeric", year: "numeric" });
};

const ActivityRow: React.FC<{ item: ActivityItem }> = ({ item }) => {
  const icon = iconForKind[item.kind];
  return (
    <Card style={styles.activityCard}>
      <View style={styles.activityRow}>
        <View style={[styles.iconCircle, { backgroundColor: `${icon.color}1A` }]}>
          <Feather name={icon.name} size={18} color={icon.color} />
        </View>
        <View style={styles.activityText}>
          <Text style={styles.activityTitle}>{item.title}</Text>
          <Text style={styles.activitySubtitle}>
            {item.subtitle ?? "Tarjeta de regalo"} • {formatTimestamp(item.timestamp)}
          </Text>
        </View>
        {item.amountLabel ? <Text style={styles.amount}>{item.amountLabel}</Text> : null}
      </View>
    </Card>
  );
};

const ActivitySkeleton: React.FC = () => (
  <View style={styles.skeletonList}>
    {Array.from({ length: 5 }).map((_, index) => (
      <Card key={`activity-skeleton-${index}`} style={styles.activityCard}>
        <View style={styles.activityRow}>
          <SkeletonBlock width={36} height={36} radius={18} />
          <View style={styles.activityText}>
            <SkeletonBlock width="72%" height={18} radius={9} />
            <SkeletonBlock width="54%" height={15} radius={8} style={styles.skeletonLine} />
          </View>
          <SkeletonBlock width={58} height={18} radius={9} />
        </View>
      </Card>
    ))}
  </View>
);

const ActivityScreen: React.FC = () => {
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
    error,
    refetch
  } = useQuery({
    queryKey: ["giftCards"],
    queryFn: giftCardApi.list,
    enabled: isQueryEnabled
  });

  const activityFeed = useMemo(
    () => buildActivityFeed(giftCards ?? [], user?.id),
    [giftCards, user?.id]
  );

  const isBusy = isLoading || isRefetching || !isQueryEnabled;
  // Only surface the error state when there is no cached data to show;
  // with cached cards we keep rendering the feed (pull-to-refresh still works).
  const hasLoadError = Boolean(error) && !giftCards;

  return (
    <Screen style={styles.screen} edges={["left", "right"]}>
      <FlatList
        data={activityFeed}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ActivityRow item={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          isBusy ? (
            <ActivitySkeleton />
          ) : hasLoadError ? (
            <EmptyStateCard
              icon="wifi-off"
              title="No pudimos cargar tu actividad"
              message="Revisa tu conexión e inténtalo de nuevo."
              actionLabel="Reintentar"
              onAction={() => refetch()}
            />
          ) : (
            <EmptyStateCard
              icon="clock"
              title="Aún no hay actividad"
              message="Tus compras, regalos recibidos y canjes aparecerán aquí."
            />
          )
        }
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
  list: {
    gap: theme.spacing(1.5),
    paddingBottom: theme.spacing(3),
    paddingHorizontal: theme.spacing(2)
  },
  activityCard: {
    width: "100%"
  },
  skeletonList: {
    gap: theme.spacing(1.5)
  },
  skeletonLine: {
    marginTop: theme.spacing(0.6)
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1)
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
  amount: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.secondary
  },
  muted: {
    color: theme.colors.muted
  }
});

export default ActivityScreen;
