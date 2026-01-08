import React from "react";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import Button from "../ui/components/Button";
import { theme } from "../ui/theme";
import { giftCardApi } from "../api/endpoints";
import { WalletStackParamList } from "../navigation";
import { useAuth } from "../auth/authStore";
import { centsToDollars, formatMoney } from "../utils/money";

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

  return (
    <Screen scrollable edges={["left", "right"]}>
      {isBusy ? <Text style={styles.muted}>Loading...</Text> : null}
      {error ? <Text style={styles.error}>Unable to load card.</Text> : null}
      {data ? (
        <Card>
          <Text style={styles.title}>Gift Card #{data.id}</Text>
          <Text style={styles.muted}>
            Merchant:{" "}
            {data.store_name?.trim() ||
              data.merchant_name?.trim() ||
              data.store?.name?.trim() ||
              data.merchant?.name?.trim() ||
              data.merchant_id ||
              "N/A"}
          </Text>
          <View style={styles.row}>
            <Text style={styles.label}>Amount</Text>
            <Text style={styles.value}>{formatMoney(amount, data.currency)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Remaining</Text>
            <Text style={styles.value}>{formatMoney(remaining, data.currency)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{data.status}</Text>
          </View>
          {data.expires_at ? (
            <View style={styles.row}>
              <Text style={styles.label}>Expires</Text>
              <Text style={styles.value}>{data.expires_at}</Text>
            </View>
          ) : null}
          {canRedeem ? (
            <Button
              label="Generate Redemption Token"
              onPress={() => navigation.navigate("RedemptionToken", { id })}
              style={styles.button}
            />
          ) : (
            <Text style={styles.muted}>This card is not eligible for redemption.</Text>
          )}
        </Card>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
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

