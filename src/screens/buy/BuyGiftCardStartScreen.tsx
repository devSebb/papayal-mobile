import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import Screen from "../../ui/components/Screen";
import Card from "../../ui/components/Card";
import Button from "../../ui/components/Button";
import TextField from "../../ui/components/TextField";
import { theme } from "../../ui/theme";
import { giftCardApi, merchantsApi } from "../../api/endpoints";
import { GiftCard, Merchant } from "../../types/api";
import { formatMoney } from "../../utils/money";
import { usePurchaseDraft, MerchantSelection } from "../../domain/purchase/purchaseDraftStore";
import { useAuth } from "../../auth/authStore";
import { HomeStackParamList } from "../../navigation";

type MerchantOption = MerchantSelection & { id: string; isDemo?: boolean };

const merchantPlaceholder = require("../../../assets/merchant-default.png");

const presetAmounts = [30, 50, 60, 100, 150, 200];
const MIN_AMOUNT = 5;
const MAX_AMOUNT = 500;

const deriveMerchantLabel = (card: GiftCard) => {
  const candidates = [
    (card as any)?.merchant_store_name,
    (card as any)?.store_name,
    (card as any)?.storeName,
    (card as any)?.merchant_name,
    (card as any)?.merchantName,
    card.name,
    (card as any)?.label,
    card.store?.name,
    card.merchant?.name
  ];
  const label = candidates.find((val) => typeof val === "string" && val.trim().length > 0);
  if (label) return label.trim();
  if (card.merchant_id) return `Comercio #${card.merchant_id}`;
  return "Comercio";
};

const buildMerchantOptions = (giftCards?: GiftCard[]): MerchantOption[] => {
  if (!giftCards || giftCards.length === 0) return [];
  const map = new Map<string, MerchantOption>();
  giftCards.forEach((card) => {
    const key = card.merchant_id ? `merchant-${card.merchant_id}` : `name-${deriveMerchantLabel(card)}`;
    if (map.has(key)) return;
    map.set(key, {
      id: key,
      name: deriveMerchantLabel(card),
      logoUrl: (card as any)?.merchant_logo_url ?? (card as any)?.merchantLogoUrl ?? null
    });
  });
  return Array.from(map.values());
};

const fallbackMerchants: MerchantOption[] = [
  { id: "demo-1", name: "Demo Mercado Central", isDemo: true },
  { id: "demo-2", name: "Demo Café & Panadería", isDemo: true },
  { id: "demo-3", name: "Demo Tienda de esenciales", isDemo: true }
];

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
        {merchant.isDemo ? <Text style={styles.merchantDemo}>Demo merchant</Text> : null}
      </View>
      {selected ? <Feather name="check-circle" size={20} color={theme.colors.secondary} /> : null}
    </Pressable>
  );
};

const BuyGiftCardStartScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { accessToken } = useAuth();
  const { draft, setMerchant, setAmount, setIsDemoPayment } = usePurchaseDraft();
  const isQueryEnabled = !!accessToken;
  const { data: giftCards, isLoading } = useQuery({
    queryKey: ["giftCards"],
    queryFn: giftCardApi.list,
    enabled: isQueryEnabled
  });
  const { data: merchants, isLoading: isLoadingMerchants } = useQuery<Merchant[]>({
    queryKey: ["merchants"],
    queryFn: merchantsApi.list,
    enabled: isQueryEnabled
  });

  const merchantOptions = useMemo(() => {
    // First, try to use merchants from API
    if (merchants && merchants.length > 0) {
      return merchants.map((merchant) => ({
        id: merchant.id?.toString() ?? `merchant-${merchant.name}`,
        name: merchant.store_name || merchant.name,
        logoUrl: merchant.logo_url ?? null
      }));
    }
    // Fallback to merchants derived from gift cards
    const derived = buildMerchantOptions(giftCards);
    return derived.length > 0 ? derived : fallbackMerchants;
  }, [merchants, giftCards]);

  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(
    draft.merchant?.id ?? null
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

  useEffect(() => {
    if (!selectedMerchantId && merchantOptions.length > 0) {
      setSelectedMerchantId(merchantOptions[0]?.id ?? null);
    }
  }, [merchantOptions, selectedMerchantId]);

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
  const isDerivedMerchantsAvailable = Boolean(giftCards && giftCards.length > 0);
  const isMerchantBusy = isLoadingMerchants || isLoading;

  const handleContinue = () => {
    if (!selectedMerchant || !amountCents || !canContinue) return;
    setMerchant({
      id: selectedMerchant.id,
      name: selectedMerchant.name,
      logoUrl: selectedMerchant.logoUrl
    });
    setAmount(amountCents, "USD");
    setIsDemoPayment(true);
    navigation.navigate("DeliveryProfile");
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
      <Text style={styles.header}>Compra una tarjeta de regalo</Text>
      <Text style={styles.subheader}>
        Selecciona el comercio y el monto. Podrás añadir destinatario y pagar en el siguiente paso.
      </Text>

      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Comercio</Text>
          <Text style={styles.sectionHint}>
            {merchants && merchants.length > 0
              ? `${merchantOptions.length} comercios disponibles`
              : isDerivedMerchantsAvailable
              ? "Tomado de tus tarjetas de regalo"
              : "Comercios demo (hasta que exista el endpoint)"}
          </Text>
        </View>
        {isMerchantBusy ? (
          <Text style={styles.muted}>Cargando comercios...</Text>
        ) : (
          <View style={styles.merchantListContainer}>
            <FlatList
              data={merchantOptions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <MerchantCard
                  merchant={item}
                  selected={item.id === selectedMerchantId}
                  onPress={() => setSelectedMerchantId(item.id)}
                />
              )}
              ItemSeparatorComponent={() => <View style={{ height: theme.spacing(1) }} />}
              scrollEnabled={true}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
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
  muted: {
    color: theme.colors.muted
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
    justifyContent: "space-between",
    alignItems: "flex-end"
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
    resizeMode: "cover"
  },
  merchantInitial: {
    position: "absolute",
    color: theme.colors.secondary,
    fontWeight: "800"
  },
  merchantText: {
    flex: 1
  },
  merchantName: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: theme.typography.body
  },
  merchantDemo: {
    color: theme.colors.muted,
    fontSize: theme.typography.small
  },
  merchantListContainer: {
    // Height calculation: 3 merchants visible
    // Each merchant row: ~75px (48px avatar + padding + text)
    // 2 separators between 3 items: 2 * 8px = 16px
    // Total: (75 * 3) + 16 = 241px, rounded to 250px for safety
    maxHeight: 250
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
    fontWeight: "700",
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
    fontWeight: "600"
  },
  summaryValue: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.subheading
  },
  continueButton: {
    marginTop: theme.spacing(0.5),
    paddingVertical: theme.spacing(1.4),
    borderRadius: 18
  }
});

export default BuyGiftCardStartScreen;

