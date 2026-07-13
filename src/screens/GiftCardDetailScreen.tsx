import React, { useMemo, useState } from "react";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Image, StyleSheet, Text, View } from "react-native";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import Button from "../ui/components/Button";
import Banner from "../ui/components/Banner";
import { EmptyStateCard, SkeletonBlock } from "../ui/components/StateViews";
import { theme } from "../ui/theme";
import { giftCardApi, meApi, merchantsApi } from "../api/endpoints";
import type { HttpError } from "../api/http";
import { partnerRedemption } from "../domain/merchants/partnerRedemption";
import { WalletStackParamList } from "../navigation";
import { useAuth } from "../auth/authStore";
import { centsToDollars, formatMoney } from "../utils/money";
import { getInitials } from "../utils/initials";
import { shareGiftCard } from "../sharing/shareGiftCard";

const merchantPlaceholder = require("../../assets/merchant-default.png");
const avatarPlaceholder = require("../../assets/avatar-default.png");

// Spanish-formatted unlock time for the hold banner. Keeps the format
// consistent across the app (e.g. "25 de mayo a las 14:30").
const HOLD_UNLOCK_FORMATTER = new Intl.DateTimeFormat("es-EC", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});
const formatHoldUnlock = (d: Date) => HOLD_UNLOCK_FORMATTER.format(d);

const GiftCardDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<WalletStackParamList, "GiftCardDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<WalletStackParamList>>();
  const { id } = route.params;
  const { accessToken } = useAuth();
  const isSignedIn = !!accessToken;

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: meApi.me,
    enabled: isSignedIn
  });

  // Fetch gift card detail
  const { data, isLoading, error } = useQuery({
    queryKey: ["giftCard", id],
    queryFn: () => giftCardApi.detail(id),
    enabled: isSignedIn
  });

  // Merchant detail for the redemption disclaimer (partner-routed merchants
  // are paid at Medicity / Farmacias Económicas). Shares the ["merchant", id]
  // cache with the browse screens; non-blocking — the card renders without it.
  const { data: merchantDetail } = useQuery({
    queryKey: ["merchant", data?.merchant_id],
    queryFn: () => merchantsApi.detail(data?.merchant_id as string),
    enabled: isSignedIn && !!data?.merchant_id
  });
  const partner = partnerRedemption(merchantDetail);

  const isBusy = !isSignedIn || isLoading;

  // Determine if we should show sender info:
  // - User must be signed in
  // - Gift card must be received by the current user (not sent by them)
  const shouldShowSender = useMemo(() => {
    if (!isSignedIn || !currentUser?.id || !data?.recipient_id) return false;
    // Only show if the current user is the recipient (received card)
    return data.recipient_id === currentUser.id;
  }, [isSignedIn, currentUser?.id, data?.recipient_id]);

  // Sender-side actions (share/resend) — the backend enforces this too.
  const isSender = useMemo(() => {
    if (!isSignedIn || !currentUser?.id || !data?.sender_id) return false;
    return data.sender_id === currentUser.id;
  }, [isSignedIn, currentUser?.id, data?.sender_id]);

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
          (httpErr.error?.details as { retry_in_seconds?: number } | undefined)?.retry_in_seconds ?? 0
        );
        setResendNotice({
          tone: "warning",
          message:
            retryIn > 3600
              ? "Alcanzaste el límite de reenvíos por hoy. Inténtalo mañana."
              : `Ya la reenviamos hace poco. Intenta de nuevo en ${Math.max(1, Math.ceil(retryIn / 60))} min.`
        });
      } else {
        setResendNotice({
          tone: "warning",
          message: "No pudimos reenviar la notificación. Revisa tu conexión e inténtalo de nuevo."
        });
      }
    }
  });

  // Derive sender display name
  const senderDisplayName = useMemo(() => {
    if (!data?.sender) return null;
    return (
      data.sender.full_name?.trim() ||
      [data.sender.name, data.sender.last_name].filter(Boolean).join(" ").trim() ||
      data.sender.name?.trim() ||
      null
    );
  }, [data?.sender]);

  // Check if there's a valid note to display
  const hasNote = Boolean(data?.note?.trim());

  const amount = centsToDollars(data?.amount_cents);
  const remaining = centsToDollars(data?.remaining_balance_cents);

  // Security hold: backend only sends held_until while it's still in the
  // future; once the hold expires the field is null so we don't need to
  // re-compare against Date.now() except for safety as a tick-perfect guard.
  const heldUntilDate = data?.held_until ? new Date(data.held_until) : null;
  const isHeld = !!heldUntilDate && heldUntilDate.getTime() > Date.now();
  const canRedeem = data?.status === "active" && (data?.remaining_balance_cents ?? 0) > 0 && !isHeld;
  const statusLabelMap: Record<string, string> = {
    active: "Activa",
    redeemed: "Canjeada",
    expired: "Vencida",
    inactive: "Inactiva"
  };
  // Never surface the raw English status enum or a merchant UUID to the user.
  const statusLabel = data?.status ? statusLabelMap[data.status] ?? "—" : "—";
  const merchantName =
    data?.merchant_store_name?.trim() ||
    data?.store_name?.trim() ||
    data?.merchant_name?.trim() ||
    data?.store?.name?.trim() ||
    data?.merchant?.name?.trim() ||
    null;
  const merchantLabel = merchantName ?? "Comercio";
  // Title shows the merchant name when we have one; never the card UUID.
  const titleLabel = merchantName ?? "Tarjeta de regalo";
  const hasLogo = Boolean(data?.merchant_logo_url);
  const merchantInitial = merchantLabel.charAt(0).toUpperCase();
  const logoSource = hasLogo ? { uri: data?.merchant_logo_url as string } : merchantPlaceholder;

  if (isBusy) {
    return (
      <Screen scrollable edges={["left", "right"]}>
        <Card style={styles.loadingCard}>
          <View style={styles.header}>
            <SkeletonBlock width={64} height={64} radius={32} />
            <View style={styles.headerText}>
              <SkeletonBlock width="72%" height={22} radius={11} />
              <SkeletonBlock width="54%" height={18} radius={9} />
            </View>
          </View>
          <View style={styles.loadingRows}>
            <SkeletonBlock height={28} />
            <SkeletonBlock height={28} />
            <SkeletonBlock height={28} />
          </View>
          <SkeletonBlock height={48} radius={theme.radius.md} style={styles.loadingButton} />
        </Card>
      </Screen>
    );
  }

  if (error || !data) {
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

  return (
    <Screen scrollable edges={["left", "right"]}>
      <Card>
          <View style={styles.header}>
            <View style={styles.logoWrapper}>
              <Image source={logoSource} style={styles.logo} />
              {!hasLogo ? <Text style={styles.logoInitial}>{merchantInitial}</Text> : null}
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{titleLabel}</Text>
              <Text style={styles.muted}>Comercio: {merchantLabel}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Monto</Text>
            <Text style={styles.value}>{formatMoney(amount, data.currency)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Saldo</Text>
            <Text style={styles.value}>{formatMoney(remaining, data.currency)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Estado</Text>
            <Text style={styles.value}>{statusLabel}</Text>
          </View>

          {/* Sender info - only shown for received gift cards */}
          {shouldShowSender && data.sender ? (
            <View style={styles.senderSection}>
              <Text style={styles.sectionLabel}>De</Text>
              <View style={styles.senderRow}>
                <View style={styles.senderAvatarWrapper}>
                  {data.sender.avatar_url ? (
                    <Image
                      source={{ uri: data.sender.avatar_url }}
                      style={styles.senderAvatar}
                    />
                  ) : (
                    <>
                      <Image source={avatarPlaceholder} style={styles.senderAvatar} />
                      <Text style={styles.senderInitials}>
                        {getInitials(senderDisplayName)}
                      </Text>
                    </>
                  )}
                </View>
                <View style={styles.senderInfo}>
                  <Text style={styles.senderName}>{senderDisplayName || "—"}</Text>
                  {data.sender.email ? (
                    <Text style={styles.senderEmail}>{data.sender.email}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          ) : null}

          {/* Note/message - only shown for received gift cards with a note */}
          {shouldShowSender && hasNote ? (
            <View style={styles.noteSection}>
              <Text style={styles.sectionLabel}>Mensaje</Text>
              <View style={styles.noteBox}>
                <Text style={styles.noteText}>{data.note}</Text>
              </View>
            </View>
          ) : null}

          {isHeld && heldUntilDate ? (
            <View style={styles.holdBanner}>
              <Text style={styles.holdBannerTitle}>Verificación de seguridad</Text>
              <Text style={styles.holdBannerText}>
                Esta tarjeta estará disponible para canje el {formatHoldUnlock(heldUntilDate)}.
              </Text>
            </View>
          ) : null}

          {partner && data.status === "active" ? (
            <Banner
              icon="map-pin"
              title="Dónde canjear"
              message={`Para canjear esta tarjeta, paga en ${partner.label}.`}
              style={styles.partnerBanner}
            />
          ) : null}

          {canRedeem ? (
            <Button
              label="Generar token de canje"
              onPress={() => navigation.navigate("RedemptionToken", { id })}
              style={styles.button}
            />
          ) : isHeld ? null : (
            <Text style={styles.muted}>Esta tarjeta no es elegible para canje.</Text>
          )}

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
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1)
  },
  logoWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: theme.colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  logo: {
    width: "100%",
    height: "100%",
    resizeMode: "contain"
  },
  logoInitial: {
    position: "absolute",
    color: theme.colors.secondary,
    fontFamily: theme.fonts.bold,
    fontSize: theme.typography.subheading
  },
  headerText: {
    flex: 1,
    gap: theme.spacing(0.3)
  },
  title: {
    fontSize: theme.typography.subheading,
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing(1)
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.spacing(1)
  },
  label: {
    color: theme.colors.muted
  },
  value: {
    color: theme.colors.text,
    fontFamily: theme.fonts.semiBold
  },
  button: {
    marginTop: theme.spacing(2)
  },
  partnerBanner: {
    marginTop: theme.spacing(2)
  },
  holdBanner: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(1.5),
    borderRadius: theme.radius.md,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#F59E0B"
  },
  holdBannerTitle: {
    fontFamily: theme.fonts.bold,
    color: "#78350F",
    marginBottom: theme.spacing(0.5)
  },
  holdBannerText: {
    color: "#78350F",
    fontSize: theme.typography.small,
    lineHeight: 18
  },
  muted: {
    color: theme.colors.muted
  },
  loadingCard: {
    gap: theme.spacing(1.5)
  },
  loadingRows: {
    gap: theme.spacing(1),
    marginTop: theme.spacing(0.5)
  },
  loadingButton: {
    marginTop: theme.spacing(1)
  },
  fullWidthCard: {
    width: "100%"
  },
  // Sender section styles
  senderSection: {
    marginTop: theme.spacing(2),
    paddingTop: theme.spacing(2),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border
  },
  sectionLabel: {
    fontSize: theme.typography.small,
    color: theme.colors.muted,
    fontFamily: theme.fonts.semiBold,
    marginBottom: theme.spacing(1),
    textTransform: "uppercase",
    letterSpacing: 0.5
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
  senderEmail: {
    fontSize: theme.typography.small,
    color: theme.colors.muted
  },
  // Sender share/resend section
  shareSection: {
    marginTop: theme.spacing(2),
    paddingTop: theme.spacing(2),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    gap: theme.spacing(1)
  },
  shareHint: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    lineHeight: 19,
    marginTop: -theme.spacing(0.5)
  },
  // Note section styles
  noteSection: {
    marginTop: theme.spacing(2),
    paddingTop: theme.spacing(2),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border
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
  }
});

export default GiftCardDetailScreen;
