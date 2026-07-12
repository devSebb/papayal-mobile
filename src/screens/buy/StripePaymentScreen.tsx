import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { CardField, useStripe } from "@stripe/stripe-react-native";

import Screen from "../../ui/components/Screen";
import Card from "../../ui/components/Card";
import Button from "../../ui/components/Button";
import { theme } from "../../ui/theme";
import { HomeStackParamList } from "../../navigation";
import { usePurchaseDraft } from "../../domain/purchase/purchaseDraftStore";
import { formatMoney } from "../../utils/money";
import {
  createGiftCardPaymentIntent,
  isPaymentError,
  PaymentError
} from "../../api/payments";
import { giftCardApi } from "../../api/endpoints";
import { HttpError } from "../../api/http";
import { GiftCard } from "../../types/api";
import CheckoutHeader from "./CheckoutHeader";

type PaymentPhase = "input" | "processing" | "confirming" | "generating";

const StripePaymentScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const queryClient = useQueryClient();
  const { confirmPayment } = useStripe();
  const { draft, setQuote } = usePurchaseDraft();

  const [cardComplete, setCardComplete] = useState(false);
  const [cardDetails, setCardDetails] = useState<{
    complete: boolean;
    brand?: string;
    last4?: string;
    expiryMonth?: number;
    expiryYear?: number;
  } | null>(null);
  const [phase, setPhase] = useState<PaymentPhase>("input");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

  // Validate draft on mount
  useEffect(() => {
    if (!draft.merchant || !draft.amount_cents || !draft.recipient) {
      navigation.replace("BuyGiftCardStart");
    }
  }, [draft.amount_cents, draft.merchant, draft.recipient, navigation]);

  // Prevent back navigation during payment processing
  useEffect(() => {
    const isProcessing = phase !== "input";

    const onBackPress = () => {
      if (isProcessing) {
        // Block back button during payment
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, [phase]);

  // BackHandler only covers Android hardware back; iOS swipe-back must be
  // blocked via the navigator gesture while a payment is in flight.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: phase === "input" });
    return () => {
      navigation.setOptions({ gestureEnabled: true });
    };
  }, [navigation, phase]);

  const amountLabel = formatMoney(
    draft.amount_cents ? draft.amount_cents / 100 : null,
    draft.currency
  );
  // Server quote (fetched on the confirmation screen; refreshed from the
  // payment_intent response). Total falls back to the card amount when no
  // quote is available — identical while fees are 0.
  const feeCents = draft.quote?.fee_cents ?? 0;
  const feeLabel = formatMoney(feeCents / 100, draft.quote?.currency ?? draft.currency);
  const totalLabel = draft.quote
    ? formatMoney(draft.quote.total_cents / 100, draft.quote.currency)
    : amountLabel;

  const canPay =
    cardComplete &&
    draft.merchant?.id &&
    draft.amount_cents &&
    draft.amount_cents > 0 &&
    (draft.recipient?.email || draft.recipient?.phone) &&
    phase === "input";

  const handleCardChange = useCallback(
    (details: {
      complete: boolean;
      brand?: string;
      last4?: string;
      expiryMonth?: number;
      expiryYear?: number;
    }) => {
      setCardComplete(details.complete);
      setCardDetails(details);
      // Clear error when user modifies card
      if (errorBanner) {
        setErrorBanner(null);
      }
    },
    [errorBanner]
  );

  const handlePay = async () => {
    if (!canPay) return;

    // Double-check that card is complete before proceeding
    if (!cardComplete || !cardDetails?.complete) {
      setErrorBanner("Por favor completa todos los datos de la tarjeta.");
      return;
    }

    setErrorBanner(null);
    setPhase("processing");

    // Step 1: Create PaymentIntent on backend
    let clientSecret: string;
    let piId: string;

    try {
      if (__DEV__) {
        console.log("[StripePayment] Creating PaymentIntent for draft:", draft.draft_id);
      }

      const result = await createGiftCardPaymentIntent(draft);
      clientSecret = result.clientSecret;
      piId = result.paymentIntentId;
      setPaymentIntentId(piId);
      // The PI response carries the authoritative breakdown actually charged.
      if (result.quote) {
        setQuote(result.quote);
      }

      if (__DEV__) {
        console.log("[StripePayment] PaymentIntent created:", piId);
      }
    } catch (err) {
      if (__DEV__) {
        console.error("[StripePayment] PaymentIntent creation failed:", err);
      }

      if (isPaymentError(err)) {
        const paymentErr = err as PaymentError;

        // Handle auth error - redirect to login
        if (paymentErr.type === "auth") {
          setErrorBanner(paymentErr.message);
          setPhase("input");
          // Could navigate to login here if needed
          return;
        }

        setErrorBanner(paymentErr.message);
      } else {
        setErrorBanner("No se pudo procesar el pago. Intenta nuevamente.");
      }

      setPhase("input");
      return;
    }

    // Step 2: Confirm payment with Stripe SDK
    // CRITICAL: Keep phase as "processing" (don't change to "confirming") to ensure CardField stays mounted
    // The CardField must remain in the render tree for confirmPayment to access card details
    let paymentConfirmedAt = Date.now();
    
    try {
      if (__DEV__) {
        console.log("[StripePayment] Confirming payment with Stripe SDK");
        console.log("[StripePayment] Card details:", {
          complete: cardDetails?.complete,
          brand: cardDetails?.brand,
          last4: cardDetails?.last4,
          expiryMonth: cardDetails?.expiryMonth,
          expiryYear: cardDetails?.expiryYear
        });
      }

      // Small delay to ensure CardField has fully synchronized card details with Stripe SDK
      // This helps prevent "Card details not complete" errors that can occur due to timing issues
      await new Promise((resolve) => setTimeout(resolve, 200));

      // DO NOT change phase here - CardField must stay mounted for confirmPayment to work
      const { error: confirmError, paymentIntent } = await confirmPayment(clientSecret, {
        paymentMethodType: "Card"
      });

      if (confirmError) {
        if (__DEV__) {
          console.error("[StripePayment] Stripe confirm error:", confirmError);
        }

        // Map Stripe errors to user-friendly Spanish messages
        const userMessage = mapStripeError(confirmError);
        setErrorBanner(userMessage);
        setPhase("input");
        return;
      }

      if (__DEV__) {
        console.log("[StripePayment] Payment confirmed:", paymentIntent?.id);
      }
      paymentConfirmedAt = Date.now();
    } catch (err) {
      if (__DEV__) {
        console.error("[StripePayment] Unexpected confirm error:", err);
      }

      setErrorBanner("Error al procesar el pago. Intenta nuevamente.");
      setPhase("input");
      return;
    }

    // Step 3: Payment succeeded, show "generating" state
    setPhase("generating");

    const merchantId = draft.merchant?.id;
    const amountCents = draft.amount_cents ?? undefined;
    const cardReady = await waitForGiftCardGeneration({
      paymentIntentId: piId,
      merchantId,
      amountCents,
      confirmedAt: paymentConfirmedAt
    });
    await queryClient.invalidateQueries({ queryKey: ["giftCards"] });

    navigation.navigate("PurchaseSuccess", {
      merchantName: draft.merchant?.name,
      amountLabel,
      recipientEmail: draft.recipient?.email,
      paymentIntentId: piId,
      cardReady
    });
  };

  const handleGoBack = () => {
    if (phase !== "input") return; // Block during processing
    navigation.goBack();
  };

  // Render loading states
  // NOTE: We only show full-screen loading for "generating" phase
  // During "processing", we keep the form visible (with CardField mounted) but show overlay
  if (phase === "generating") {
    return (
      <Screen scrollable centerContent>
        <Card style={styles.loadingCard}>
          <View style={styles.successIcon}>
            <Feather name="check" size={32} color="#fff" />
          </View>
          <Text style={styles.loadingTitle}>Pago confirmado</Text>
          <Text style={styles.loadingSubtitle}>Confirmando la creación de tu tarjeta...</Text>
          <ActivityIndicator
            size="small"
            color={theme.colors.primary}
            style={{ marginTop: 16 }}
          />
        </Card>
      </Screen>
    );
  }

  // Show loading overlay during processing, but keep CardField mounted
  const isProcessing = phase === "processing";

  return (
    <Screen scrollable>
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <Card style={styles.loadingCard}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingTitle}>Procesando pago...</Text>
            <Text style={styles.loadingSubtitle}>
              No cierres la aplicación
            </Text>
          </Card>
        </View>
      )}
      <CheckoutHeader
        step="payment"
        title="Pago"
        subtitle="Completa tu compra de forma segura con Stripe."
        onBack={handleGoBack}
      />

      {errorBanner ? (
        <Card style={[styles.sectionCard, styles.errorBanner]}>
          <View style={styles.errorRow}>
            <Feather name="alert-circle" size={18} color="#C62828" />
            <Text style={styles.errorText}>{errorBanner}</Text>
          </View>
        </Card>
      ) : null}

      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Resumen</Text>
          <Text style={styles.sectionHint}>{draft.merchant?.name ?? ""}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Monto</Text>
          <Text style={styles.summaryValue}>{amountLabel}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tarifa</Text>
          <Text style={styles.summaryValue}>{feeLabel}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total a pagar</Text>
          <Text style={[styles.summaryValue, styles.summaryTotal]}>{totalLabel}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Destinatario</Text>
          <Text style={styles.summaryValue}>{draft.recipient?.email ?? "—"}</Text>
        </View>
      </Card>

      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Método de pago</Text>
          <View style={styles.stripeSecure}>
            <Feather name="lock" size={12} color={theme.colors.muted} />
            <Text style={styles.stripeSecureText}>Pago seguro</Text>
          </View>
        </View>

        <CardField
          postalCodeEnabled={false}
          placeholders={{
            number: "4242 4242 4242 4242"
          }}
          cardStyle={{
            backgroundColor: "#F8FAFB",
            textColor: theme.colors.text,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 12,
            fontSize: 16,
            placeholderColor: theme.colors.muted
          }}
          style={styles.cardField}
          onCardChange={handleCardChange}
          // Keep CardField enabled but visually indicate processing
          // It must stay mounted for confirmPayment to access card details
        />

        <View style={styles.stripeFooter}>
          <Feather name="shield" size={14} color={theme.colors.muted} />
          <Text style={styles.stripeFooterText}>
            Pago seguro con Stripe. Nunca almacenamos tu tarjeta.
          </Text>
        </View>
      </Card>

      <Button
        label={`Pagar ${totalLabel}`}
        onPress={handlePay}
        disabled={!canPay || isProcessing}
        style={[styles.payButton, (!canPay || isProcessing) && styles.payButtonDisabled]}
      />
    </Screen>
  );
};

