import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { usePurchaseDraft } from "../../domain/purchase/purchaseDraftStore";
import { formatMoney } from "../../utils/money";
import { theme } from "../../ui/theme";
import BackButton from "../../ui/components/BackButton";

export type CheckoutStep = "merchant" | "recipient" | "confirm" | "payment";

type Props = {
  step: CheckoutStep;
  title: string;
  subtitle: string;
  onBack: () => void;
  showSummary?: boolean;
};

const steps: Array<{ key: CheckoutStep; label: string }> = [
  { key: "merchant", label: "Comercio" },
  { key: "recipient", label: "Destinatario" },
  { key: "confirm", label: "Confirmar" },
  { key: "payment", label: "Pago" }
];

const CheckoutHeader: React.FC<Props> = ({
  step,
  title,
  subtitle,
  onBack,
  showSummary = true
}) => {
  const { draft } = usePurchaseDraft();
  const activeIndex = steps.findIndex((item) => item.key === step);
  const amountLabel = draft.amount_cents
    ? formatMoney(draft.amount_cents / 100, draft.currency)
    : null;
  const hasSummary = Boolean(draft.merchant?.name || amountLabel || draft.recipient?.email);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <BackButton onPress={onBack} />
        <Text style={styles.stepCount}>Paso {activeIndex + 1} de {steps.length}</Text>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.progressRow} accessibilityRole="progressbar">
        {steps.map((item, index) => {
          const isActive = item.key === step;
          const isComplete = index < activeIndex;
          return (
            <View key={item.key} style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  isComplete ? styles.stepDotComplete : null,
                  isActive ? styles.stepDotActive : null
                ]}
              >
                {isComplete ? <Feather name="check" size={11} color="#FFFFFF" /> : null}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  isActive || isComplete ? styles.stepLabelActive : null
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>

      {showSummary && hasSummary ? (
        <View style={styles.summary}>
          {draft.merchant?.name ? (
            <SummaryItem label="Comercio" value={draft.merchant.name} />
          ) : null}
          {amountLabel ? <SummaryItem label="Monto" value={amountLabel} /> : null}
          {draft.recipient?.email ? (
            <SummaryItem label="Para" value={draft.recipient.email} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const SummaryItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.summaryItem}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue} numberOfLines={1}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing(1.5)
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(1)
  },
  stepCount: {
    color: theme.colors.muted,
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.typography.small
  },
  title: {
    fontSize: 26,
    fontFamily: theme.fonts.extraBold,
    color: theme.colors.text
  },
  subtitle: {
    color: theme.colors.muted,
    marginTop: theme.spacing(0.5),
    lineHeight: 20
  },
  progressRow: {
    flexDirection: "row",
    gap: theme.spacing(0.75),
    marginTop: theme.spacing(1.5)
  },
  stepItem: {
    flex: 1,
    minWidth: 0,
    gap: theme.spacing(0.45)
  },
  stepDot: {
    height: 5,
    borderRadius: 99,
    backgroundColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  stepDotActive: {
    backgroundColor: theme.colors.primary
  },
  stepDotComplete: {
    height: 16,
    backgroundColor: theme.colors.secondary
  },
  stepLabel: {
    color: theme.colors.muted,
    fontFamily: theme.fonts.semiBold,
    fontSize: 11,
    textAlign: "center"
  },
  stepLabelActive: {
    color: theme.colors.secondary
  },
  summary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing(0.75),
    marginTop: theme.spacing(1.25),
    padding: theme.spacing(1),
    borderRadius: theme.radius.md,
    backgroundColor: "#FFF8EC",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(252, 165, 15, 0.42)"
  },
  summaryItem: {
    minWidth: "30%",
    flex: 1,
    gap: 2
  },
  summaryLabel: {
    color: theme.colors.muted,
    fontFamily: theme.fonts.semiBold,
    fontSize: 11
  },
  summaryValue: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    fontSize: theme.typography.small
  }
});

export default CheckoutHeader;
