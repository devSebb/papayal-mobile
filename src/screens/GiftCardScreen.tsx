import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { NavigationProp, RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import Screen from "../ui/components/Screen";
import Button from "../ui/components/Button";
import Banner from "../ui/components/Banner";
import MerchantGiftCardHero from "../ui/components/MerchantGiftCardHero";
import { EmptyStateCard, SkeletonBlock } from "../ui/components/StateViews";
import { theme } from "../ui/theme";
import { activityApi, giftCardApi, meApi, merchantsApi } from "../api/endpoints";
import type { HttpError } from "../api/http";
import { partnerRedemption } from "../domain/merchants/partnerRedemption";
import { mapGiftCardVM, senderShortName } from "../domain/wallet/mapGiftCardVM";
import { usePurchaseDraft } from "../domain/purchase/purchaseDraftStore";
import { AppTabsParamList, WalletStackParamList } from "../navigation";
import { useAuth } from "../auth/authStore";
import type { ActivityEvent, GiftCardLoad } from "../types/api";
import { centsToDollars, formatMoney } from "../utils/money";
import { getInitials } from "../utils/initials";
import { shareGiftCardLoad } from "../sharing/shareGiftCard";

const avatarPlaceholder = require("../../assets/avatar-default.png");

const DAY_FORMATTER = new Intl.DateTimeFormat("es-EC", { day: "numeric", month: "short" });
const HOLD_FORMATTER = new Intl.DateTimeFormat("es-EC", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

const formatDay = (value?: string | null) => {
  if (!value) return "";
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? "" : DAY_FORMATTER.format(new Date(parsed));
};

const formatHoldMoment = (value?: string | null) => {
  if (!value) return "";
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? "" : HOLD_FORMATTER.format(new Date(parsed));
};

/** Redemption-side events for this card, in the order the plan lists them. */
const REDEMPTION_EVENTS: ActivityEvent["type"][] = [
  "redemption",
  "reversal",
  "refund",
  "write_off"
];

const REDEMPTION_LABELS: Partial<Record<ActivityEvent["type"], string>> = {
  redemption: "Canje",
  reversal: "Devolución del comercio",
  refund: "Reembolso a tu tarjeta de pago",
  write_off: "Recarga anulada"
};

/**
 * One card, one balance, one history (D1). Replaces the old pair of screens
 * (a per-merchant carousel of cards plus a per-card detail): there is now
 * exactly one card per merchant, so the merchant screen and the card screen
 * were the same screen.
 *
 * The headline is the SPENDABLE balance; held and disputed money each get
 * their own strip so a user whose balance looks short can see why, and the
 * rest of their money stays usable (D4, D5).
 */
const GiftCardScreen: React.FC = () => {
  const route = useRoute<RouteProp<WalletStackParamList, "GiftCard">>();
  const navigation = useNavigation<NativeStackNavigationProp<WalletStackParamList>>();
  // The buy flow lives in the Home stack, so a reload leaves this tab.
  const tabNavigation = navigation.getParent<NavigationProp<AppTabsParamList>>();
  const { id } = route.params;
  const { accessToken } = useAuth();
  const isSignedIn = !!accessToken;
  const insets = useSafeAreaInsets();
  const { resetDraft, setMerchant, setRecipient } = usePurchaseDraft();

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: meApi.me,
    enabled: isSignedIn
  });

  const { data: card, isLoading, error } = useQuery({
    queryKey: ["giftCard", id],
    queryFn: () => giftCardApi.detail(id),
    enabled: isSignedIn
  });

  // The card carries its 20 most recent loads inline (§8.1); the paginated
  // endpoint is only needed once a card outgrows that.
  const { data: loadsPage } = useQuery({
    queryKey: ["giftCardLoads", id],
    queryFn: () => giftCardApi.loads(id),
    enabled: isSignedIn && (card?.loads_count ?? 0) > (card?.loads?.length ?? 0)
  });

  const { data: activity } = useQuery({
    queryKey: ["activity"],
    queryFn: () => activityApi.list(),
    enabled: isSignedIn
  });

  const { data: merchantDetail } = useQuery({
    queryKey: ["merchant", card?.merchant_id],
    queryFn: () => merchantsApi.detail(card?.merchant_id as string),
    enabled: isSignedIn && !!card?.merchant_id
  });
  const partner = partnerRedemption(merchantDetail);

  const vm = useMemo(() => (card ? mapGiftCardVM(card) : null), [card]);
  const isRecipient = Boolean(currentUser?.id && card?.recipient_id === currentUser.id);

  const loads: GiftCardLoad[] = useMemo(
    () => loadsPage?.loads ?? card?.loads ?? [],
    [loadsPage, card]
  );

  // Redemptions and merchant reversals for this card, newest first.
  const redemptions = useMemo(
    () =>
      (activity?.events ?? []).filter(
        (event) =>
          String(event.gift_card_id ?? "") === String(id) &&
          REDEMPTION_EVENTS.includes(event.type)
      ),
    [activity, id]
  );

  useEffect(() => {
    if (vm) navigation.setOptions({ title: vm.merchantLabel });
  }, [navigation, vm?.merchantLabel]);

  const [sharingLoadId, setSharingLoadId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "info" | "warning"; message: string } | null>(null);

  const shareLoad = async (load: GiftCardLoad) => {
    setSharingLoadId(load.id);
    try {
      await shareGiftCardLoad(id, load.id);
    } finally {
      setSharingLoadId(null);
    }
  };

  const resendMutation = useMutation({
    mutationFn: (loadId: string) => giftCardApi.resend(id, loadId),
    onSuccess: () =>
      setNotice({
        tone: "info",
        message: "Aviso reenviado. Le llegará por WhatsApp, SMS o correo en unos momentos."
      }),
    onError: (err) => {
      const httpErr = err as unknown as HttpError;
      if (httpErr?.status === 429) {
        const retryIn = Number(
          (httpErr.error?.details as { retry_in_seconds?: number } | undefined)
            ?.retry_in_seconds ?? 0
        );
        setNotice({
          tone: "warning",
          message:
            retryIn > 3600
              ? "Alcanzaste el límite de reenvíos por hoy. Inténtalo mañana."
              : `Ya lo reenviamos hace poco. Intenta de nuevo en ${Math.max(
                  1,
                  Math.ceil(retryIn / 60)
                )} min.`
        });
      } else {
        setNotice({
          tone: "warning",
          message: "No pudimos reenviar el aviso. Revisa tu conexión e inténtalo de nuevo."
        });
      }
    }
  });

  // "Recargar" is a self-load: the buyer is the recipient, so the delivery
  // form is skipped entirely (§11.3) and the backend resolves them from the
  // token (`recipient.self`).
  const startTopUp = useCallback(() => {
    if (!card?.merchant_id || !vm) return;
    resetDraft();
    setMerchant({
      id: String(card.merchant_id),
      name: vm.merchantLabel,
      logoUrl: vm.merchantLogoUrl ?? null
    });
    setRecipient({ self: true });
    tabNavigation?.navigate("HomeTab", {
      screen: "BuyGiftCardStart",
      params: { merchantId: String(card.merchant_id), self: true }
    });
  }, [card?.merchant_id, resetDraft, setMerchant, setRecipient, tabNavigation, vm]);

  if (!isSignedIn || isLoading) {
    return (
      <Screen style={styles.screen} edges={["left", "right"]}>
        <View style={styles.loadingContainer}>
          <SkeletonBlock width="60%" height={30} radius={15} />
          <SkeletonBlock width="88%" height={170} radius={theme.radius.xl} />
          <SkeletonBlock width="90%" height={120} radius={18} />
        </View>
      </Screen>
    );
  }

  if (error || !card || !vm) {
    return (
      <Screen centerContent edges={["left", "right"]}>
        <EmptyStateCard
          icon="credit-card"
          title="No pudimos cargar la tarjeta"
          message="Revisa tu conexión e inténtalo de nuevo desde Mis tarjetas."
          actionLabel="Volver"
          onAction={() => navigation.goBack()}
          style={styles.fullWidthCard}
        />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen} edges={["left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 130 }]}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.totalLabel}>Disponible</Text>
          <Text style={styles.totalValue}>{vm.availableFormatted}</Text>
        </View>

        <MerchantGiftCardHero
          variant="owned"
          merchantName={vm.merchantLabel}
          logoUrl={vm.merchantLogoUrl}
          spendableCents={vm.availableCents}
          currency={vm.currency}
          held={vm.isHeld}
          frozen={vm.isFrozen}
        />

        <View style={styles.strips}>
          {vm.isFrozen ? (
            <Banner
              icon="lock"
              tone="warning"
              title="Tarjeta congelada"
              message={
                vm.frozenReason?.trim()
                  ? `${vm.frozenReason.trim()} Escríbenos si crees que es un error.`
                  : "Escríbenos si crees que es un error."
              }
            />
          ) : null}
          {vm.isHeld ? (
            <Banner
              icon="lock"
              tone="warning"
              message={`${vm.heldFormatted} en revisión de seguridad${
                vm.heldUntil ? ` · disponible el ${formatHoldMoment(vm.heldUntil)}` : ""
              }`}
            />
          ) : null}
          {vm.hasDispute ? (
            <Banner
              icon="alert-circle"
              message={`Una recarga de ${vm.disputedFormatted} está en revisión. El resto de tu saldo sigue disponible.`}
            />
          ) : null}
          {partner ? (
            <Banner
              icon="map-pin"
              title="Dónde canjear"
              message={`Para canjear esta tarjeta, paga en ${partner.label}.`}
            />
          ) : null}
        </View>

        <Section title="Recargas">
          {loads.length === 0 ? (
            <Text style={styles.muted}>Aún no hay recargas en esta tarjeta.</Text>
          ) : (
            loads.map((load) => (
              <LoadRow
                key={load.id}
                load={load}
                isOwnLoad={String(load.sender_id ?? "") === String(currentUser?.id ?? "")}
                showSenderActions={
                  !vm.isCanceled &&
                  String(load.sender_id ?? "") === String(currentUser?.id ?? "") &&
                  !load.is_self
                }
                sharing={sharingLoadId === load.id}
                onShare={() => shareLoad(load)}
                onResend={() => resendMutation.mutate(load.id)}
                resending={resendMutation.isPending}
              />
            ))
          )}
        </Section>

        {redemptions.length > 0 ? (
          <Section title="Canjes">
            {redemptions.map((event) => (
              <View key={`${event.type}-${event.transaction_id}`} style={styles.historyRow}>
                <Text style={styles.historyLabel} numberOfLines={1}>
                  {event.type === "redemption"
                    ? `${event.merchant?.store_name ?? vm.merchantLabel}`
                    : REDEMPTION_LABELS[event.type]}
                </Text>
                <Text style={styles.historyDate}>{formatDay(event.created_at)}</Text>
                <Text
                  style={[
                    styles.historyAmount,
                    event.type === "redemption" || event.type === "write_off"
                      ? styles.historyAmountNegative
                      : styles.historyAmountPositive
                  ]}
                >
                  {event.type === "redemption" || event.type === "write_off" ? "−" : "+"}
                  {formatMoney(centsToDollars(event.amount_cents), event.currency)}
                </Text>
              </View>
            ))}
          </Section>
        ) : null}

        {vm.isEmpty ? (
          <View style={styles.emptyBalanceBlock}>
            <Text style={styles.emptyBalanceTitle}>Sin saldo por ahora</Text>
            <Text style={styles.muted}>Recarga tu tarjeta o espera una nueva recarga.</Text>
          </View>
        ) : null}

        {notice ? (
          <View style={styles.noticeBlock}>
            <Banner
              icon={notice.tone === "info" ? "check-circle" : "clock"}
              tone={notice.tone}
              message={notice.message}
            />
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + theme.spacing(1) }]}>
        <Button
          label="Canjear en tienda"
          variant="primary"
          disabled={!isRecipient || !vm.canRedeem}
          onPress={() => navigation.navigate("RedemptionToken", { id: card.id })}
        />
        {isRecipient && !vm.isFrozen && !vm.isCanceled ? (
          <Button label="Recargar" variant="ghost" onPress={startTopUp} />
        ) : null}
      </View>
    </Screen>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

/** One "Recarga" row: who paid, how much, when, and its note. */
const LoadRow: React.FC<{
  load: GiftCardLoad;
  isOwnLoad: boolean;
  showSenderActions: boolean;
  sharing: boolean;
  resending: boolean;
  onShare: () => void;
  onResend: () => void;
}> = ({ load, isOwnLoad, showSenderActions, sharing, resending, onShare, onResend }) => {
  const who = load.is_self ? "Tú" : senderShortName(load) ?? (isOwnLoad ? "Tú" : "Papayal");
  const held = Boolean(load.held_until);
  const disputed = Boolean(load.disputed_at);
  const avatarUrl = load.sender?.avatar_url;

  return (
    <View style={styles.loadRow}>
      <View style={styles.loadTop}>
        <View style={styles.avatarWrapper}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <>
              <Image source={avatarPlaceholder} style={styles.avatar} />
              <Text style={styles.avatarInitials}>{getInitials(who)}</Text>
            </>
          )}
        </View>
        <View style={styles.loadText}>
          <Text style={styles.loadWho} numberOfLines={1}>
            {who}
          </Text>
          <Text style={styles.loadMeta}>{formatDay(load.created_at)}</Text>
        </View>
        <View style={styles.loadAmountColumn}>
          <Text style={styles.loadAmount}>
            {formatMoney(centsToDollars(load.amount_cents), load.currency)}
          </Text>
          {held ? (
            <View style={styles.pill}>
              <Feather name="lock" size={10} color="#B45309" />
              <Text style={styles.pillLabel}>En revisión</Text>
            </View>
          ) : disputed ? (
            <View style={styles.pill}>
              <Feather name="alert-circle" size={10} color="#B45309" />
              <Text style={styles.pillLabel}>En disputa</Text>
            </View>
          ) : null}
        </View>
      </View>

      {load.note?.trim() ? <Text style={styles.loadNote}>“{load.note.trim()}”</Text> : null}

      {showSenderActions ? (
        <View style={styles.loadActions}>
          <Pressable onPress={onShare} disabled={sharing} hitSlop={6}>
            <Text style={styles.loadAction}>
              {sharing ? "Abriendo…" : "Compartir por WhatsApp"}
            </Text>
          </Pressable>
          <Pressable onPress={onResend} disabled={resending} hitSlop={6}>
            <Text style={styles.loadAction}>
              {resending ? "Reenviando…" : "¿No le llegó? Reenviar aviso"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
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
  strips: {
    marginTop: theme.spacing(2),
    marginHorizontal: theme.spacing(2),
    gap: theme.spacing(1)
  },
  section: {
    marginTop: theme.spacing(2.5),
    marginHorizontal: theme.spacing(2),
    gap: theme.spacing(1)
  },
  sectionTitle: {
    fontSize: theme.typography.subheading,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text
  },
  sectionBody: {
    backgroundColor: theme.colors.card,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.cardBorder,
    padding: theme.spacing(1.5),
    gap: theme.spacing(1.5),
    ...theme.shadow.sm
  },
  loadRow: {
    gap: theme.spacing(0.75)
  },
  loadTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1.25)
  },
  avatarWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: theme.colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  avatar: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  avatarInitials: {
    position: "absolute",
    color: theme.colors.secondary,
    fontFamily: theme.fonts.bold,
    fontSize: theme.typography.small + 1
  },
  loadText: {
    flex: 1,
    minWidth: 0
  },
  loadWho: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text,
    fontSize: theme.typography.body
  },
  loadMeta: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    marginTop: 2
  },
  loadAmountColumn: {
    alignItems: "flex-end",
    gap: theme.spacing(0.35)
  },
  loadAmount: {
    fontFamily: theme.fonts.extraBold,
    color: theme.colors.text,
    fontSize: theme.typography.body + 2
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(0.35),
    backgroundColor: "#FEF3C7",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#F59E0B",
    paddingHorizontal: theme.spacing(0.8),
    paddingVertical: theme.spacing(0.25)
  },
  pillLabel: {
    color: "#78350F",
    fontFamily: theme.fonts.bold,
    fontSize: theme.typography.small - 1
  },
  loadNote: {
    color: theme.colors.text,
    fontFamily: theme.fonts.italic,
    lineHeight: 22,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.sm,
    padding: theme.spacing(1.25)
  },
  loadActions: {
    gap: theme.spacing(0.5)
  },
  loadAction: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.bold,
    fontSize: theme.typography.small + 1
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1)
  },
  historyLabel: {
    flex: 1,
    color: theme.colors.text,
    fontFamily: theme.fonts.semiBold
  },
  historyDate: {
    color: theme.colors.muted,
    fontSize: theme.typography.small
  },
  historyAmount: {
    fontFamily: theme.fonts.bold,
    minWidth: 78,
    textAlign: "right"
  },
  historyAmountNegative: {
    color: theme.colors.text
  },
  historyAmountPositive: {
    color: theme.colors.success
  },
  emptyBalanceBlock: {
    marginTop: theme.spacing(2.5),
    marginHorizontal: theme.spacing(2),
    gap: theme.spacing(0.35)
  },
  emptyBalanceTitle: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    fontSize: theme.typography.body
  },
  noticeBlock: {
    marginTop: theme.spacing(2),
    marginHorizontal: theme.spacing(2)
  },
  muted: {
    color: theme.colors.muted
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
    gap: theme.spacing(0.75),
    shadowColor: theme.colors.secondary,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 12
  }
});

export default GiftCardScreen;
