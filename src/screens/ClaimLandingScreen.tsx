import React, { useEffect } from "react";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Image, StyleSheet, Text, View } from "react-native";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import Button from "../ui/components/Button";
import Banner from "../ui/components/Banner";
import { EmptyStateCard, SkeletonBlock } from "../ui/components/StateViews";
import { theme } from "../ui/theme";
import { claimApi, giftCardApi } from "../api/endpoints";
import { useAuth } from "../auth/authStore";
import { setPendingPostAuthIntent } from "../navigation/postAuthIntent";
import type { AuthStackParamList, WalletStackParamList } from "../navigation";
import { centsToDollars, formatMoney } from "../utils/money";

const merchantPlaceholder = require("../../assets/merchant-default.png");

/**
 * Landing for papayal.app/claim/<token> deep links. Registered in BOTH the
 * auth stack and the wallet stack so a link works in every session state:
 *
 * - Signed out: shows the gift teaser and funnels into signup/login. The
 *   actual claim stays OTP-guarded at signup (the link is a doorway, not a
 *   key) — this screen only personalizes the way in.
 * - Signed in: resolves the card; if it's yours (recipient or sender) you
 *   land on the detail screen, otherwise a friendly "sent to someone else".
 */
type ClaimLandingNav = NativeStackNavigationProp<AuthStackParamList & WalletStackParamList>;
type ClaimLandingRoute = RouteProp<Pick<AuthStackParamList, "ClaimLanding">, "ClaimLanding">;

