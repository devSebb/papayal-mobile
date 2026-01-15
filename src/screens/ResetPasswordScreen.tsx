import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import TextField from "../ui/components/TextField";
import Button from "../ui/components/Button";
import { theme } from "../ui/theme";
import { authApi } from "../api/endpoints";
import { HttpError } from "../api/http";
import type { AuthStackParamList } from "../navigation";

type ResetPasswordNav = NativeStackNavigationProp<AuthStackParamList, "ResetPassword">;
type ResetPasswordRoute = RouteProp<AuthStackParamList, "ResetPassword">;

const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ResetPasswordNav>();
  const route = useRoute<ResetPasswordRoute>();
  const [token, setToken] = useState(route.params?.token || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setFieldErrors({});

    const trimmedToken = token.trim();

    const nextErrors: Record<string, string> = {};
    if (!trimmedToken) nextErrors.reset_token = "El token es requerido";
    if (!password) nextErrors.password = "Requerido";
    if (!confirmPassword) nextErrors.password_confirmation = "Confirma tu contraseña";
    if (password && confirmPassword && password !== confirmPassword)
      nextErrors.password_confirmation = "Las contraseñas no coinciden.";

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError("Revisa los campos resaltados.");
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({
        reset_token: trimmedToken,
        password,
        password_confirmation: confirmPassword
      });
      setSuccess(true);
    } catch (err) {
      const httpErr = err as HttpError;
      const details = httpErr?.error?.details;
      const nextFieldErrors: Record<string, string> = {};
      let friendly =
        (httpErr?.error?.message as string | undefined) ??
        "No pudimos restablecer tu contraseña. Inténtalo de nuevo.";

      if (httpErr?.status === 422 && details) {
        if (typeof details === "string") {
          friendly = details;
        } else if (Array.isArray(details)) {
          friendly = details.filter(Boolean).join(", ");
        } else if (typeof details === "object") {
          Object.entries(details as Record<string, unknown>).forEach(([key, value]) => {
            if (!value) return;
            const text = Array.isArray(value) ? value.join(", ") : String(value);
            if (text) nextFieldErrors[key] = text;
          });
          const parts = Object.entries(nextFieldErrors)
            .map(([key, value]) => {
              if (!value) return null;
              return `${key}: ${String(value)}`;
            })
            .filter(Boolean)
            .join(" ");
          if (parts) {
            friendly = parts;
          }
        }
      }

      if (Object.keys(nextFieldErrors).length) {
        setFieldErrors(nextFieldErrors);
      }
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = Boolean(token.trim() && password && confirmPassword && password === confirmPassword);

  return (
    <Screen scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>Restablecer contraseña</Text>
        <Text style={styles.subtitle}>
          {success
            ? "Tu contraseña ha sido restablecida exitosamente."
            : "Ingresa el token que recibiste por correo y tu nueva contraseña."}
        </Text>
      </View>
      <Card>
        {success ? (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>
              Ya puedes iniciar sesión con tu nueva contraseña.
            </Text>
            <Button
              label="Iniciar sesión"
              onPress={() => navigation.navigate("Login")}
              style={styles.backButton}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <TextField
              label="Token de restablecimiento"
              value={token}
              autoCapitalize="none"
              onChangeText={(text) => {
                setToken(text);
                setFieldErrors((prev) => ({ ...prev, reset_token: undefined }));
              }}
              placeholder="Pega el token aquí"
              editable={!loading}
              error={fieldErrors.reset_token}
            />
            <TextField
              label="Nueva contraseña"
              value={password}
              secureTextEntry
              onChangeText={(text) => {
                setPassword(text);
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              autoComplete="password-new"
              style={styles.inputSpacing}
              editable={!loading}
              error={fieldErrors.password}
            />
            <TextField
              label="Confirmar nueva contraseña"
              value={confirmPassword}
              secureTextEntry
              onChangeText={(text) => {
                setConfirmPassword(text);
                setFieldErrors((prev) => ({ ...prev, password_confirmation: undefined }));
              }}
              autoComplete="password-new"
              style={styles.inputSpacing}
              editable={!loading}
              error={fieldErrors.password_confirmation}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              label="Restablecer contraseña"
              onPress={handleSubmit}
              loading={loading}
              disabled={!canSubmit || loading}
              style={styles.submit}
            />
            <Pressable
              onPress={() => navigation.navigate("Login")}
              hitSlop={10}
              style={styles.linkContainer}
            >
              <Text style={styles.linkText}>Volver a iniciar sesión</Text>
            </Pressable>
          </View>
        )}
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: theme.spacing(2)
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: theme.colors.text
  },
  subtitle: {
    fontSize: theme.typography.body,
    color: theme.colors.muted,
    marginTop: theme.spacing(0.5)
  },
  form: {
    gap: theme.spacing(1.5)
  },
  inputSpacing: {
    marginTop: theme.spacing(0.5)
  },
  submit: {
    marginTop: theme.spacing(1)
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.small
  },
  successContainer: {
    gap: theme.spacing(1.5)
  },
  successText: {
    fontSize: theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22
  },
  backButton: {
    marginTop: theme.spacing(1)
  },
  linkContainer: {
    marginTop: theme.spacing(0.5),
    alignItems: "center"
  },
  linkText: {
    fontSize: theme.typography.small,
    color: theme.colors.primary,
    fontWeight: "600"
  }
});

export default ResetPasswordScreen;

