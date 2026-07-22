import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { RouteProp, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import QRCode from "react-native-qrcode-svg";
import { Barcode } from "expo-barcode-generator";
import { Feather } from "@expo/vector-icons";
import * as Brightness from "expo-brightness";
import { usePreventScreenCapture } from "expo-screen-capture";
import Animated, { FadeIn, SlideInRight, SlideOutLeft } from "react-native-reanimated";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import Button from "../ui/components/Button";
import Banner from "../ui/components/Banner";
import { EmptyStateCard, SkeletonBlock } from "../ui/components/StateViews";
import { theme } from "../ui/theme";
import { giftCardApi, meApi } from "../api/endpoints";
import { HttpError } from "../api/http";
import {
  CRUMB_THRESHOLD_CENTS,
  buildRedemptionQueue,
  groupReceivedByMerchant,
  isCardHeld,
  senderShortName
} from "../domain/wallet/groupByMerchant";
import { WalletStackParamList } from "../navigation";
import { useAuth } from "../auth/authStore";
import { centsToDollars, formatMoney } from "../utils/money";
import { toDisplayTime } from "../utils/date";
import { hapticImpactLight, hapticSuccess } from "../utils/haptics";

const CRUMBS_FIRST_STORAGE_KEY = "papayal.redemption.crumbsFirst";

/** How long the balance poll waits between checks while a code is on screen. */
const BALANCE_POLL_MS = 4000;

/** Pause on the "card redeemed" celebration before advancing to the next one. */
const CELEBRATE_MS = 1600;

/**
 * The flow is a tiny explicit state machine. Polling results, the manual
 * button and timers all funnel through the same transitions, so a late poll
 * response or a double tap can never advance the queue twice.
 */
type FlowState = "showing" | "celebrating" | "finished";

const formatCountdown = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// Visual-only: groups the 10-char token as XXXX-XXX-XXX for easier manual
// reading. Never used as input to QR/barcode or sent to the API.
const formatTokenForDisplay = (token: string) => {
  if (!token || token.length !== 10) return token;
  return `${token.slice(0, 4)}-${token.slice(4, 7)}-${token.slice(7)}`;
};

const MerchantRedemptionFlowScreen: React.FC = () => {
  usePreventScreenCapture();
  const route = useRoute<RouteProp<WalletStackParamList, "MerchantRedemptionFlow">>();
  const navigation = useNavigation<NativeStackNavigationProp<WalletStackParamList>>();
  const { merchantId, initialCardId } = route.params;
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const isQueryEnabled = !!accessToken;

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: meApi.me, enabled: isQueryEnabled });
  const { data: giftCards } = useQuery({
    queryKey: ["giftCards"],
    queryFn: giftCardApi.list,
    enabled: isQueryEnabled
  });

  const group = useMemo(() => {
    const groups = groupReceivedByMerchant(giftCards ?? [], user?.id);
    return groups.find((g) => g.merchantId === merchantId) ?? null;
  }, [giftCards, user?.id, merchantId]);

  // ── Queue ───────────────────────────────────────────────────────────
  const [crumbsFirst, setCrumbsFirst] = useState<boolean | null>(null);
  const [queueIds, setQueueIds] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flowState, setFlowState] = useState<FlowState>("showing");
  const [sessionCents, setSessionCents] = useState(0);
  const [partialCents, setPartialCents] = useState<number | null>(null);
  const baselines = useRef(new Map<string, number>());

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(CRUMBS_FIRST_STORAGE_KEY)
      .then((value) => {
        if (!cancelled) setCrumbsFirst(value === null ? true : value === "true");
      })
      .catch(() => {
        if (!cancelled) setCrumbsFirst(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Build the queue exactly once, when both the cards and the stored
  // preference are ready — later refetches must not reshuffle mid-session.
  useEffect(() => {
    if (queueIds !== null || !group || crumbsFirst === null) return;
    const queue = buildRedemptionQueue(group.activeCards, {
      crumbsFirst,
      leadCardId: initialCardId
    });
    setQueueIds(queue.map((card) => card.id));
    if (queue.length === 0) setFlowState("finished");
  }, [queueIds, group, crumbsFirst, initialCardId]);

  const currentCardId = queueIds && flowState !== "finished" ? queueIds[index] : undefined;

  // ── Live card (balance polling while a code is on screen) ───────────
  const { data: liveCard } = useQuery({
    queryKey: ["giftCard", currentCardId],
    queryFn: () => giftCardApi.detail(currentCardId as string),
    enabled: isQueryEnabled && !!currentCardId,
    refetchInterval: flowState === "showing" ? BALANCE_POLL_MS : false
  });
  const currentCard =
    (liveCard?.id === currentCardId ? liveCard : undefined) ??
    (giftCards ?? []).find((card) => card.id === currentCardId);

  const currentSpendable =
    !!currentCard &&
    currentCard.status?.toLowerCase?.() === "active" &&
    currentCard.remaining_balance_cents > 0 &&
    !isCardHeld(currentCard);

  // ── Redemption token ────────────────────────────────────────────────
  const [tokenVersion, setTokenVersion] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const {
    data: tokenData,
    isFetching: tokenFetching,
    error: tokenError
  } = useQuery({
    queryKey: ["redemptionToken", currentCardId, tokenVersion],
    queryFn: () => giftCardApi.redemptionToken(currentCardId as string),
    staleTime: 0,
    enabled: isQueryEnabled && !!currentCardId && flowState === "showing" && currentSpendable,
    retry: (failureCount, err: unknown) => {
      const httpErr = err as HttpError;
      if (httpErr.status === 422 || httpErr.status === 403) return false;
      return failureCount < 1;
    }
  });

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const remainingSeconds = useMemo(() => {
    if (!tokenData?.expires_at) return 0;
    const diffMs = new Date(tokenData.expires_at).getTime() - now;
    return Math.max(0, Math.round(diffMs / 1000));
  }, [tokenData?.expires_at, now]);
  const tokenExpired = !!tokenData && remainingSeconds <= 0;

  // ── Capture detection → state transitions ───────────────────────────
  // Deliberately reads index/queueIds from the closure: two rapid calls in
  // the same frame both compute the same `next`, so advancing is idempotent
  // (a double tap or a poll racing the button can never skip a card).
  const advance = useCallback(() => {
    setPartialCents(null);
    if (!queueIds) return;
    const next = index + 1;
    if (next >= queueIds.length) {
      setFlowState("finished");
      return;
    }
    setIndex(next);
    setFlowState("showing");
    setTokenVersion((v) => v + 1);
  }, [queueIds, index]);

  useEffect(() => {
    if (!currentCard || flowState !== "showing") return;

    const baseline = baselines.current.get(currentCard.id);
    if (baseline === undefined) {
      baselines.current.set(currentCard.id, currentCard.remaining_balance_cents);
      return;
    }

    const remaining = currentCard.remaining_balance_cents;
    if (remaining >= baseline) return;

    const delta = baseline - remaining;
    baselines.current.set(currentCard.id, remaining);
    setSessionCents((total) => total + delta);
    hapticSuccess();

    if (remaining === 0) {
      setFlowState("celebrating");
    } else {
      // Partial capture: the card still has balance, so stay on it with a
      // fresh code (the previous token was consumed by the capture).
      setPartialCents(delta);
      setTokenVersion((v) => v + 1);
    }
  }, [currentCard, flowState]);

  useEffect(() => {
    if (flowState !== "celebrating") return;
    const timer = setTimeout(advance, CELEBRATE_MS);
    return () => clearTimeout(timer);
  }, [flowState, advance]);

  useEffect(() => {
    if (flowState === "finished" && sessionCents > 0) hapticSuccess();
  }, [flowState, sessionCents]);

  // ── Crumbs-first preference (reorders only the not-yet-shown tail) ──
  const toggleCrumbsFirst = useCallback(() => {
    if (crumbsFirst === null || !group) return;
    const nextValue = !crumbsFirst;
    setCrumbsFirst(nextValue);
    AsyncStorage.setItem(CRUMBS_FIRST_STORAGE_KEY, String(nextValue)).catch(() => {});
    hapticImpactLight();
    setQueueIds((ids) => {
      if (!ids) return ids;
      const shown = ids.slice(0, index + 1);
      const remainingCards = group.activeCards.filter(
        (card) => ids.includes(card.id) && !shown.includes(card.id)
      );
      const reordered = buildRedemptionQueue(remainingCards, { crumbsFirst: nextValue });
      return [...shown, ...reordered.map((card) => card.id)];
    });
  }, [crumbsFirst, group, index]);

  // ── Peripherals: brightness up while a code is visible ──────────────
  useFocusEffect(
    useCallback(() => {
      let saved: number | null = null;
      let active = true;
      (async () => {
        try {
          saved = await Brightness.getBrightnessAsync();
          if (active) await Brightness.setBrightnessAsync(1);
        } catch {
          // ignore: keep the token visible even if brightness control fails
        }
      })();
      return () => {
        active = false;
        if (saved !== null) {
          Brightness.setBrightnessAsync(saved).catch(() => {});
        }
      };
    }, [])
  );

  // The merchant redeemed while this flow was open; refresh the wallet so
  // balances are current when the user navigates back.
  useEffect(() => {
    return () => {
      queryClient.invalidateQueries({ queryKey: ["giftCards"] });
    };
  }, [queryClient]);

  const friendlyTokenError = useMemo(() => {
    if (!tokenError) return null;
    const err = tokenError as HttpError;
    if (err.status === 422) return "La tarjeta está inactiva o no puede generar un código.";
    if (err.status === 403) return "No puedes canjear esta tarjeta.";
    return err.error?.message ?? "No pudimos generar el código.";
  }, [tokenError]);

  const handleRegenerate = () => {
    hapticImpactLight();
    setCooldown(4);
    setTokenVersion((v) => v + 1);
  };

  // ── Render ──────────────────────────────────────────────────────────
  if (!queueIds) {
    return (
      <Screen scrollable edges={["left", "right"]}>
        <Card style={styles.loadingCard}>
          <SkeletonBlock width="55%" height={22} radius={11} />
          <SkeletonBlock height={72} radius={theme.radius.md} />
          <SkeletonBlock height={220} radius={theme.radius.md} />
        </Card>
      </Screen>
    );
  }

  if (flowState === "finished") {
    return (
      <Screen centerContent edges={["left", "right"]}>
        <Animated.View entering={FadeIn.duration(250)} style={styles.fullWidth}>
          {queueIds.length === 0 ? (
            <EmptyStateCard
              icon="credit-card"
              title="Sin saldo para canjear"
              message="No tienes tarjetas disponibles de este comercio en este momento."
              actionLabel="Volver"
              onAction={() => navigation.goBack()}
            />
          ) : (
            <Card style={styles.finishedCard}>
              <View style={styles.finishedIcon}>
                <Feather name="check-circle" size={44} color={theme.colors.success} />
              </View>
              <Text style={styles.finishedTitle}>Canje completado</Text>
              <Text style={styles.finishedSubtitle}>
                {sessionCents > 0
                  ? `Canjeaste ${formatMoney(centsToDollars(sessionCents), group?.currency)} en esta visita.`
                  : "No se registraron canjes en esta visita."}
              </Text>
              <Button
                label="Volver a mi billetera"
                onPress={() => navigation.goBack()}
                style={styles.finishedButton}
              />
            </Card>
          )}
        </Animated.View>
      </Screen>
    );
  }

  const isCrumb = !!currentCard && currentCard.remaining_balance_cents < CRUMB_THRESHOLD_CENTS;
  const hasCrumbsInQueue = queueIds.some((id) => {
    const card = (giftCards ?? []).find((c) => c.id === id);
    return !!card && card.remaining_balance_cents > 0 && card.remaining_balance_cents < CRUMB_THRESHOLD_CENTS;
  });
  const isLastCard = index >= queueIds.length - 1;
  const senderLabel = currentCard ? senderShortName(currentCard) : null;

  return (
    <Screen scrollable edges={["left", "right"]}>
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>
          Tarjeta {index + 1} de {queueIds.length}
        </Text>
        {queueIds.length > 1 && hasCrumbsInQueue ? (
          <Pressable
            style={[styles.crumbChip, crumbsFirst ? styles.crumbChipActive : null]}
            onPress={toggleCrumbsFirst}
            accessibilityRole="switch"
            accessibilityState={{ checked: !!crumbsFirst }}
            accessibilityLabel="Usar saldos pequeños primero"
          >
            <Feather
              name={crumbsFirst ? "check-circle" : "circle"}
              size={13}
              color={crumbsFirst ? theme.colors.secondary : theme.colors.muted}
            />
            <Text style={[styles.crumbChipLabel, crumbsFirst ? styles.crumbChipLabelActive : null]}>
              Saldos pequeños primero
            </Text>
          </Pressable>
        ) : null}
      </View>

      {currentCard ? (
        <Animated.View
          key={currentCard.id}
          entering={SlideInRight.duration(280)}
          exiting={SlideOutLeft.duration(220)}
        >
          <Card>
            <View style={styles.cardStrip}>
              <View style={styles.stripLogoBox}>
                {currentCard.merchant_logo_url ? (
                  <Image
                    source={{ uri: currentCard.merchant_logo_url }}
                    style={styles.stripLogo}
                  />
                ) : (
                  <Text style={styles.stripLogoInitial}>
                    {(group?.merchantLabel ?? "C").charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.stripInfo}>
                <Text style={styles.stripMerchant} numberOfLines={1}>
                  {group?.merchantLabel ?? "Comercio"}
                </Text>
                <Text style={styles.stripSender} numberOfLines={1}>
                  {senderLabel ? `De: ${senderLabel}` : "Tarjeta de regalo"}
                </Text>
              </View>
              <Text style={styles.stripBalance}>
                {formatMoney(centsToDollars(currentCard.remaining_balance_cents), currentCard.currency)}
              </Text>
            </View>

            <Banner
              icon={isCrumb ? "zap" : "credit-card"}
              compact
              message={
                isCrumb
                  ? `Pide cobrar ${formatMoney(
                      centsToDollars(currentCard.remaining_balance_cents),
                      currentCard.currency
                    )} — el saldo completo de esta tarjeta.`
                  : `Saldo disponible: ${formatMoney(
                      centsToDollars(currentCard.remaining_balance_cents),
                      currentCard.currency
                    )}. El cajero ingresa el monto a cobrar.`
              }
              style={styles.chargeHint}
            />

            {partialCents ? (
              <Text style={styles.partialNotice}>
                Canje de {formatMoney(centsToDollars(partialCents), currentCard.currency)} registrado.
                Nuevo código listo.
              </Text>
            ) : null}

            {!currentSpendable ? (
              <Banner
                icon="lock"
                tone="warning"
                message="Esta tarjeta no está disponible para canje en este momento."
                style={styles.chargeHint}
              />
            ) : null}

            {friendlyTokenError ? <Text style={styles.error}>{friendlyTokenError}</Text> : null}
            {tokenFetching && !tokenData ? <Text style={styles.muted}>Generando...</Text> : null}

            {tokenData && currentSpendable ? (
              <View style={styles.tokenContainer}>
                <View style={styles.codeArea}>
                  <View style={styles.qrWrapper}>
                    <QRCode value={tokenData.token} size={170} />
                  </View>
                  <View style={styles.barcodeWrapper}>
                    <Barcode
                      value={tokenData.token}
                      options={{
                        format: "CODE128",
                        width: 2,
                        height: 64,
                        displayValue: false,
                        margin: 10,
                        background: theme.colors.card
                      }}
                    />
                  </View>
                  <Text style={styles.tokenText}>{formatTokenForDisplay(tokenData.token)}</Text>

                  {tokenExpired && flowState === "showing" ? (
                    <View
                      style={styles.codeOverlay}
                      accessible
                      accessibilityRole="alert"
                      accessibilityLabel="Código vencido. Genera un nuevo código para canjear."
                    >
                      <Feather name="clock" size={40} color={theme.colors.danger} />
                      <Text style={styles.expiredTitle}>Código vencido</Text>
                    </View>
                  ) : null}

                  {flowState === "celebrating" ? (
                    <Animated.View
                      entering={FadeIn.duration(200)}
                      style={styles.codeOverlay}
                      accessible
                      accessibilityRole="alert"
                      accessibilityLabel="Tarjeta canjeada por completo."
                    >
                      <Feather name="check-circle" size={44} color={theme.colors.success} />
                      <Text style={styles.celebrateTitle}>¡Tarjeta canjeada!</Text>
                    </Animated.View>
                  ) : null}
                </View>

                {flowState === "showing" && !tokenExpired ? (
                  <>
                    <Text style={styles.muted}>Expira a las {toDisplayTime(tokenData.expires_at)}</Text>
                    <Text style={styles.countdown}>
                      Tiempo restante: {formatCountdown(remainingSeconds)}
                    </Text>
                  </>
                ) : null}
              </View>
            ) : null}

            {currentSpendable && flowState === "showing" ? (
              <Button
                label={tokenExpired ? "Generar nuevo código" : "Regenerar"}
                onPress={handleRegenerate}
                disabled={tokenFetching || cooldown > 0 || !accessToken}
                variant="ghost"
                style={styles.regenerateButton}
              />
            ) : null}
            {cooldown > 0 ? (
              <Text style={styles.cooldown}>Espera {cooldown}s antes de regenerar.</Text>
            ) : null}
          </Card>
        </Animated.View>
      ) : null}

      <View style={styles.footer}>
        <Button
          label={isLastCard ? "Finalizar" : "Siguiente tarjeta"}
          onPress={advance}
          variant="ghost"
          style={styles.nextButton}
          accessibilityLabel={
            isLastCard ? "Finalizar el canje" : "Pasar a la siguiente tarjeta sin canjear esta"
          }
        />
        {sessionCents > 0 ? (
          <Text style={styles.sessionTotal}>
            Canjeado en esta visita:{" "}
            {formatMoney(centsToDollars(sessionCents), group?.currency)}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  fullWidth: {
    width: "100%"
  },
  loadingCard: {
    gap: theme.spacing(1.5)
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1.25)
  },
  progressLabel: {
    fontFamily: theme.fonts.extraBold,
    fontSize: theme.typography.subheading - 2,
    color: theme.colors.secondary
  },
  crumbChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(0.5),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.card,
    paddingVertical: theme.spacing(0.6),
    paddingHorizontal: theme.spacing(1)
  },
  crumbChipActive: {
    backgroundColor: "#FFF7E6",
    borderColor: "rgba(252, 165, 15, 0.55)"
  },
  crumbChipLabel: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 12,
    color: theme.colors.muted
  },
  crumbChipLabelActive: {
    color: theme.colors.secondary
  },
  cardStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1.2),
    marginBottom: theme.spacing(1.5)
  },
  stripLogoBox: {
    width: 56,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#F8FAFB",
    paddingHorizontal: theme.spacing(0.75),
    paddingVertical: theme.spacing(0.5)
  },
  stripLogo: {
    width: "100%",
    height: "100%",
    resizeMode: "contain"
  },
  stripLogoInitial: {
    fontFamily: theme.fonts.black,
    fontSize: 18,
    color: theme.colors.secondary
  },
  stripInfo: {
    flex: 1,
    minWidth: 0,
    gap: theme.spacing(0.2)
  },
  stripMerchant: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.typography.body - 1,
    color: theme.colors.text
  },
  stripSender: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.typography.small,
    color: theme.colors.muted
  },
  stripBalance: {
    fontFamily: theme.fonts.extraBold,
    fontSize: 20,
    color: theme.colors.secondary
  },
  chargeHint: {
    marginBottom: theme.spacing(1.25)
  },
  partialNotice: {
    color: theme.colors.success,
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.typography.small,
    marginBottom: theme.spacing(1)
  },
  tokenContainer: {
    alignItems: "center",
    gap: theme.spacing(1.25)
  },
  codeArea: {
    alignSelf: "stretch",
    alignItems: "center",
    gap: theme.spacing(1.25)
  },
  qrWrapper: {
    padding: theme.spacing(1),
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border
  },
  barcodeWrapper: {
    padding: theme.spacing(1),
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    overflow: "hidden"
  },
  tokenText: {
    fontSize: 22,
    fontFamily: theme.fonts.bold,
    letterSpacing: 1.1,
    color: theme.colors.text
  },
  codeOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing(1),
    backgroundColor: "rgba(255, 255, 255, 0.93)",
    borderRadius: theme.radius.md,
    zIndex: 1
  },
  expiredTitle: {
    fontSize: theme.typography.subheading,
    fontFamily: theme.fonts.bold,
    color: theme.colors.danger
  },
  celebrateTitle: {
    fontSize: theme.typography.subheading,
    fontFamily: theme.fonts.bold,
    color: theme.colors.success
  },
  muted: {
    color: theme.colors.muted
  },
  countdown: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.semiBold
  },
  error: {
    color: theme.colors.danger,
    marginBottom: theme.spacing(1)
  },
  regenerateButton: {
    marginTop: theme.spacing(1.5)
  },
  cooldown: {
    color: theme.colors.muted,
    marginTop: theme.spacing(0.5)
  },
  footer: {
    marginTop: theme.spacing(1.5),
    gap: theme.spacing(1),
    alignItems: "center"
  },
  nextButton: {
    alignSelf: "stretch"
  },
  sessionTotal: {
    color: theme.colors.captionMuted,
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.typography.small
  },
  finishedCard: {
    alignItems: "center",
    gap: theme.spacing(1)
  },
  finishedIcon: {
    marginBottom: theme.spacing(0.5)
  },
  finishedTitle: {
    fontSize: theme.typography.subheading,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text
  },
  finishedSubtitle: {
    color: theme.colors.muted,
    textAlign: "center",
    lineHeight: 21
  },
  finishedButton: {
    alignSelf: "stretch",
    marginTop: theme.spacing(1)
  }
});

export default MerchantRedemptionFlowScreen;
