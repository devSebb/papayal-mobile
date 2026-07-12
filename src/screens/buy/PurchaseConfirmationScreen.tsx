import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";

import Screen from "../../ui/components/Screen";
import Card from "../../ui/components/Card";
import Button from "../../ui/components/Button";
import Banner from "../../ui/components/Banner";
import { theme } from "../../ui/theme";
import { HomeStackParamList } from "../../navigation";
import { usePurchaseDraft } from "../../domain/purchase/purchaseDraftStore";
import { partnerRedemption } from "../../domain/merchants/partnerRedemption";
import { formatMoney } from "../../utils/money";
import { checkoutApi, merchantsApi } from "../../api/endpoints";
import { HttpError } from "../../api/http";
import { formatValidationDetails } from "../../utils/formErrors";
import CheckoutHeader from "./CheckoutHeader";

const PurchaseConfirmationScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { draft, setQuote } = usePurchaseDraft();
  const [checkingKyc, setCheckingKyc] = useState(false);

  useEffect(() => {
    if (!draft.merchant || !draft.amount_cents || !draft.recipient) {
      navigation.replace("BuyGiftCardStart");
    }
  }, [draft.amount_cents, draft.merchant, draft.recipient, navigation]);

  // Server-authoritative fee/total. The app never computes fees locally.
  const { data: quote, isLoading: isQuoteLoading } = useQuery({
    queryKey: ["checkoutQuote", draft.amount_cents, draft.currency],
    queryFn: () => checkoutApi.quote(draft.amount_cents as number, draft.currency),
    enabled: !!draft.amount_cents && draft.amount_cents > 0
  });

  // Persist in the draft so StripePaymentScreen shows the same total.
  useEffect(() => {
    setQuote(quote ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote]);

  // Partner-routed merchants (Farmaenlace): the card is paid at the partner
  // network's stores. Uses the shared ["merchant", id] cache.
  const { data: merchantDetail } = useQuery({
    queryKey: ["merchant", draft.merchant?.id],
    queryFn: () => merchantsApi.detail(draft.merchant?.id as string),
    enabled: !!draft.merchant?.id
  });
  const partner = partnerRedemption(merchantDetail);

  const amountLabel = formatMoney(
    draft.amount_cents ? draft.amount_cents / 100 : null,
    draft.currency
  );
  const feeLabel = quote ? formatMoney(quote.fee_cents / 100, quote.currency) : null;
  const totalLabel = quote ? formatMoney(quote.total_cents / 100, quote.currency) : amountLabel;
  const hasFee = (quote?.fee_cents ?? 0) > 0;

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
        <Row label="Tarifa" value={feeLabel ?? (isQuoteLoading ? "…" : formatMoney(0, draft.currency))} />
        <View style={styles.totalDivider} />
        <Row label="Total a pagar" value={totalLabel} emphasized />
      </Card>

      {partner ? (
        <Banner
          icon="map-pin"
          title="Dónde se canjea esta tarjeta"
          message={`Para canjear, el destinatario paga en ${partner.label}. Por ahora, las tarjetas de este comercio se cobran allí.`}
          style={styles.partnerBanner}
        />
      ) : null}

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
          {hasFee
            ? `El total incluye una tarifa de servicio de ${feeLabel}. `
            : "Aún no aplicamos comisiones. "}
          Después de confirmar el pago, enviaremos la tarjeta al destinatario y también aparecerá
          en tu billetera.
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

const Row: React.FC<{ label: string; value: string; emphasized?: boolean }> = ({
  label,
  value,
  emphasized = false
}) => (
  <View style={styles.row}>
    <Text style={[styles.rowLabel, emphasized ? styles.rowLabelEmphasized : null]}>{label}</Text>
    <Text style={[styles.rowValue, emphasized ? styles.rowValueEmphasized : null]}>{value}</Text>
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
  rowLabelEmphasized: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bold
  },
  rowValueEmphasized: {
    fontFamily: theme.fonts.extraBold,
    fontSize: theme.typography.body
  },
  totalDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing(0.25)
  },
  partnerBanner: {
    marginBottom: theme.spacing(1.5)
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