/**
 * Maps Stripe SDK errors to user-friendly Spanish messages.
 */
function mapStripeError(error: { code?: string; message?: string; declineCode?: string }): string {
  const { code, declineCode, message } = error;

  // Card declined errors
  if (code === "card_declined" || declineCode) {
    switch (declineCode) {
      case "insufficient_funds":
        return "Fondos insuficientes. Usa otra tarjeta.";
      case "lost_card":
      case "stolen_card":
        return "Esta tarjeta no puede ser utilizada. Contacta a tu banco.";
      case "expired_card":
        return "Tu tarjeta está vencida. Usa otra tarjeta.";
      case "incorrect_cvc":
        return "El código de seguridad es incorrecto.";
      case "processing_error":
        return "Error al procesar. Intenta nuevamente.";
      default:
        return "Tu tarjeta fue rechazada. Verifica los datos o usa otra tarjeta.";
    }
  }

  // Card details not complete - specific handling
  if (code === "Failed" || message?.toLowerCase().includes("card details not complete")) {
    return "Los datos de la tarjeta no están completos. Por favor verifica que todos los campos estén llenos correctamente.";
  }

  // Other common errors
  if (code === "incorrect_number") {
    return "El número de tarjeta es incorrecto.";
  }
  if (code === "invalid_expiry_month" || code === "invalid_expiry_year") {
    return "La fecha de expiración es inválida.";
  }
  if (code === "incorrect_cvc") {
    return "El código de seguridad es incorrecto.";
  }
  if (code === "expired_card") {
    return "Tu tarjeta está vencida. Usa otra tarjeta.";
  }

  // Network/connectivity
  if (code === "api_connection_error") {
    return "Error de conexión. Verifica tu internet e intenta nuevamente.";
  }

  // Generic fallback - only use Stripe's message if it's safe
  return "No se pudo procesar el pago. Verifica los datos e intenta nuevamente.";
}

