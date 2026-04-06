import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
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

type PaymentPhase = "input" | "processing" | "confirming" | "generating";

const StripePaymentScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { confirmPayment } = useStripe();
  const { draft } = usePurchaseDraft();

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

  const amountLabel = formatMoney(
    draft.amount_cents ? draft.amount_cents / 100 : null,
    draft.currency
  );

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

    // Wait briefly for webhook to process (backend creates gift card asynchronously)
    // Then navigate to success screen
    await waitForGiftCardGeneration(piId);

    navigation.navigate("PurchaseSuccess", {
      merchantName: draft.merchant?.name,
      amountLabel,
      recipientEmail: draft.recipient?.email,
      paymentIntentId: piId
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
          <Text style={styles.loadingSubtitle}>Generando tu tarjeta...</Text>
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
      <View style={styles.navRow}>
        <Pressable
          onPress={handleGoBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={22} color={theme.colors.text} />
        </Pressable>
      </View>

      <Text style={styles.header}>Pago</Text>
      <Text style={styles.subheader}>
        Completa tu compra de forma segura con Stripe.
      </Text>

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
          <Text style={styles.summaryLabel}>Monto a pagar</Text>
          <Text style={styles.summaryValue}>{amountLabel}</Text>
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
        label={`Pagar ${amountLabel}`}
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
 * Waits for the gift card to be generated by the webhook.
 * Uses a simple delay since the backend creates the card asynchronously.
 *
 * TODO: If a status endpoint exists (e.g., GET /api/v1/gift_cards/by_payment_intent/:id),
 * implement polling here instead of a fixed delay.
 */
async function waitForGiftCardGeneration(_paymentIntentId: string): Promise<void> {
  // For now, wait 3 seconds to give webhook time to process
  // The success screen will inform user that the card may take a moment to appear
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // TODO: Implement polling when endpoint is available:
  // const MAX_ATTEMPTS = 8;
  // const POLL_INTERVAL = 1500;
  // for (let i = 0; i < MAX_ATTEMPTS; i++) {
  //   try {
  //     const result = await giftCardApi.getByPaymentIntent(paymentIntentId);
  //     if (result) return;
  //   } catch {}
  //   await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  // }
}

const styles = StyleSheet.create({
  header: {
    fontSize: 26,
    fontFamily: theme.fonts.extraBold,
    color: theme.colors.text
  },
  subheader: {
    color: theme.colors.muted,
    marginTop: theme.spacing(0.5),
    marginBottom: theme.spacing(1.5)
  },
  sectionCard: {
    marginBottom: theme.spacing(1.5),
    gap: theme.spacing(1)
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
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
