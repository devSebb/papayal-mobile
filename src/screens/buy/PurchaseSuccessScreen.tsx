import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import Screen from "../../ui/components/Screen";
import Card from "../../ui/components/Card";
import Button from "../../ui/components/Button";
import { theme } from "../../ui/theme";
import { HomeStackParamList } from "../../navigation";
import { usePurchaseDraft } from "../../domain/purchase/purchaseDraftStore";

type RouteProps = {
  params?: HomeStackParamList["PurchaseSuccess"];
};

const PurchaseSuccessScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const route = useRoute<RouteProps>();
  const { resetDraft } = usePurchaseDraft();

  const merchantName = route.params?.merchantName ?? "Tarjeta de regalo";
  const amountLabel = route.params?.amountLabel ?? "";
  const recipientEmail = route.params?.recipientEmail ?? "";
  const isDemo = route.params?.demo ?? true;

  useEffect(() => {
    resetDraft();
  }, [resetDraft]);

  const goToWallet = () => {
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate("WalletTab" as never);
    } else {
      navigation.navigate("Home");
    }
  };

  const startAnother = () => navigation.navigate("BuyGiftCardStart");

  return (
    <Screen scrollable centerContent>
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
      <Card style={styles.card}>
        <View style={styles.iconCircle}>
          <Feather name="check" size={32} color="#fff" />
        </View>
        <Text style={styles.title}>¡Listo!</Text>
        <Text style={styles.subtitle}>
          Compra completada{isDemo ? " (demo)" : ""}. Verás la tarjeta en tu billetera.
        </Text>

        <View style={styles.summary}>
          {isDemo ? <Text style={styles.demoPill}>Compra simulada (demo)</Text> : null}
          <Text style={styles.summaryText}>{merchantName}</Text>
          {amountLabel ? <Text style={styles.summaryAmount}>{amountLabel}</Text> : null}
          {recipientEmail ? (
            <Text style={styles.summaryRecipient}>Destinatario: {recipientEmail}</Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Button
            label="Ver mis tarjetas de regalo"
            onPress={goToWallet}
            variant="primary"
            style={styles.primaryBtn}
          />
          <Button
            label="Comprar otra"
            onPress={startAnother}
            variant="ghost"
            style={styles.secondaryBtn}
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
    fontWeight: "800",
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
  demoPill: {
    backgroundColor: "#FFF7E6",
    color: theme.colors.secondary,
    paddingHorizontal: theme.spacing(1),
    paddingVertical: theme.spacing(0.4),
    borderRadius: 999,
    fontWeight: "700",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.primary
  },
  summaryText: {
    fontWeight: "700",
    color: theme.colors.text,
    fontSize: theme.typography.subheading
  },
  summaryAmount: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.text
  },
  summaryRecipient: {
    color: theme.colors.muted
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
  secondaryBtn: {
    width: "100%",
    paddingVertical: theme.spacing(1.2),
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.secondary
  }
});

export default PurchaseSuccessScreen;