/**
 * Polls for the gift card generated by the payment webhook.
 * Returns false after a bounded wait so the user can continue even if webhook
 * processing is still catching up.
 */
async function waitForGiftCardGeneration(params: {
  paymentIntentId: string;
  merchantId?: string;
  amountCents?: number;
  confirmedAt: number;
}): Promise<boolean> {
  const maxAttempts = 10;
  const pollIntervalMs = 1500;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const byPaymentIntent = await lookupGiftCardByPaymentIntent(params.paymentIntentId);
    if (byPaymentIntent) return true;

    const matchingWalletCard = await lookupMatchingWalletCard(params);
    if (matchingWalletCard) return true;

    if (attempt < maxAttempts - 1) {
      await delay(pollIntervalMs);
    }
  }

  return false;
}

async function lookupGiftCardByPaymentIntent(paymentIntentId: string): Promise<GiftCard | null> {
  try {
    const result = await giftCardApi.byPaymentIntent(paymentIntentId);
    return extractGiftCard(result);
  } catch (err) {
    const status = (err as HttpError)?.status;
    if (__DEV__ && status && status !== 404) {
      console.log("[StripePayment] PaymentIntent gift card lookup pending:", status);
    }
    return null;
  }
}

async function lookupMatchingWalletCard(params: {
  merchantId?: string;
  amountCents?: number;
  confirmedAt: number;
}): Promise<GiftCard | null> {
  try {
    const cards = await giftCardApi.list();
    return findMatchingGiftCard(cards, params);
  } catch (err) {
    if (__DEV__) {
      console.log("[StripePayment] Wallet polling pending:", (err as HttpError)?.status ?? err);
    }
    return null;
  }
}

