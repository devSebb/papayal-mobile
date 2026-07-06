import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import Screen from "../../ui/components/Screen";
import Card from "../../ui/components/Card";
import Button from "../../ui/components/Button";
import { theme } from "../../ui/theme";
import { HomeStackParamList } from "../../navigation";
import { usePurchaseDraft } from "../../domain/purchase/purchaseDraftStore";
import { formatMoney } from "../../utils/money";
import { checkoutApi } from "../../api/endpoints";
import { HttpError } from "../../api/http";
import { formatValidationDetails } from "../../utils/formErrors";
import CheckoutHeader from "./CheckoutHeader";

const PurchaseConfirmationScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { draft } = usePurchaseDraft();
  const [checkingKyc, setCheckingKyc] = useState(false);

  useEffect(() => {
    if (!draft.merchant || !draft.amount_cents || !draft.recipient) {
      navigation.replace("BuyGiftCardStart");
    }
  }, [draft.amount_cents, draft.merchant, draft.recipient, navigation]);

  const amountLabel = formatMoney(
    draft.amount_cents ? draft.amount_cents / 100 : null,
    draft.currency
  );

  const friendlyError = (err: HttpError) => {
    const details = err?.error?.details;
    if (details && typeof details === "object" && !Array.isArray(details)) {
      const translated = formatValidationDetails(details as Record<string, string[] | string>);
      if (translated) return translated;
    }
    return "No pudimos validar tus datos. Inténtalo de nuevo.";
  };

  const handleContinue = async () => {
    if (!draft.merchant || !draft.amount_cents || !draft.recipient) return;
    setCheckingKyc(true);
    try {
      const validation = await checkoutApi.validateKyc();
      if (validation.ok) {
        navigation.navigate("StripePayment");
        return;
      }

      navigation.navigate("CompleteDetails", {
        missing: validation.missing ?? [],
        returnTo: "StripePayment"
      });
    } catch (err) {
      const message = friendlyError(err as HttpError);
      Alert.alert("No pudimos continuar", message);
    } finally {
      setCheckingKyc(false);
    }
  };

  return (
    <Screen scrollable>
      <CheckoutHeader
        step="confirm"
        title="Confirma tu compra"
        subtitle="Revisa los datos antes de continuar al pago."
        onBack={() => navigation.goBack()}
      />

      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Resumen</Text>
          <Pressable onPress={() => navigation.navigate("BuyGiftCardStart")} hitSlop={8}>
            <Text style={styles.link}>Editar</Text>
          </Pressable>
        </View>
        <Row label="Comercio" value={draft.merchant?.name ?? "—"} />
        <Row label="Monto" value={amountLabel} />
        <Row label="Tarifa (estimado)" value="$0.00" />
      </Card>

      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Destinatario</Text>
          <Pressable onPress={() => navigation.navigate("DeliveryProfile")} hitSlop={8}>
            <Text style={styles.link}>Editar</Text>
          </Pressable>
        </View>
        <Row label="Nombre" value={draft.recipient?.name ?? "—"} />
        <Row label="Correo" value={draft.recipient?.email ?? "—"} />
        <Row label="Teléfono" value={draft.recipient?.phone ?? "—"} />
        {draft.recipient?.note ? <Row label="Nota" value={draft.recipient.note} /> : null}
      </Card>

      <Card style={styles.hintCard}>
        <Text style={styles.hintTitle}>Tarifas y entrega</Text>
        <Text style={styles.hintBody}>
          Aún no aplicamos comisiones. Después de confirmar el pago, enviaremos la tarjeta al
          destinatario y también aparecerá en tu billetera.
        </Text>
      </Card>

      <Button
        label="Continuar al pago"
        onPress={handleContinue}
        loading={checkingKyc}
        style={styles.continueButton}
      />
    </Screen>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  sectionCard: {
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1.5)
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  sectionTitle: {
    fontSize: theme.typography.subheading,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text
  },
  link: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.bold
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  rowLabel: {
    color: theme.colors.muted,
    fontFamily: theme.fonts.semiBold
  },
  rowValue: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    maxWidth: "65%"
  },
  hintCard: {
    gap: theme.spacing(0.6),
    marginBottom: theme.spacing(1.5),
    backgroundColor: "#F8FAFB"
  },
  hintTitle: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.bold
  },
  hintBody: {
    color: theme.colors.text,
    lineHeight: 20
  },
  continueButton: {
    paddingVertical: theme.spacing(1.4),
    borderRadius: 18
  }
});

export default PurchaseConfirmationScreen;
