import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import BackButton from "../ui/components/BackButton";
import TextField from "../ui/components/TextField";
import Button from "../ui/components/Button";
import { theme } from "../ui/theme";
import { authApi } from "../api/endpoints";
import { HttpError } from "../api/http";
import { formatValidationDetails, translateValidationMessage } from "../utils/formErrors";
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
    if (!trimmedToken) nextErrors.reset_token = "El código es requerido";
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
      const code = httpErr?.error?.code;
      const details = httpErr?.error?.details;
      const fallback = "No pudimos restablecer tu contraseña. Inténtalo de nuevo.";

      // Token problems come back without a field `details` object, so the
      // generic 422 handler below can't translate them. Map the error code to
      // actionable Spanish copy and steer the user toward requesting a new code.
      const tokenErrors: Record<string, string> = {
        "auth.token_expired": "El código expiró. Solicita uno nuevo para continuar.",
        "auth.invalid_token":
          "El código no es válido. Verifica que lo copiaste completo o solicita uno nuevo.",
        "auth.missing_token": "Ingresa el código que recibiste por correo."
      };
      if (code && tokenErrors[code]) {
        setFieldErrors({ reset_token: "Código inválido o expirado" });
        setError(tokenErrors[code]);
        return;
      }

      let friendly = fallback;

      if (
        httpErr?.status === 422 &&
        details &&
        typeof details === "object" &&
        !Array.isArray(details)
      ) {
        const nextFieldErrors: Record<string, string> = {};
        Object.entries(details as Record<string, unknown>).forEach(([key, value]) => {
          const messages = (Array.isArray(value) ? value : [value]).filter(
            (message): message is string => typeof message === "string" && message.trim().length > 0
          );
          if (messages.length > 0) {
            nextFieldErrors[key] = messages.map(translateValidationMessage).join(", ");
          }
        });
        if (Object.keys(nextFieldErrors).length > 0) {
          setFieldErrors(nextFieldErrors);
        }
        friendly =
          formatValidationDetails(details as Record<string, string[] | string>) ?? fallback;
      }

      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = Boolean(token.trim() && password && confirmPassword && password === confirmPassword);

  return (
    <Screen scrollable>
      {navigation.canGoBack() ? (
        <View style={styles.navRow}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>
      ) : null}
      <View style={styles.header}>
        <Text style={styles.title}>Restablecer contraseña</Text>
        <Text style={styles.subtitle}>
          {success
            ? "Tu contraseña ha sido restablecida exitosamente."
            : "Ingresa el código que recibiste por correo y tu nueva contraseña."}
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
              label="Código de recuperación"
              value={token}
              autoCapitalize="none"
              onChangeText={(text) => {
                setToken(text);
                setFieldErrors((prev) => ({ ...prev, reset_token: undefined }));
              }}
              placeholder="Pega el código aquí"
              editable={!loading}
              error={fieldErrors.reset_token}
            />
            <TextField
              label="Nueva contraseña"
              value={password}
              secureTextEntry
              secureToggle
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
              secureToggle
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
              onPress={() => navigation.navigate("ForgotPassword", {})}
              hitSlop={10}
              style={styles.linkContainer}
            >
              <Text style={styles.linkText}>¿Necesitas un nuevo código? Solicítalo aquí</Text>
            </Pressable>
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
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing(1)
  },
  header: {
    marginBottom: theme.spacing(2)
  },
  title: {
    fontSize: 32,
    fontFamily: theme.fonts.bold,
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
    fontFamily: theme.fonts.semiBold
  }
});

export default ResetPasswordScreen;
