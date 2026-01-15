import React from "react";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Image, StyleSheet, Text, View } from "react-native";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import Button from "../ui/components/Button";
import { theme } from "../ui/theme";
import { giftCardApi } from "../api/endpoints";
import { WalletStackParamList } from "../navigation";
import { useAuth } from "../auth/authStore";
import { centsToDollars, formatMoney } from "../utils/money";

const merchantPlaceholder = require("../../assets/merchant-default.png");

const GiftCardDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<WalletStackParamList, "GiftCardDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<WalletStackParamList>>();
  const { id } = route.params;
  const { accessToken } = useAuth();
  const isQueryEnabled = !!accessToken;
  const { data, isLoading, error } = useQuery({
    queryKey: ["giftCard", id],
    queryFn: () => giftCardApi.detail(id),
    enabled: isQueryEnabled
  });
  const isBusy = !isQueryEnabled || isLoading;

  const amount = centsToDollars(data?.amount_cents);
  const remaining = centsToDollars(data?.remaining_balance_cents);
  const canRedeem = data?.status === "active" && (data?.remaining_balance_cents ?? 0) > 0;
  const statusLabelMap: Record<string, string> = {
    active: "Activa",
    redeemed: "Canjeada",
    expired: "Vencida",
    inactive: "Inactiva"
  };
  const statusLabel = data?.status ? statusLabelMap[data.status] ?? data.status : "";
  const merchantLabel =
    data?.merchant_store_name?.trim() ||
    data?.store_name?.trim() ||
    data?.merchant_name?.trim() ||
    data?.store?.name?.trim() ||
    data?.merchant?.name?.trim() ||
    data?.merchant_id ||
    "N/D";
  const hasLogo = Boolean(data?.merchant_logo_url);
  const merchantInitial = merchantLabel.charAt(0).toUpperCase();
  const logoSource = hasLogo ? { uri: data?.merchant_logo_url as string } : merchantPlaceholder;

  return (
    <Screen scrollable edges={["left", "right"]}>
      {isBusy ? <Text style={styles.muted}>Cargando...</Text> : null}
      {error ? <Text style={styles.error}>No pudimos cargar la tarjeta.</Text> : null}
      {data ? (
        <Card>
          <View style={styles.header}>
            <View style={styles.logoWrapper}>
              <Image source={logoSource} style={styles.logo} />
              {!hasLogo ? <Text style={styles.logoInitial}>{merchantInitial}</Text> : null}
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Tarjeta de regalo #{data.id}</Text>
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
          {canRedeem ? (
            <Button
              label="Generar token de canje"
              onPress={() => navigation.navigate("RedemptionToken", { id })}
              style={styles.button}
            />
          ) : (
            <Text style={styles.muted}>Esta tarjeta no es elegible para canje.</Text>
          )}
        </Card>
      ) : null}
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
    resizeMode: "cover"
  },
  logoInitial: {
    position: "absolute",
    color: theme.colors.secondary,
    fontWeight: "700",
    fontSize: theme.typography.subheading
  },
  headerText: {
    flex: 1,
    gap: theme.spacing(0.3)
  },
  title: {
    fontSize: theme.typography.subheading,
    fontWeight: "700",
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
    fontWeight: "600"
  },
  button: {
    marginTop: theme.spacing(2)
  },
  muted: {
    color: theme.colors.muted
  },
  error: {
    color: theme.colors.danger,
    marginBottom: theme.spacing(1)
  }
});

export default GiftCardDetailScreen;

