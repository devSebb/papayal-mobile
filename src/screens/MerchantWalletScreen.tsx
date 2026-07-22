import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
import Animated, {
  Extrapolation,
  FadeIn,
  interpolate,
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue
} from "react-native-reanimated";

import Screen from "../ui/components/Screen";
import Button from "../ui/components/Button";
import Banner from "../ui/components/Banner";
import MerchantGiftCardHero from "../ui/components/MerchantGiftCardHero";
import { EmptyStateCard, SkeletonBlock } from "../ui/components/StateViews";
import { theme } from "../ui/theme";
import { giftCardApi, meApi, merchantsApi } from "../api/endpoints";
import { partnerRedemption } from "../domain/merchants/partnerRedemption";
import {
  MerchantGroup,
  groupReceivedByMerchant,
  isCardHeld,
  senderShortName
} from "../domain/wallet/groupByMerchant";
import { WalletStackParamList } from "../navigation";
import { useAuth } from "../auth/authStore";
import { GiftCard } from "../types/api";
import { centsToDollars, formatMoney } from "../utils/money";
import { getInitials } from "../utils/initials";
import { hapticImpactLight } from "../utils/haptics";

const avatarPlaceholder = require("../../assets/avatar-default.png");

const HOLD_UNLOCK_FORMATTER = new Intl.DateTimeFormat("es-EC", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

const RECEIVED_DATE_FORMATTER = new Intl.DateTimeFormat("es-EC", {
  day: "numeric",
  month: "long",
  year: "numeric"
});

const formatReceivedDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return RECEIVED_DATE_FORMATTER.format(new Date(parsed));
};

/** One carousel page: the hero card scaling/dimming as it leaves center. */
const CarouselCard: React.FC<{
  card: GiftCard;
  merchantLabel: string;
  index: number;
  step: number;
  cardWidth: number;
  scrollX: SharedValue<number>;
}> = ({ card, merchantLabel, index, step, cardWidth, scrollX }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const position = scrollX.value / step;
    return {
      transform: [
        {
          scale: interpolate(
            position,
            [index - 1, index, index + 1],
            [0.94, 1, 0.94],
            Extrapolation.CLAMP
          )
        }
      ],
      opacity: interpolate(
        position,
        [index - 1, index, index + 1],
        [0.65, 1, 0.65],
        Extrapolation.CLAMP
      )
    };
  });

  return (
    <Animated.View style={[{ width: cardWidth }, animatedStyle]}>
      <MerchantGiftCardHero
        variant="owned"
        merchantName={merchantLabel}
        logoUrl={card.merchant_logo_url}
        remainingCents={card.remaining_balance_cents}
        originalCents={card.amount_cents}
        currency={card.currency}
        senderLabel={senderShortName(card)}
        held={isCardHeld(card)}
        style={{ width: cardWidth }}
      />
    </Animated.View>
  );
};

const Dots: React.FC<{
  count: number;
  step: number;
  scrollX: SharedValue<number>;
}> = ({ count, step, scrollX }) => (
  <View style={styles.dotsRow}>
    {Array.from({ length: count }).map((_, index) => (
      <Dot key={index} index={index} step={step} scrollX={scrollX} />
    ))}
  </View>
);

const Dot: React.FC<{
  index: number;
  step: number;
  scrollX: SharedValue<number>;
}> = ({ index, step, scrollX }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const position = scrollX.value / step;
    return {
      width: interpolate(position, [index - 1, index, index + 1], [8, 22, 8], Extrapolation.CLAMP),
      opacity: interpolate(position, [index - 1, index, index + 1], [0.35, 1, 0.35], Extrapolation.CLAMP)
    };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
};