const ClaimLandingScreen: React.FC = () => {
  const route = useRoute<ClaimLandingRoute>();
  const navigation = useNavigation<ClaimLandingNav>();
  const { token } = route.params;
  const { accessToken } = useAuth();
  const isSignedIn = !!accessToken;

  const {
    data: teaser,
    isLoading: teaserLoading,
    error: teaserError
  } = useQuery({
    queryKey: ["claimTeaser", token],
    queryFn: () => claimApi.teaser(token),
    retry: false
  });

  const giftCardId = teaser ? String(teaser.gift_card_id) : null;

  // Signed in: check whether the card is already in this account's wallet
  // (recipient or sender). 404 means it belongs to someone else.
  const {
    data: ownCard,
    error: ownCardError,
    isLoading: ownCardLoading
  } = useQuery({
    queryKey: ["giftCard", giftCardId],
    queryFn: () => giftCardApi.detail(giftCardId as string),
    enabled: isSignedIn && !!giftCardId,
    retry: false
  });

  useEffect(() => {
    if (!ownCard || !giftCardId) return;
    // The wallet stack registration is the only signed-in entry point,
    // so replace() lands on the detail screen with WalletList behind it.
    navigation.replace("GiftCardDetail", { id: giftCardId });
  }, [ownCard, giftCardId, navigation]);

  const goToAuth = (screen: "Signup" | "Login") => {
    if (giftCardId) {
      setPendingPostAuthIntent({ type: "open_gift_card", giftCardId });
    }
    navigation.navigate(screen);
  };

  const senderLabel = teaser?.sender_first_name?.trim() || null;
  const amount = formatMoney(centsToDollars(teaser?.amount_cents), teaser?.currency);
  const merchantName = teaser?.merchant_name?.trim() || "Papayal";
  const hasLogo = Boolean(teaser?.merchant_logo_url);
  const logoSource = hasLogo ? { uri: teaser?.merchant_logo_url as string } : merchantPlaceholder;
  // If the recipient already has an account, lead with login instead of signup.
  const recipientRegistered = Boolean(teaser?.recipient_registered);

  if (teaserLoading || (isSignedIn && ownCardLoading)) {
    return (
      <Screen scrollable centerContent edges={["left", "right"]}>
        <Card style={styles.loadingCard}>
          <SkeletonBlock width={72} height={72} radius={36} style={styles.centered} />
          <SkeletonBlock width="70%" height={24} radius={12} style={styles.centered} />
          <SkeletonBlock width="45%" height={40} radius={12} style={styles.centered} />
          <SkeletonBlock height={48} radius={theme.radius.md} />
        </Card>
      </Screen>
    );
  }

  if (teaserError || !teaser || teaser.status !== "active") {
    return (
      <Screen centerContent edges={["left", "right"]}>
        <EmptyStateCard
          icon="gift"
          title="Este enlace ya no está activo"
          message="Puede que la tarjeta ya haya sido reclamada o que el enlace haya expirado. Pide a quien la envió que la comparta de nuevo desde la app."
          actionLabel="Entendido"
          onAction={() => navigation.goBack()}
          style={styles.fullWidthCard}
        />
      </Screen>
    );
  }

  // Signed in, but the card belongs to another account.
  if (isSignedIn && ownCardError) {
    return (
      <Screen centerContent edges={["left", "right"]}>
        <EmptyStateCard
          icon="gift"
          title="Este regalo es para otra persona"
          message={
            teaser.recipient_masked_phone
              ? `La tarjeta fue enviada al número ${teaser.recipient_masked_phone}. Solo esa persona puede reclamarla.`
              : "La tarjeta fue enviada a otro número o correo. Solo esa persona puede reclamarla."
          }
          actionLabel="Volver"
          onAction={() => navigation.goBack()}
          style={styles.fullWidthCard}
        />
      </Screen>
    );
  }

  // Signed out: the gift reveal.
  return (
    <Screen scrollable centerContent edges={["left", "right", "top"]}>
      <Card style={styles.revealCard}>
        <View style={styles.giftBadge}>
          <Text style={styles.giftEmoji}>🎁</Text>
        </View>

        <Text style={styles.title}>
          {senderLabel ? `${senderLabel} te envió un regalo` : "Te enviaron un regalo"}
        </Text>

        <View style={styles.merchantRow}>
          <View style={styles.logoWrapper}>
            <Image source={logoSource} style={styles.logo} />
          </View>
          <Text style={styles.merchantName}>{merchantName}</Text>
        </View>

        <Text style={styles.amount}>{amount}</Text>

        {teaser.note?.trim() ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>“{teaser.note.trim()}”</Text>
          </View>
        ) : null}

        <Banner
          icon="shield"
          title="Reclamo seguro"
          message={
            teaser.recipient_masked_phone
              ? `Crea tu cuenta con el número ${teaser.recipient_masked_phone} y confirma el código de verificación para recibirla.`
              : "Crea tu cuenta con el número o correo que recibió el mensaje y confirma el código de verificación."
          }
          style={styles.banner}
        />

        <View style={styles.actions}>
          {recipientRegistered ? (
            <>
              <Button label="Iniciar sesión y ver mi regalo" onPress={() => goToAuth("Login")} />
              <Button label="Crear cuenta" variant="ghost" onPress={() => goToAuth("Signup")} />
            </>
          ) : (
            <>
              <Button label="Crear cuenta y reclamar" onPress={() => goToAuth("Signup")} />
              <Button label="Ya tengo cuenta" variant="ghost" onPress={() => goToAuth("Login")} />
            </>
          )}
        </View>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  revealCard: {
    alignItems: "center",
    paddingVertical: theme.spacing(3),
    gap: theme.spacing(1.5)
  },
  giftBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7E6",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(252, 165, 15, 0.45)"
  },
  giftEmoji: {
    fontSize: 34
  },
  title: {
    fontSize: theme.typography.heading,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    textAlign: "center"
  },
  merchantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1)
  },
  logoWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  merchantName: {
    fontSize: theme.typography.body,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text
  },
  amount: {
    fontSize: 44,
    fontFamily: theme.fonts.black,
    color: theme.colors.secondary
  },
  noteBox: {
    alignSelf: "stretch",
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.sm,
    padding: theme.spacing(1.5)
  },
  noteText: {
    fontSize: theme.typography.body,
    color: theme.colors.text,
    fontFamily: theme.fonts.italic,
    lineHeight: 24,
    textAlign: "center"
  },
  banner: {
    alignSelf: "stretch"
  },
  actions: {
    alignSelf: "stretch",
    gap: theme.spacing(1),
    marginTop: theme.spacing(0.5)
  },
  loadingCard: {
    gap: theme.spacing(1.5)
  },
  centered: {
    alignSelf: "center"
  },
  fullWidthCard: {
    width: "100%"
  }
});

export default ClaimLandingScreen;
