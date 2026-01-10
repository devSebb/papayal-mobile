import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import Screen from "../../ui/components/Screen";
import Card from "../../ui/components/Card";
import Button from "../../ui/components/Button";
import TextField from "../../ui/components/TextField";
import { theme } from "../../ui/theme";
import { HomeStackParamList } from "../../navigation";
import { usePurchaseDraft } from "../../domain/purchase/purchaseDraftStore";
import { formatMoney } from "../../utils/money";
import { createGiftCardPaymentIntent } from "../../api/payments";

const StripePaymentScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { draft, setIsDemoPayment } = usePurchaseDraft();
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(
    "Pagos en modo demo — falta endpoint de PaymentIntent en el backend"
  );

  useEffect(() => {
    if (!draft.merchant || !draft.amount_cents || !draft.recipient) {
      navigation.replace("BuyGiftCardStart");
    }
  }, [draft.amount_cents, draft.merchant, draft.recipient, navigation]);

  const amountLabel = formatMoney(
    draft.amount_cents ? draft.amount_cents / 100 : null,
    draft.currency
  );

  const handlePay = async () => {
    if (!draft.merchant || !draft.amount_cents || !draft.recipient) return;
    setSubmitting(true);
    setBanner(null);

    let demoMode = false;
    try {
      await createGiftCardPaymentIntent(draft);
    } catch (error) {
      demoMode = true;
      setBanner("Pagos en modo demo — falta endpoint de PaymentIntent en el backend");
    } finally {
      setIsDemoPayment(demoMode);
      setSubmitting(false);
      navigation.navigate("PurchaseSuccess", {
        merchantName: draft.merchant.name,
        amountLabel,
        recipientEmail: draft.recipient.email,
        demo: demoMode
      });
    }
  };

  return (
    <Screen scrollable>
      <View style={styles.navRow}>
        <Pressable
          onPress={() => navigation.goBack()}
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
        Usa Stripe de forma segura. Por ahora estamos en modo demo mientras conectamos el backend.
      </Text>

      {banner ? (
        <Card style={[styles.sectionCard, styles.banner]}>
          <Text style={styles.bannerTitle}>Modo demo</Text>
          <Text style={styles.bannerText}>{banner}</Text>
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
          <Text style={styles.sectionHint}>Stripe CardField (simulado)</Text>
        </View>
        <View style={styles.fakeCard}>
          <View style={styles.fakeCardHeader}>
            <Text style={styles.fakeCardTitle}>Tarjeta (demo)</Text>
            <Feather name="credit-card" size={18} color={theme.colors.secondary} />
          </View>
          <TextField
            label="Número"
            value={cardNumber}
            onChangeText={setCardNumber}
            placeholder="4242 4242 4242 4242"
            keyboardType="number-pad"
          />
          <View style={styles.fakeRow}>
            <View style={{ flex: 1 }}>
              <TextField
                label="Expiración"
                value={expiry}
                onChangeText={setExpiry}
                placeholder="MM/AA"
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                label="CVC"
                value={cvc}
                onChangeText={setCvc}
                placeholder="123"
                keyboardType="number-pad"
              />
            </View>
          </View>
          <Text style={styles.helperText}>
            UI de pago simulada. Cuando el backend exponga PaymentIntent enviaremos solo el
            client_secret al móvil.
          </Text>
        </View>
      </Card>

      <Button
        label="Pagar (modo demo)"
        onPress={handlePay}
        loading={submitting}
        style={styles.payButton}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    fontSize: 26,
    fontWeight: "800",
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
    fontWeight: "700",
    color: theme.colors.text
  },
  sectionHint: {
    color: theme.colors.muted,
    fontSize: theme.typography.small
  },
  banner: {
    backgroundColor: "#FFF7E6",
    borderColor: theme.colors.primary
  },
  bannerTitle: {
    color: theme.colors.secondary,
    fontWeight: "800"
  },
  bannerText: {
    color: theme.colors.text
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  summaryLabel: {
    color: theme.colors.muted,
    fontWeight: "600"
  },
  summaryValue: {
    color: theme.colors.text,
    fontWeight: "700"
  },
  fakeCard: {
    gap: theme.spacing(1),
    backgroundColor: "#F8FAFB",
    borderRadius: 14,
    padding: theme.spacing(1.2),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border
  },
  fakeCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  fakeCardTitle: {
    color: theme.colors.secondary,
    fontWeight: "700"
  },
  fakeRow: {
    flexDirection: "row",
    gap: theme.spacing(1)
  },
  helperText: {
    color: theme.colors.muted,
    fontSize: theme.typography.small
  },
  payButton: {
    paddingVertical: theme.spacing(1.4),
    borderRadius: 18
  }
});

export default StripePaymentScreen;

