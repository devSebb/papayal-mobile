import React, { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import Screen from "../../ui/components/Screen";
import Card from "../../ui/components/Card";
import AppHeader from "../../ui/components/AppHeader";
import TopNavBar from "../../ui/components/TopNavBar";
import Button from "../../ui/components/Button";
import TextField from "../../ui/components/TextField";
import { theme } from "../../ui/theme";
import { ProfileStackParamList } from "../../navigation";
import { useAuth } from "../../auth/authStore";
import { meApi } from "../../api/endpoints";
import { HttpError } from "../../api/http";
import { openLegal } from "../../utils/openExternal";

const formatBalance = (cents: number, currency: string) => {
  const dollars = (cents / 100).toFixed(2);
  return `$${dollars} ${currency}`;
};

const DeleteAccountScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ProfileStackParamList>>();
  const { deleteAccount, accessToken } = useAuth();

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Pre-deletion summary so we can warn the user about what they'll lose.
  // Loading is non-blocking — the password field renders even if the
  // preview is still in flight, so a slow network doesn't gate the UI.
  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ["deletionPreview"],
    queryFn: meApi.deletionPreview,
    enabled: !!accessToken,
    staleTime: 30_000
  });

  const handleBack = () => {
    if (submitting) return;
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Settings");
    }
  };

  // Two-step confirmation: an OS-native Alert before we actually run the
  // destructive call. Keeps accidental taps from nuking accounts.
  const promptFinalConfirmation = () => {
    if (submitting) return;
    if (!password.trim()) {
      setError("Ingresa tu contraseña para confirmar.");
      return;
    }
    setError(null);
    Alert.alert(
      "¿Eliminar tu cuenta?",
      "Esta acción es permanente y no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => void executeDeletion() }
      ]
    );
  };

  const executeDeletion = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await deleteAccount(password);
      // Auth state has been cleared; the root navigator will swap to the
      // auth stack automatically. No navigation.reset needed here.
    } catch (e) {
      const httpErr = e as HttpError;
      const code = httpErr?.error?.code;
      if (code === "me.invalid_password") {
        setError("Contraseña incorrecta. Verifica e intenta de nuevo.");
      } else if (code === "me.merchant_must_contact_support") {
        Alert.alert(
          "Cuenta de comercio",
          "Las cuentas de comercio deben contactar a soporte para eliminarse. Escríbenos a hola@papayal.app."
        );
      } else if (code === "me.password_required") {
        setError("Ingresa tu contraseña para confirmar.");
      } else {
        setError(httpErr?.error?.message ?? "No pudimos eliminar tu cuenta. Intenta más tarde o contacta soporte.");
      }
      setSubmitting(false);
    }
  };

  const balanceCents = preview?.balance_cents ?? 0;
  const activeCardCount = preview?.active_card_count ?? 0;
  const currency = preview?.currency ?? "USD";
  const hasActiveBalance = balanceCents > 0;
  const hasActiveCards = activeCardCount > 0;

  return (
    <Screen scrollable edges={["left", "right"]}>
      <TopNavBar />
      <Card>
        <AppHeader
          title="Eliminar cuenta"
          subtitle="Esta acción es permanente. Eliminaremos toda tu información personal y no podremos restaurar tu cuenta."
          icon="trash-2"
          onBack={handleBack}
          disabledBack={submitting}
          danger
          style={styles.cardHeader}
        />

        <View style={styles.consequences}>
          <Text style={styles.consequencesTitle}>Al eliminar tu cuenta:</Text>
          {hasActiveBalance ? (
            <View style={styles.consequenceRow}>
              <Feather name="x-circle" size={16} color={theme.colors.danger} />
              <Text style={styles.consequenceTextDanger}>
                Perderás {formatBalance(balanceCents, currency)} en saldo activo
              </Text>
            </View>
          ) : null}
          {hasActiveCards ? (
            <View style={styles.consequenceRow}>
              <Feather name="x-circle" size={16} color={theme.colors.danger} />
              <Text style={styles.consequenceTextDanger}>
                {activeCardCount} {activeCardCount === 1 ? "tarjeta activa se perderá" : "tarjetas activas se perderán"}
              </Text>
            </View>
          ) : null}
          <View style={styles.consequenceRow}>
            <Feather name="x" size={16} color={theme.colors.muted} />
            <Text style={styles.consequenceText}>Tu información personal será eliminada</Text>
          </View>
          <View style={styles.consequenceRow}>
            <Feather name="x" size={16} color={theme.colors.muted} />
            <Text style={styles.consequenceText}>Tus sesiones se cerrarán en todos los dispositivos</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => openLegal("/legal/eliminacion-datos")}
          accessibilityRole="link"
          style={styles.policyLink}
        >
          <Feather name="external-link" size={14} color={theme.colors.primary} />
          <Text style={styles.policyLinkLabel}>Ver política de eliminación</Text>
        </TouchableOpacity>

        <View style={styles.passwordSection}>
          <Text style={styles.passwordLabel}>Para confirmar, ingresa tu contraseña:</Text>
          <TextField
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (error) setError(null);
            }}
            placeholder="Tu contraseña"
            secureTextEntry
            secureToggle
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            editable={!submitting}
            error={error ?? undefined}
          />
        </View>

        <Button
          label="Eliminar mi cuenta permanentemente"
          onPress={promptFinalConfirmation}
          variant="danger"
          style={styles.deleteButton}
          disabled={!password.trim() || submitting || previewLoading}
          loading={submitting}
        />
        <Button
          label="Cancelar"
          onPress={handleBack}
          variant="ghost"
          style={styles.cancelButton}
          disabled={submitting}
        />
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  cardHeader: {
    marginBottom: theme.spacing(2)
  },
  consequences: {
    backgroundColor: "#FFF5F5",
    borderRadius: theme.radius.md,
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(1.5)
  },
  consequencesTitle: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text,
    marginBottom: theme.spacing(1)
  },
  consequenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(0.75),
    paddingVertical: theme.spacing(0.4)
  },
  consequenceText: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.typography.small
  },
  consequenceTextDanger: {
    color: theme.colors.danger,
    flex: 1,
    fontSize: theme.typography.small,
    fontFamily: theme.fonts.semiBold
  },
  policyLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(0.5),
    paddingVertical: theme.spacing(0.5),
    marginBottom: theme.spacing(1.5)
  },
  policyLinkLabel: {
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
    fontSize: theme.typography.small
  },
  passwordSection: {
    marginBottom: theme.spacing(1.5)
  },
  passwordLabel: {
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing(0.75)
  },
  deleteButton: {
    marginTop: theme.spacing(0.5)
  },
  cancelButton: {
    marginTop: theme.spacing(1)
  }
});

export default DeleteAccountScreen;
