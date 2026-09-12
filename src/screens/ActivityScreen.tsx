import React from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import { EmptyStateCard, SkeletonBlock } from "../ui/components/StateViews";
import { theme } from "../ui/theme";
import { activityApi } from "../api/endpoints";
import { useAuth } from "../auth/authStore";
import { WalletStackParamList } from "../navigation";
import type { ActivityEvent } from "../types/api";
import { centsToDollars, formatMoney } from "../utils/money";
import { activityIcon, activitySubtitle, activityTitle, formatActivityDate } from "./activityCopy";

const ActivityRow: React.FC<{ event: ActivityEvent; onPress?: () => void }> = ({
  event,
  onPress
}) => {
  const icon = activityIcon(event.type);
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} activeOpacity={0.9}>
      <Card style={styles.activityCard}>
        <View style={styles.activityRow}>
          <View style={[styles.iconCircle, { backgroundColor: `${icon.color}1A` }]}>
            <Feather name={icon.name} size={18} color={icon.color} />
          </View>
          <View style={styles.activityText}>
            <Text style={styles.activityTitle}>{activityTitle(event)}</Text>
            <Text style={styles.activitySubtitle}>
              {activitySubtitle(event)} • {formatActivityDate(event.created_at)}
            </Text>
          </View>
          <Text style={styles.amount}>
            {formatMoney(centsToDollars(event.amount_cents), event.currency)}
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
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

/**
 * "Historial": the server-built feed (§8.2). It replaces the old client-side
 * reconstruction from card rows, which could only ever guess at redemptions,
 * reversals and refunds — the ledger knows them exactly.
 */
const ActivityScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<WalletStackParamList>>();
  const { accessToken } = useAuth();
  const isQueryEnabled = !!accessToken;

  const {
    data,
    isLoading,
    isRefetching,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["activity", "paged"],
    queryFn: ({ pageParam }: { pageParam: string | null }) => activityApi.list(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled: isQueryEnabled
  });

  const events = data?.pages.flatMap((page) => page.events) ?? [];
  const isBusy = isLoading || isRefetching || !isQueryEnabled;
  // With cached events we keep rendering them; pull-to-refresh still works.
  const hasLoadError = Boolean(error) && !data;

  return (
    <Screen style={styles.screen} edges={["left", "right"]}>
      <FlatList
        data={events}
        keyExtractor={(item, index) => `${item.type}-${item.load_id ?? item.transaction_id}-${index}`}
        renderItem={({ item }) => (
          <ActivityRow
            event={item}
            onPress={
              item.gift_card_id
                ? () => navigation.navigate("GiftCard", { id: String(item.gift_card_id) })
                : undefined
            }
          />
        )}
        contentContainerStyle={styles.list}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator color={theme.colors.primary} style={styles.footerSpinner} />
          ) : null
        }
        ListEmptyComponent={
          isBusy ? (
            <ActivitySkeleton />
          ) : hasLoadError ? (
            <EmptyStateCard
              icon="wifi-off"
              title="No pudimos cargar tu historial"
              message="Revisa tu conexión e inténtalo de nuevo."
              actionLabel="Reintentar"
              onAction={() => refetch()}
            />
          ) : (
            <EmptyStateCard
              icon="clock"
              title="Aún no hay movimientos"
              message="Tus recargas, regalos y canjes aparecerán aquí."
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
  footerSpinner: {
    marginVertical: theme.spacing(1.5)
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
  }
});

export default ActivityScreen;
