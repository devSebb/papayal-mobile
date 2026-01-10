import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import Screen from "../../ui/components/Screen";
import Card from "../../ui/components/Card";
import Button from "../../ui/components/Button";
import { theme } from "../../ui/theme";
import { HomeStackParamList } from "../../navigation";
import { usePurchaseDraft } from "../../domain/purchase/purchaseDraftStore";
import { formatMoney } from "../../utils/money";

const PurchaseConfirmationScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { draft } = usePurchaseDraft();

  useEffect(() => {
    if (!draft.merchant || !draft.amount_cents || !draft.recipient) {
      navigation.replace("BuyGiftCardStart");
    }
  }, [draft.amount_cents, draft.merchant, draft.recipient, navigation]);

  const amountLabel = formatMoney(
    draft.amount_cents ? draft.amount_cents / 100 : null,
    draft.currency
  );

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
      <Text style={styles.header}>Confirma tu compra</Text>
      <Text style={styles.subheader}>Revisa los datos antes de ir al pago.</Text>

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
          Aún no aplicamos comisiones. La entrega al destinatario se activará cuando completemos el
          endpoint de pago del backend.
        </Text>
      </Card>

      <Button
        label="Continuar al pago"
        onPress={() => navigation.navigate("StripePayment")}
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
    fontWeight: "700",
    color: theme.colors.text
  },
  link: {
    color: theme.colors.secondary,
    fontWeight: "700"
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  rowLabel: {
    color: theme.colors.muted,
    fontWeight: "600"
  },
  rowValue: {
    color: theme.colors.text,
    fontWeight: "700",
    maxWidth: "65%"
  },
  hintCard: {
    gap: theme.spacing(0.6),
    marginBottom: theme.spacing(1.5),
    backgroundColor: "#F8FAFB"
  },
  hintTitle: {
    color: theme.colors.secondary,
    fontWeight: "700"
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