const MerchantWalletScreen: React.FC = () => {
  const route = useRoute<RouteProp<WalletStackParamList, "MerchantWallet">>();
  const navigation = useNavigation<NativeStackNavigationProp<WalletStackParamList>>();
  const { merchantId } = route.params;
  const { accessToken } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isQueryEnabled = !!accessToken;

  const cardWidth = Math.round(width * 0.8);
  const cardGap = theme.spacing(1.5);
  const step = cardWidth + cardGap;
  const sidePadding = Math.max(0, (width - cardWidth) / 2);

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

  const scrollX = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [showRedeemed, setShowRedeemed] = useState(false);
  const previousIndex = useRef(0);

  const activeCards = group?.activeCards ?? [];
  const clampedIndex = Math.min(activeIndex, Math.max(0, activeCards.length - 1));
  const activeCard = activeCards[clampedIndex] ?? null;
  const activeCardHeld = activeCard ? isCardHeld(activeCard) : false;

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / step);
      const next = Math.max(0, Math.min(index, activeCards.length - 1));
      setActiveIndex(next);
      if (next !== previousIndex.current) {
        previousIndex.current = next;
        hapticImpactLight();
      }
    },
    [step, activeCards.length]
  );

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
  const senderName =
    activeCard?.sender?.full_name?.trim() ||
    [activeCard?.sender?.name, activeCard?.sender?.last_name].filter(Boolean).join(" ").trim() ||
    null;
  const receivedDate = formatReceivedDate(activeCard?.created_at);
  const heldUntilDate =
    activeCardHeld && activeCard?.held_until ? new Date(activeCard.held_until) : null;

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
          <>
            <Animated.FlatList
              data={activeCards}
              keyExtractor={(card) => card.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={step}
              decelerationRate="fast"
              disableIntervalMomentum
              onScroll={scrollHandler}
              scrollEventThrottle={16}
              onMomentumScrollEnd={handleMomentumEnd}
              contentContainerStyle={{ paddingHorizontal: sidePadding }}
              ItemSeparatorComponent={() => <View style={{ width: cardGap }} />}
              renderItem={({ item, index }) => (
                <CarouselCard
                  card={item}
                  merchantLabel={group.merchantLabel}
                  index={index}
                  step={step}
                  cardWidth={cardWidth}
                  scrollX={scrollX}
                />
              )}
            />
            {activeCards.length > 1 ? (
              <Dots count={activeCards.length} step={step} scrollX={scrollX} />
            ) : null}
          </>
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
          <Animated.View
            key={activeCard.id}
            entering={FadeIn.duration(220)}
            style={styles.detailPanel}
          >
            {senderName ? (
              <View style={styles.senderRow}>
                <View style={styles.senderAvatarWrapper}>
                  {activeCard.sender?.avatar_url ? (
                    <Image
                      source={{ uri: activeCard.sender.avatar_url }}
                      style={styles.senderAvatar}
                    />
                  ) : (
                    <>
                      <Image source={avatarPlaceholder} style={styles.senderAvatar} />
                      <Text style={styles.senderInitials}>{getInitials(senderName)}</Text>
                    </>
                  )}
                </View>
                <View style={styles.senderInfo}>
                  <Text style={styles.senderName}>{senderName}</Text>
                  {receivedDate ? (
                    <Text style={styles.senderMeta}>Recibida el {receivedDate}</Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            {activeCard.note?.trim() ? (
              <View style={styles.noteBox}>
                <Text style={styles.noteText}>{activeCard.note}</Text>
              </View>
            ) : null}

            {heldUntilDate ? (
              <Banner
                icon="lock"
                tone="warning"
                title="Verificación de seguridad"
                message={`Esta tarjeta estará disponible para canje el ${HOLD_UNLOCK_FORMATTER.format(heldUntilDate)}.`}
              />
            ) : (
              <Button
                label="Canjear esta tarjeta"
                variant="ghost"
                onPress={() => openRedemptionFlow(activeCard.id)}
                accessibilityLabel={`Canjear la tarjeta de ${formatMoney(
                  centsToDollars(activeCard.remaining_balance_cents),
                  activeCard.currency
                )}`}
              />
            )}
          </Animated.View>
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
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: theme.spacing(0.6),
    marginTop: theme.spacing(1.5)
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary
  },
  noActiveBlock: {
    paddingHorizontal: theme.spacing(2)
  },
  detailPanel: {
    marginTop: theme.spacing(2),
    marginHorizontal: theme.spacing(2),
    backgroundColor: theme.colors.card,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.cardBorder,
    padding: theme.spacing(2),
    gap: theme.spacing(1.5),
    ...theme.shadow.sm
  },
  senderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1.5)
  },
  senderAvatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: theme.colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  senderAvatar: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  senderInitials: {
    position: "absolute",
    color: theme.colors.secondary,
    fontFamily: theme.fonts.bold,
    fontSize: theme.typography.body
  },
  senderInfo: {
    flex: 1,
    gap: theme.spacing(0.25)
  },
  senderName: {
    fontSize: theme.typography.body,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text
  },
  senderMeta: {
    fontSize: theme.typography.small,
    color: theme.colors.muted
  },
  noteBox: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.sm,
    padding: theme.spacing(1.5)
  },
  noteText: {
    fontSize: theme.typography.body,
    color: theme.colors.text,
    fontFamily: theme.fonts.italic,
    lineHeight: 24
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
