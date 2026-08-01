import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import Screen from "../ui/components/Screen";
import Button from "../ui/components/Button";
import Banner from "../ui/components/Banner";
import { EmptyStateCard, SkeletonBlock } from "../ui/components/StateViews";
import GiftCardCarousel from "../ui/wallet/GiftCardCarousel";
import GiftCardDetailPanel from "../ui/wallet/GiftCardDetailPanel";
import { theme } from "../ui/theme";
import { giftCardApi, meApi, merchantsApi } from "../api/endpoints";
import { partnerRedemption } from "../domain/merchants/partnerRedemption";
import {
  MerchantGroup,
  groupReceivedByMerchant,
  senderShortName
} from "../domain/wallet/groupByMerchant";
import { WalletStackParamList } from "../navigation";
import { useAuth } from "../auth/authStore";
import { centsToDollars, formatMoney } from "../utils/money";

const MerchantWalletScreen: React.FC = () => {
  const route = useRoute<RouteProp<WalletStackParamList, "MerchantWallet">>();
  const navigation = useNavigation<NativeStackNavigationProp<WalletStackParamList>>();
  const { merchantId } = route.params;
  const { accessToken } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isQueryEnabled = !!accessToken;

  // Only used to size the loading skeleton; the carousel derives its own
  // layout from the window width.
  const cardWidth = Math.round(width * 0.8);

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: meApi.me, enabled: isQueryEnabled });
  const { data: giftCards, isLoading } = useQuery({
    queryKey: ["giftCards"],
    queryFn: giftCardApi.list,
    enabled: isQueryEnabled
  });
  const { data: merchantDetail } = useQuery({
    queryKey: ["merchant", merchantId],
    queryFn: () => merchantsApi.detail(merchantId as string),
    enabled: isQueryEnabled && !!merchantId
  });
  const partner = partnerRedemption(merchantDetail);

  const group: MerchantGroup | null = useMemo(() => {
    const groups = groupReceivedByMerchant(giftCards ?? [], user?.id);
    return groups.find((g) => g.merchantId === merchantId) ?? null;
  }, [giftCards, user?.id, merchantId]);

  useEffect(() => {
    navigation.setOptions({ title: group?.merchantLabel ?? "Mi saldo" });
  }, [navigation, group?.merchantLabel]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [showRedeemed, setShowRedeemed] = useState(false);

  const activeCards = group?.activeCards ?? [];
  const clampedIndex = Math.min(activeIndex, Math.max(0, activeCards.length - 1));
  const activeCard = activeCards[clampedIndex] ?? null;

  const openRedemptionFlow = useCallback(
    (initialCardId?: string) => {
      navigation.navigate("MerchantRedemptionFlow", { merchantId, initialCardId });
    },
    [navigation, merchantId]
  );

  if (isLoading || !giftCards) {
    return (
      <Screen style={styles.screen} edges={["left", "right"]}>
        <View style={styles.loadingContainer}>
          <SkeletonBlock width="60%" height={30} radius={15} />
          <SkeletonBlock width={cardWidth} height={cardWidth / 1.86} radius={theme.radius.xl} />
          <SkeletonBlock width="90%" height={120} radius={18} />
        </View>
      </Screen>
    );
  }

  if (!group || (group.activeCards.length === 0 && group.redeemedCards.length === 0)) {
    return (
      <Screen centerContent edges={["left", "right"]}>
        <EmptyStateCard
          icon="credit-card"
          title="Sin tarjetas de este comercio"
          message="Cuando recibas una tarjeta de este comercio, aparecerá aquí."
          actionLabel="Volver"
          onAction={() => navigation.goBack()}
          style={styles.fullWidthCard}
        />
      </Screen>
    );
  }

  const canRedeem = group.availableCents > 0;

  return (
    <Screen style={styles.screen} edges={["left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 118 }]}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.totalLabel}>Total disponible</Text>
          <Text style={styles.totalValue}>
            {formatMoney(centsToDollars(group.availableCents), group.currency)}
          </Text>
          {group.heldCents > 0 ? (
            <Text style={styles.heldCaption}>
              {formatMoney(centsToDollars(group.heldCents), group.currency)} en verificación de
              seguridad
            </Text>
          ) : null}
        </View>

        {activeCards.length > 0 ? (
          <GiftCardCarousel
            cards={activeCards}
            merchantLabel={group.merchantLabel}
            onActiveIndexChange={setActiveIndex}
          />
        ) : (
          <View style={styles.noActiveBlock}>
            <EmptyStateCard
              icon="check-circle"
              title="Saldo agotado"
              message="Ya usaste todas tus tarjetas de este comercio."
            />
          </View>
        )}

        {activeCard ? (
          <GiftCardDetailPanel card={activeCard}>
            <Button
              label="Canjear esta tarjeta"
              variant="ghost"
              onPress={() => openRedemptionFlow(activeCard.id)}
              accessibilityLabel={`Canjear la tarjeta de ${formatMoney(
                centsToDollars(activeCard.remaining_balance_cents),
                activeCard.currency
              )}`}
            />
          </GiftCardDetailPanel>
        ) : null}

        {partner ? (
          <Banner
            icon="map-pin"
            title="Dónde canjear"
            message={`Para canjear, paga en ${partner.label}.`}
            style={styles.partnerBanner}
          />
        ) : null}

        {group.redeemedCards.length > 0 ? (
          <View style={styles.redeemedSection}>
            <Pressable
              style={styles.redeemedToggle}
              onPress={() => setShowRedeemed((value) => !value)}
              accessibilityRole="button"
              accessibilityState={{ expanded: showRedeemed }}
            >
              <Text style={styles.redeemedToggleLabel}>
                Ver canjeadas ({group.redeemedCards.length})
              </Text>
              <Feather
                name={showRedeemed ? "chevron-up" : "chevron-down"}
                size={18}
                color={theme.colors.muted}
              />
            </Pressable>
            {showRedeemed
              ? group.redeemedCards.map((card) => (
                  <Pressable
                    key={card.id}
                    style={styles.redeemedRow}
                    onPress={() => navigation.navigate("GiftCardDetail", { id: card.id })}
                    accessibilityRole="button"
                  >
                    <Feather name="shopping-bag" size={16} color={theme.colors.muted} />
                    <Text style={styles.redeemedRowText}>
                      {formatMoney(centsToDollars(card.amount_cents), card.currency)}
                      {senderShortName(card) ? ` · de ${senderShortName(card)}` : ""}
                    </Text>
                    <Text style={styles.redeemedRowStatus}>Canjeada</Text>
                  </Pressable>
                ))
              : null}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + theme.spacing(1) }]}>
        <Button
          label="Canjear en tienda"
          onPress={() => openRedemptionFlow()}
          disabled={!canRedeem}
          variant="primary"
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    paddingVertical: 0
  },
  content: {
    paddingTop: theme.spacing(1.5)
  },
  loadingContainer: {
    alignItems: "center",
    gap: theme.spacing(2),
    paddingTop: theme.spacing(3)
  },
  fullWidthCard: {
    width: "100%"
  },
  headerBlock: {
    paddingHorizontal: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    gap: theme.spacing(0.35)
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.captionMuted
  },
  totalValue: {
    fontSize: 34,
    fontFamily: theme.fonts.extraBold,
    color: theme.colors.secondary,
    letterSpacing: -0.6
  },
  heldCaption: {
    fontSize: theme.typography.small,
    fontFamily: theme.fonts.semiBold,
    color: "#B45309"
  },
  noActiveBlock: {
    paddingHorizontal: theme.spacing(2)
  },
  partnerBanner: {
    marginTop: theme.spacing(2),
    marginHorizontal: theme.spacing(2)
  },
  redeemedSection: {
    marginTop: theme.spacing(2),
    marginHorizontal: theme.spacing(2)
  },
  redeemedToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing(1.25),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.cardBorder
  },
  redeemedToggleLabel: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.muted,
    fontSize: theme.typography.small + 1
  },
  redeemedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1),
    paddingVertical: theme.spacing(1.1),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.cardBorder
  },
  redeemedRowText: {
    flex: 1,
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
    fontSize: theme.typography.small + 1
  },
  redeemedRowStatus: {
    color: theme.colors.muted,
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.typography.small
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
  }
});

export default MerchantWalletScreen;