function extractGiftCard(
  result: GiftCard | { gift_card?: GiftCard | null; status?: string } | null | undefined
): GiftCard | null {
  if (!result) return null;
  if ("amount_cents" in result && "remaining_balance_cents" in result) return result;
  return result.gift_card ?? null;
}

function findMatchingGiftCard(
  cards: GiftCard[],
  params: { merchantId?: string; amountCents?: number; confirmedAt: number }
): GiftCard | null {
  const earliestLikelyCreatedAt = params.confirmedAt - 60_000;
  const matches = cards.filter((card) => {
    const merchantMatches = params.merchantId ? card.merchant_id === params.merchantId : true;
    const amountMatches = params.amountCents ? card.amount_cents === params.amountCents : true;
    const createdOrUpdated = Date.parse(card.created_at ?? card.updated_at ?? "");
    const isRecent = !Number.isNaN(createdOrUpdated) && createdOrUpdated >= earliestLikelyCreatedAt;
    return merchantMatches && amountMatches && isRecent;
  });

  return matches.sort((a, b) => {
    const aTime = Date.parse(a.created_at ?? a.updated_at ?? "");
    const bTime = Date.parse(b.created_at ?? b.updated_at ?? "");
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
  })[0] ?? null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const styles = StyleSheet.create({
  sectionCard: {
    marginBottom: theme.spacing(1.5),
    gap: theme.spacing(1)
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionTitle: {
    fontSize: theme.typography.subheading,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text
  },
  sectionHint: {
    color: theme.colors.muted,
    fontSize: theme.typography.small
  },
  errorBanner: {
    backgroundColor: "#FFEBEE",
    borderColor: "#EF5350",
    borderWidth: 1
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8
  },
  errorText: {
    color: "#C62828",
    flex: 1,
    lineHeight: 20
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  summaryLabel: {
    color: theme.colors.muted,
    fontFamily: theme.fonts.semiBold
  },
  summaryValue: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bold
  },
  summaryTotal: {
    fontFamily: theme.fonts.extraBold,
    fontSize: theme.typography.body
  },
  cardField: {
    width: "100%",
    height: 50,
    marginVertical: 8
  },
  stripeSecure: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  stripeSecureText: {
    color: theme.colors.muted,
    fontSize: theme.typography.small
  },
  stripeFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4
  },
  stripeFooterText: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    flex: 1
  },
  payButton: {
    paddingVertical: theme.spacing(1.4),
    borderRadius: 18
  },
  payButtonDisabled: {
    opacity: 0.5
  },
  loadingCard: {
    width: "100%",
    alignItems: "center",
    paddingVertical: theme.spacing(4),
    gap: theme.spacing(1)
  },
  loadingTitle: {
    fontSize: 22,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    marginTop: theme.spacing(1)
  },
  loadingSubtitle: {
    color: theme.colors.muted,
    textAlign: "center"
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.success,
    alignItems: "center",
    justifyContent: "center"
  },
  processingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    zIndex: 1000,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(2)
  }
});

export default StripePaymentScreen;
