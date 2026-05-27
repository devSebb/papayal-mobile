import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import Screen from "../../ui/components/Screen";
import Card from "../../ui/components/Card";
import Button from "../../ui/components/Button";
import TextField from "../../ui/components/TextField";
import { theme } from "../../ui/theme";
import { merchantsApi } from "../../api/endpoints";
import { Merchant } from "../../types/api";
import { formatMoney } from "../../utils/money";
import {
  GIFT_CARD_MAX_AMOUNT_USD as MAX_AMOUNT,
  GIFT_CARD_MIN_AMOUNT_USD as MIN_AMOUNT
} from "../../domain/purchase/giftCardAmountLimits";
import { usePurchaseDraft, MerchantSelection } from "../../domain/purchase/purchaseDraftStore";
import { useAuth } from "../../auth/authStore";
import { HomeStackParamList } from "../../navigation";
import CheckoutHeader from "./CheckoutHeader";

type MerchantOption = MerchantSelection & { id: string };
type BuyGiftCardStartRoute = RouteProp<HomeStackParamList, "BuyGiftCardStart">;

const merchantPlaceholder = require("../../../assets/merchant-default.png");

const presetAmounts = [30, 50, 60, 100, 150, 200];

const AmountChip: React.FC<{
  label: string;
  selected: boolean;
  onPress: () => void;
}> = ({ label, selected, onPress }) => (
  <Pressable
    onPress={onPress}
    style={[styles.amountChip, selected ? styles.amountChipSelected : styles.amountChipIdle]}
    hitSlop={8}
    accessibilityRole="button"
    accessibilityState={{ selected }}
  >
    <Text style={[styles.amountChipLabel, selected ? styles.amountChipLabelSelected : null]}>
      {label}
    </Text>
  </Pressable>
);

const MerchantCard: React.FC<{
  merchant: MerchantOption;
  selected: boolean;
  onPress: () => void;
}> = ({ merchant, selected, onPress }) => {
  const hasLogo = Boolean(merchant.logoUrl);
  const initial = merchant.name?.charAt(0)?.toUpperCase?.() ?? "M";
  const logoSource = hasLogo ? { uri: merchant.logoUrl as string } : merchantPlaceholder;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.merchantRow, selected ? styles.merchantRowSelected : null]}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={styles.merchantAvatar}>
        <Image source={logoSource} style={styles.merchantImage} />
        {!hasLogo ? <Text style={styles.merchantInitial}>{initial}</Text> : null}
      </View>
      <View style={styles.merchantText}>
        <Text style={styles.merchantName}>{merchant.name}</Text>
      </View>
      {selected ? <Feather name="check-circle" size={20} color={theme.colors.secondary} /> : null}
    </Pressable>
  );
};

const BuyGiftCardStartScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const route = useRoute<BuyGiftCardStartRoute>();
  const { accessToken } = useAuth();
  const { draft, setMerchant, setAmount } = usePurchaseDraft();
  const isQueryEnabled = !!accessToken;
  const requestedMerchantId = route.params?.merchantId?.toString() ?? null;
  const appliedMerchantParamRef = useRef<string | null>(null);
  const {
    data: merchants,
    isLoading: isLoadingMerchants,
    isRefetching: isRefetchingMerchants,
    refetch: refetchMerchants
  } = useQuery<Merchant[]>({
    queryKey: ["merchants"],
    queryFn: merchantsApi.list,
    enabled: isQueryEnabled
  });

  const merchantOptions = useMemo(() => {
    if (!merchants?.length) return [];
    return merchants.map((merchant) => ({
      id: merchant.id?.toString() ?? `merchant-${merchant.name}`,
      name: merchant.store_name || merchant.name,
      logoUrl: merchant.logo_url ?? null
    }));
  }, [merchants]);

  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(
    requestedMerchantId ?? draft.merchant?.id ?? null
  );
  const [selectedAmount, setSelectedAmount] = useState<number | null>(
    draft.amount_cents ? draft.amount_cents / 100 : null
  );
  const [useCustomAmount, setUseCustomAmount] = useState<boolean>(false);
  const [customAmount, setCustomAmount] = useState<string>(
    draft.amount_cents && (!presetAmounts.includes(draft.amount_cents / 100))
      ? String(draft.amount_cents / 100)
      : ""
  );

  const selectedMerchant = merchantOptions.find((m) => m.id === selectedMerchantId) ?? null;
  const requestedMerchantExists = requestedMerchantId
    ? merchantOptions.some((merchant) => merchant.id === requestedMerchantId)
    : false;
  const requestedMerchantMissing = Boolean(
    requestedMerchantId && merchantOptions.length > 0 && !requestedMerchantExists
  );

  useEffect(() => {
    if (merchantOptions.length === 0) {
      if (selectedMerchantId) setSelectedMerchantId(null);
      return;
    }

    if (requestedMerchantId && appliedMerchantParamRef.current !== requestedMerchantId) {
      appliedMerchantParamRef.current = requestedMerchantId;
      setSelectedMerchantId(requestedMerchantExists ? requestedMerchantId : null);
      return;
    }

    const selectedStillExists = merchantOptions.some((merchant) => merchant.id === selectedMerchantId);
    if (!selectedMerchantId || !selectedStillExists) {
      if (requestedMerchantMissing) return;
      setSelectedMerchantId(merchantOptions[0]?.id ?? null);
    }
  }, [
    merchantOptions,
    requestedMerchantExists,
    requestedMerchantId,
    requestedMerchantMissing,
    selectedMerchantId
  ]);

  const parsedCustomAmount = Number.parseFloat(customAmount.replace(/,/g, "."));
  const amountValue = useCustomAmount ? parsedCustomAmount : selectedAmount ?? null;
  const amountCents =
    amountValue && Number.isFinite(amountValue) ? Math.round(amountValue * 100) : null;
  const amountValid =
    amountCents !== null &&
    amountCents >= MIN_AMOUNT * 100 &&
    amountCents <= MAX_AMOUNT * 100 &&
    !Number.isNaN(amountCents);
  const amountLabel = formatMoney(amountCents ? amountCents / 100 : null, draft.currency);

  const canContinue = Boolean(selectedMerchant && amountValid);
  const isMerchantBusy = isLoadingMerchants || isRefetchingMerchants;
  const hasMerchantOptions = merchantOptions.length > 0;

  const handleContinue = () => {
    if (!selectedMerchant || !amountCents || !canContinue) return;
    setMerchant({
      id: selectedMerchant.id,
      name: selectedMerchant.name,
      logoUrl: selectedMerchant.logoUrl
    });
    setAmount(amountCents, "USD");
    navigation.navigate("DeliveryProfile");
  };

  return (
    <Screen scrollable>
      <CheckoutHeader
        step="merchant"
        title="Compra una tarjeta de regalo"
        subtitle="Selecciona el comercio y el monto para empezar tu compra."
        onBack={() => navigation.goBack()}
        showSummary={false}
      />

      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Comercio</Text>
          <Text style={styles.sectionHint}>
            {isMerchantBusy
              ? "Cargando..."
              : hasMerchantOptions
              ? `${merchantOptions.length} comercios disponibles`
              : "Sin comercios disponibles"}
          </Text>
        </View>
        {isMerchantBusy ? (
          <Text style={styles.muted}>Cargando comercios...</Text>
        ) : hasMerchantOptions ? (
          <View style={styles.merchantListWrap}>
            {requestedMerchantMissing ? (
              <View style={styles.merchantWarning}>
                <Feather name="alert-circle" size={18} color={theme.colors.secondary} />
                <Text style={styles.merchantWarningText}>
                  No encontramos el comercio seleccionado. Puedes elegir otro comercio disponible.
                </Text>
              </View>
            ) : null}
            <View style={styles.merchantList}>
              {merchantOptions.map((item, index) => (
                <React.Fragment key={item.id}>
                  {index > 0 && <View style={{ height: theme.spacing(1) }} />}
                  <MerchantCard
                    merchant={item}
                    selected={item.id === selectedMerchantId}
                    onPress={() => setSelectedMerchantId(item.id)}
                  />
                </React.Fragment>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.emptyMerchantState}>
            <Feather name="shopping-bag" size={28} color={theme.colors.muted} />
            <Text style={styles.emptyMerchantTitle}>No hay comercios disponibles</Text>
            <Text style={styles.emptyMerchantText}>
              Intenta de nuevo en unos minutos para continuar con tu compra.
            </Text>
            <Button
              label="Reintentar"
              variant="ghost"
              onPress={() => {
                void refetchMerchants();
              }}
              style={styles.retryButton}
            />
          </View>
        )}
      </Card>

      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Monto</Text>
          <Text style={styles.sectionHint}>USD • mínimo ${MIN_AMOUNT} • máximo ${MAX_AMOUNT}</Text>
        </View>
        <View style={styles.amountGrid}>
          {presetAmounts.map((amt) => (
            <AmountChip
              key={amt}
              label={formatMoney(amt, "USD")}
              selected={!useCustomAmount && selectedAmount === amt}
              onPress={() => {
                setUseCustomAmount(false);
                setSelectedAmount(amt);
              }}
            />
          ))}
          <AmountChip
            label="Otro monto"
            selected={useCustomAmount}
            onPress={() => {
              setUseCustomAmount(true);
              setSelectedAmount(null);
            }}
          />
        </View>
        {useCustomAmount ? (
          <View style={styles.customAmountRow}>
            <TextField
              label="Monto personalizado (USD)"
              value={customAmount}
              onChangeText={(text) => setCustomAmount(text)}
              keyboardType="numeric"
              placeholder="Ej: 75"
              accessibilityLabel="Monto personalizado en dólares"
              error={
                amountCents !== null && !amountValid
                  ? `Ingresa entre ${formatMoney(MIN_AMOUNT, "USD")} y ${formatMoney(
                      MAX_AMOUNT,
                      "USD"
                    )}`
                  : undefined
              }
            />
          </View>
        ) : null}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Monto seleccionado</Text>
          <Text style={styles.summaryValue}>{amountLabel}</Text>
        </View>
      </Card>

      <Button
        label="Continuar"
        onPress={handleContinue}
        disabled={!canContinue}
        style={styles.continueButton}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  muted: {
    color: theme.colors.muted
  },
  sectionCard: {
    marginBottom: theme.spacing(1.5),
    gap: theme.spacing(1)
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end"
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
  merchantRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing(1.2),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    gap: theme.spacing(1)
  },
  merchantRowSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: "#FFF7E6"
  },
  merchantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#EEF2F3",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border
  },
  merchantImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain"
  },
  merchantInitial: {
    position: "absolute",
    color: theme.colors.secondary,
    fontFamily: theme.fonts.extraBold
  },
  merchantText: {
    flex: 1
  },
  merchantName: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    fontSize: theme.typography.body
  },
  merchantList: {
    gap: 0 // Spacing handled by separators in the map
  },
  merchantListWrap: {
    gap: theme.spacing(1)
  },
  merchantWarning: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing(0.75),
    padding: theme.spacing(1.2),
    borderRadius: theme.radius.md,
    backgroundColor: "#FFF7E6",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(252, 165, 15, 0.55)"
  },
  merchantWarningText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.small,
    lineHeight: 18
  },
  emptyMerchantState: {
    alignItems: "center",
    gap: theme.spacing(0.75),
    paddingVertical: theme.spacing(2)
  },
  emptyMerchantTitle: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    fontSize: theme.typography.body,
    textAlign: "center"
  },
  emptyMerchantText: {
    color: theme.colors.muted,
    textAlign: "center",
    lineHeight: 20
  },
  retryButton: {
    marginTop: theme.spacing(0.75)
  },
  amountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing(1)
  },
  amountChip: {
    paddingVertical: theme.spacing(1),
    paddingHorizontal: theme.spacing(1.5),
    borderRadius: 14,
    borderWidth: 1
  },
  amountChipIdle: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.secondary
  },
  amountChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  amountChipLabel: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.secondary
  },
  amountChipLabelSelected: {
    color: theme.colors.secondary
  },
  customAmountRow: {
    marginTop: theme.spacing(1)
  },
  summaryRow: {
    marginTop: theme.spacing(1),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing(1),
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border
  },
  summaryLabel: {
    color: theme.colors.muted,
    fontFamily: theme.fonts.semiBold
  },
  summaryValue: {
    color: theme.colors.text,
    fontFamily: theme.fonts.extraBold,
    fontSize: theme.typography.subheading
  },
  continueButton: {
    marginTop: theme.spacing(0.5),
    paddingVertical: theme.spacing(1.4),
    borderRadius: 18
  }
});

export default BuyGiftCardStartScreen;
