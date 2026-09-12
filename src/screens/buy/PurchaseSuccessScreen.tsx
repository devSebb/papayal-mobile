import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute, useFocusEffect, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import Screen from "../../ui/components/Screen";
import Card from "../../ui/components/Card";
import Button from "../../ui/components/Button";
import { theme } from "../../ui/theme";
import { HomeStackParamList } from "../../navigation";
import { usePurchaseDraft } from "../../domain/purchase/purchaseDraftStore";
import { hapticSuccess } from "../../utils/haptics";
import { giftCardApi } from "../../api/endpoints";
import { shareGiftCardLoad } from "../../sharing/shareGiftCard";
import { centsToDollars, formatMoney } from "../../utils/money";

type PurchaseSuccessRouteProp = RouteProp<HomeStackParamList, "PurchaseSuccess">;

/**
 * Confirmation for a payment that has already succeeded. Which of the three
 * §4.4 cases it is — a first card, a reload of someone's card, or the buyer
 * reloading their own — is decided by `target` from the PaymentIntent, so the
 * copy matches what actually happened rather than what was intended.
 */
const PurchaseSuccessScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const route = useRoute<PurchaseSuccessRouteProp>();
  const { resetDraft } = usePurchaseDraft();

  const merchantName = route.params?.merchantName ?? "el comercio";
  const amountLabel = route.params?.amountLabel ?? "";
  const recipientName = route.params?.recipientName?.trim().split(/\s+/)[0] ?? null;
  const paymentIntentId = route.params?.paymentIntentId;
  const cardReady = route.params?.cardReady ?? false;
  const isSelf = route.params?.self ?? false;
  const isReload = route.params?.isReload ?? false;
  const projectedBalanceCents = route.params?.projectedBalanceCents;

  // Celebrate the confirmed payment once, when the screen first appears.
  React.useEffect(() => {
    hapticSuccess();
  }, []);

  // Resolve the card + load so the buyer can share THIS load's claim link
  // right away. The webhook usually finished before this screen (cardReady),
  // so this normally resolves on the first try.
  const { data: resolved } = useQuery({
    queryKey: ["giftCardByIntent", paymentIntentId],
    queryFn: () => giftCardApi.byPaymentIntent(paymentIntentId as string),
    enabled: !!paymentIntentId,
    retry: 3,
    retryDelay: 2000
  });
  const giftCardId = resolved?.id ? String(resolved.id) : route.params?.giftCardId;
  const loadId = resolved?.load?.id ? String(resolved.load.id) : undefined;
  const [sharing, setSharing] = React.useState(false);

  const shareGift = async () => {
    if (!giftCardId) return;
    setSharing(true);
    try {
      await shareGiftCardLoad(giftCardId, loadId);
    } finally {
      setSharing(false);
    }
  };

  // Only reset draft when leaving the screen, not when mounting
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        resetDraft();
      };
    }, [resetDraft])
  );

  const goToWallet = () => {
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate("WalletTab" as never);
    } else {
      navigation.navigate("Home");
    }
  };

  const goToHome = () => {
    resetDraft();
    navigation.navigate("Home");
  };

  const startAnother = () => {
    resetDraft();
    navigation.navigate("BuyGiftCardStart", isSelf ? { self: true } : undefined);
  };

  // §4.4 "PurchaseSuccess"
  const title = isSelf || isReload ? "¡Recarga confirmada!" : "¡Tarjeta enviada!";
  const who = recipientName ?? "Tu destinatario";
  const body = isSelf
    ? `Tu tarjeta de regalo digital de ${merchantName} ya tiene ${amountLabel} más.`
    : isReload
    ? `Añadimos ${amountLabel} a la tarjeta de ${merchantName} de ${who}. Ya le avisamos.`
    : `${who} recibirá una tarjeta de regalo digital de ${merchantName} con ${amountLabel}. Ya le avisamos.`;

  return (
    <Screen scrollable centerContent>
      <View style={styles.navRow}>
        <Pressable
          onPress={goToHome}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          style={styles.backButton}
        >
          <Feather name="x" size={22} color={theme.colors.text} />
        </Pressable>
      </View>

      <Card style={styles.card}>
        <View style={styles.iconCircle}>
          <Feather name="check" size={32} color="#fff" />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{body}</Text>

        <View style={styles.summary}>
          <Text style={styles.summaryText}>{merchantName}</Text>
          {amountLabel ? <Text style={styles.summaryAmount}>{amountLabel}</Text> : null}
          {typeof projectedBalanceCents === "number" ? (
            <Text style={styles.summaryRecipient}>
              Saldo de la tarjeta: {formatMoney(centsToDollars(projectedBalanceCents), "USD")}
            </Text>
          ) : null}
        </View>

        {cardReady ? null : (
          <View style={styles.infoBox}>
            <Feather name="clock" size={16} color={theme.colors.secondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoText}>Puede tardar unos segundos en reflejarse.</Text>
              <Text style={styles.infoHint}>
                Si no lo ves de inmediato, desliza para actualizar.
              </Text>
            </View>
          </View>
        )}

        {__DEV__ && paymentIntentId ? (
          <Text style={styles.debugText}>PaymentIntent: {paymentIntentId}</Text>
        ) : null}

        <View style={styles.actions}>
          {!isSelf && giftCardId ? (
            <Button
              label="Compartir por WhatsApp"
              onPress={shareGift}
              loading={sharing}
              variant="secondary"
              style={styles.shareBtn}
              accessibilityLabel="Compartir la tarjeta de regalo por WhatsApp"
            />
          ) : null}
          <Button
            label={isSelf ? "Ver mi tarjeta" : "Ver mis tarjetas"}
            onPress={goToWallet}
            variant="primary"
            style={styles.primaryBtn}
          />
          <Button
            label={isSelf ? "Recargar otra" : "Enviar otra"}
            onPress={startAnother}
            variant="ghost"
            style={styles.secondaryBtn}
          />
          <Button
            label="Regresar a inicio"
            onPress={goToHome}
            variant="ghost"
            style={styles.homeBtn}
          />
        </View>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "100%",
    gap: theme.spacing(1.2),
    alignItems: "center"
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.success,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.success,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 6
  },
  title: {
    fontSize: 28,
    fontFamily: theme.fonts.extraBold,
    color: theme.colors.text
  },
  subtitle: {
    textAlign: "center",
    color: theme.colors.muted,
    lineHeight: 20
  },
  navRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: theme.spacing(1)
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent"
  },
  summary: {
    width: "100%",
    gap: theme.spacing(0.5),
    alignItems: "center",
    marginTop: theme.spacing(0.5)
  },
  summaryText: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    fontSize: theme.typography.subheading
  },
  summaryAmount: {
    fontSize: 22,
    fontFamily: theme.fonts.extraBold,
    color: theme.colors.text
  },
  summaryRecipient: {
    color: theme.colors.muted
  },
  infoBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFF7E6",
    padding: theme.spacing(1.2),
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.primary,
    marginTop: theme.spacing(1)
  },
  infoContent: {
    flex: 1,
    gap: 4
  },
  infoText: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    lineHeight: 18
  },
  infoHint: {
    color: theme.colors.muted,
    fontSize: theme.typography.small - 1,
    fontFamily: theme.fonts.italic
  },
  debugText: {
    color: theme.colors.muted,
    fontSize: 10,
    fontFamily: theme.fonts.medium,
    letterSpacing: 0.2
  },
  actions: {
    width: "100%",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1)
  },
  primaryBtn: {
    width: "100%",
    paddingVertical: theme.spacing(1.4),
    borderRadius: 18
  },
  shareBtn: {
    width: "100%",
    paddingVertical: theme.spacing(1.4),
    borderRadius: 18
  },
  secondaryBtn: {
    width: "100%",
    paddingVertical: theme.spacing(1.2),
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.secondary
  },
  homeBtn: {
    width: "100%",
    paddingVertical: theme.spacing(1.2),
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.secondary
  }
});

export default PurchaseSuccessScreen;
