import React, { useEffect, useMemo, useState } from "react";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Screen from "../ui/components/Screen";
import Button from "../ui/components/Button";
import Banner from "../ui/components/Banner";
import { EmptyStateCard, SkeletonBlock } from "../ui/components/StateViews";
import GiftCardCarousel from "../ui/wallet/GiftCardCarousel";
import GiftCardDetailPanel from "../ui/wallet/GiftCardDetailPanel";
import { theme } from "../ui/theme";
import { giftCardApi, meApi, merchantsApi } from "../api/endpoints";
import type { HttpError } from "../api/http";
import { partnerRedemption } from "../domain/merchants/partnerRedemption";
import { groupReceivedByMerchant, isCardHeld } from "../domain/wallet/groupByMerchant";
import { WalletStackParamList } from "../navigation";
import { useAuth } from "../auth/authStore";
import { GiftCard } from "../types/api";
import { centsToDollars, formatMoney } from "../utils/money";
import { shareGiftCard } from "../sharing/shareGiftCard";

const STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  redeemed: "Canjeada",
  expired: "Vencida",
  inactive: "Inactiva"
};

const merchantLabelFor = (card: GiftCard | undefined) =>
  card?.merchant_store_name?.trim() ||
  card?.store_name?.trim() ||
  card?.merchant_name?.trim() ||
  card?.store?.name?.trim() ||
  card?.merchant?.name?.trim() ||
  "Comercio";

/**
 * A single gift card, opened from any wallet tab or from Activity.
 *
 * Presents the same card face and detail panel as MerchantWalletScreen — the
 * two screens shared no visual language before, so the same card looked
 * different depending on which tab you arrived from. When the opened card is
 * one of several active cards from the same merchant, the siblings render as a
 * carousel starting on the card that was tapped.
 */
const GiftCardDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<WalletStackParamList, "GiftCardDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<WalletStackParamList>>();
  const { id } = route.params;
  const { accessToken } = useAuth();
  const isSignedIn = !!accessToken;
  const insets = useSafeAreaInsets();

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: meApi.me,
    enabled: isSignedIn
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["giftCard", id],
    queryFn: () => giftCardApi.detail(id),
    enabled: isSignedIn
  });

  // Siblings come from the wallet list, the same source MerchantWalletScreen
  // groups from. Non-blocking: the card renders on its own if this is absent.
  const { data: allCards } = useQuery({
    queryKey: ["giftCards"],
    queryFn: giftCardApi.list,
    enabled: isSignedIn
  });

  const { data: merchantDetail } = useQuery({
    queryKey: ["merchant", data?.merchant_id],
    queryFn: () => merchantsApi.detail(data?.merchant_id as string),
    enabled: isSignedIn && !!data?.merchant_id
  });
  const partner = partnerRedemption(merchantDetail);

  const isRecipient = Boolean(currentUser?.id && data?.recipient_id === currentUser.id);
  const isSender = Boolean(currentUser?.id && data?.sender_id === currentUser.id);

  /**
   * Only a received card that is still spendable gets siblings. A sent card
   * isn't in the recipient-grouped set at all, and a redeemed one belongs to
   * the group's redeemed list rather than its active carousel.
   */
  const siblings = useMemo<GiftCard[]>(() => {
    if (!data || !isRecipient || !allCards || !currentUser?.id) return [];
    const group = groupReceivedByMerchant(allCards, currentUser.id).find(
      (g) => g.merchantId === data.merchant_id
    );
    const active = group?.activeCards ?? [];
    return active.some((card) => card.id === data.id) ? active : [];
  }, [data, isRecipient, allCards, currentUser?.id]);

  const initialIndex = useMemo(
    () => Math.max(0, siblings.findIndex((card) => card.id === id)),
    [siblings, id]
  );

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // Until the user scrolls, the focused card is the one they opened.
  const resolvedIndex = activeIndex ?? initialIndex;
  const focusedCard: GiftCard | undefined =
    siblings.length > 0 ? siblings[resolvedIndex] ?? siblings[0] : data;

  const merchantLabel = merchantLabelFor(data);

  useEffect(() => {
    navigation.setOptions({ title: merchantLabel });
  }, [navigation, merchantLabel]);

  const [sharing, setSharing] = useState(false);
  const [resendNotice, setResendNotice] = useState<{
    tone: "info" | "warning";
    message: string;
  } | null>(null);

  const shareGift = async () => {
    setSharing(true);
    try {
      await shareGiftCard(id);
    } finally {
      setSharing(false);
    }
  };

  const resendMutation = useMutation({
    mutationFn: () => giftCardApi.resend(id),
    onSuccess: () =>
      setResendNotice({
        tone: "info",
        message: "Notificación reenviada. Le llegará por WhatsApp, SMS o correo en unos momentos."
      }),
    onError: (err) => {
      const httpErr = err as unknown as HttpError;
      if (httpErr?.status === 429) {
        const retryIn = Number(
          (httpErr.error?.details as { retry_in_seconds?: number } | undefined)
            ?.retry_in_seconds ?? 0
        );
        setResendNotice({
          tone: "warning",
          message:
            retryIn > 3600
              ? "Alcanzaste el límite de reenvíos por hoy. Inténtalo mañana."
              : `Ya la reenviamos hace poco. Intenta de nuevo en ${Math.max(
                  1,
                  Math.ceil(retryIn / 60)
                )} min.`
        });
      } else {
        setResendNotice({
          tone: "warning",
          message: "No pudimos reenviar la notificación. Revisa tu conexión e inténtalo de nuevo."
        });
      }
    }
  });

  if (!isSignedIn || isLoading) {
    return (
      <Screen style={styles.screen} edges={["left", "right"]}>
        <View style={styles.loadingContainer}>
          <SkeletonBlock width="60%" height={30} radius={15} />
          <SkeletonBlock width="80%" height={170} radius={theme.radius.xl} />
          <SkeletonBlock width="90%" height={120} radius={18} />
        </View>
      </Screen>
    );
  }

  if (error || !data || !focusedCard) {
    return (
      <Screen centerContent edges={["left", "right"]}>
        <EmptyStateCard
          icon="credit-card"
          title="No pudimos cargar la tarjeta"
          message="Revisa tu conexión o vuelve a intentarlo desde tu billetera."
          actionLabel="Volver"
          onAction={() => navigation.goBack()}
          style={styles.fullWidthCard}
        />
      </Screen>
    );
  }

  const held = isCardHeld(focusedCard);
  const statusLabel = focusedCard.status ? STATUS_LABELS[focusedCard.status] ?? "—" : "—";
  const canRedeem =
    isRecipient &&
    focusedCard.status === "active" &&
    (focusedCard.remaining_balance_cents ?? 0) > 0 &&
    !held;

  // The subject of this screen is the card the user opened, so the header
  // shows that card's balance rather than a merchant-wide total.
  const balanceLabel = formatMoney(
    centsToDollars(focusedCard.remaining_balance_cents),
    focusedCard.currency
  );

  return (
    <Screen style={styles.screen} edges={["left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (canRedeem ? 118 : theme.spacing(3)) }
        ]}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.totalLabel}>{held ? "En verificación" : "Saldo disponible"}</Text>
          <Text style={styles.totalValue}>{balanceLabel}</Text>
          {focusedCard.status !== "active" ? (
            <Text style={styles.statusCaption}>{statusLabel}</Text>
          ) : null}
        </View>

        <GiftCardCarousel
          cards={siblings.length > 0 ? siblings : [focusedCard]}
          merchantLabel={merchantLabel}
          initialIndex={initialIndex}
          onActiveIndexChange={setActiveIndex}
        />

        <GiftCardDetailPanel card={focusedCard} showSender={isRecipient}>
          {canRedeem ? (
            <Button
              label="Generar token de canje"
              variant="ghost"
              onPress={() => navigation.navigate("RedemptionToken", { id: focusedCard.id })}
              accessibilityLabel={`Generar token de canje por ${balanceLabel}`}
            />
          ) : isRecipient ? (
            <Text style={styles.muted}>Esta tarjeta no es elegible para canje.</Text>
          ) : null}
        </GiftCardDetailPanel>

        {partner && focusedCard.status === "active" ? (
          <Banner
            icon="map-pin"
            title="Dónde canjear"
            message={`Para canjear, paga en ${partner.label}.`}
            style={styles.sectionSpacing}
          />
        ) : null}

        {/* Sender actions: share the claim link / re-deliver the notification */}
        {isSender && data.status === "active" ? (
          <View style={styles.shareSection}>
            <Text style={styles.sectionLabel}>Compartir</Text>
            <Text style={styles.shareHint}>
              ¿No le llegó el mensaje? Compártelo tú mismo o reenvía la notificación.
            </Text>
            <Button
              label="Compartir por WhatsApp"
              onPress={shareGift}
              loading={sharing}
              variant="secondary"
              accessibilityLabel="Compartir la tarjeta de regalo por WhatsApp"
            />
            <Button
              label="Reenviar notificación"
              onPress={() => resendMutation.mutate()}
              loading={resendMutation.isPending}
              variant="ghost"
            />
            {resendNotice ? (
              <Banner
                icon={resendNotice.tone === "info" ? "check-circle" : "clock"}
                tone={resendNotice.tone}
                message={resendNotice.message}
              />
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {canRedeem ? (
        <View style={[styles.ctaBar, { paddingBottom: insets.bottom + theme.spacing(1) }]}>
          <Button
            label="Canjear en tienda"
            variant="primary"
            onPress={() =>
              navigation.navigate("MerchantRedemptionFlow", {
                merchantId: data.merchant_id as string,
                initialCardId: focusedCard.id
              })
            }
          />
        </View>
      ) : null}
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
  statusCaption: {
    fontSize: theme.typography.small,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.muted
  },
  muted: {
    color: theme.colors.muted
  },
  sectionSpacing: {
    marginTop: theme.spacing(2),
    marginHorizontal: theme.spacing(2)
  },
  shareSection: {
    marginTop: theme.spacing(2),
    marginHorizontal: theme.spacing(2),
    paddingTop: theme.spacing(2),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    gap: theme.spacing(1)
  },
  sectionLabel: {
    fontSize: theme.typography.small,
    color: theme.colors.muted,
    fontFamily: theme.fonts.semiBold,
    marginBottom: theme.spacing(1),
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  shareHint: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    lineHeight: 19,
    marginTop: -theme.spacing(0.5)
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

export default GiftCardDetailScreen;
