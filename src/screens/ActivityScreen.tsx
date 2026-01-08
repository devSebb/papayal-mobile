import React, { useMemo } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
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
  if (!timestamp) return "Recent";
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return "Recent";
  const date = new Date(parsed);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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
            {item.subtitle ?? "Gift card"} • {formatTimestamp(item.timestamp)}
          </Text>
        </View>
        {item.amountLabel ? <Text style={styles.amount}>{item.amountLabel}</Text> : null}
      </View>
    </Card>
  );
};

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

  return (
    <Screen style={styles.screen} edges={["left", "right"]}>
      <FlatList
        data={activityFeed}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ActivityRow item={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          isBusy ? (
            <Text style={styles.muted}>Loading activity...</Text>
          ) : (
            <Text style={styles.muted}>No activity yet.</Text>
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
    fontWeight: "700",
    color: theme.colors.text
  },
  activitySubtitle: {
    color: theme.colors.muted,
    marginTop: 2
  },
  amount: {
    fontWeight: "700",
    color: theme.colors.secondary
  },
  muted: {
    color: theme.colors.muted
  }
});

export default ActivityScreen;

