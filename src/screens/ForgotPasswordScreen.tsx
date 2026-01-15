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

type ForgotPasswordNav = NativeStackNavigationProp<AuthStackParamList, "ForgotPassword">;
type ForgotPasswordRoute = RouteProp<AuthStackParamList, "ForgotPassword">;

const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ForgotPasswordNav>();
  const route = useRoute<ForgotPasswordRoute>();
  const [email, setEmail] = useState(route.params?.email || "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);

    if (!email.trim()) {
      setError("Por favor ingresa tu correo electrónico.");
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSuccess(true);
    } catch (err) {
      const friendly =
        (err as HttpError)?.error?.message ??
        "No pudimos procesar tu solicitud. Inténtalo de nuevo.";
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>Recuperar contraseña</Text>
        <Text style={styles.subtitle}>
          {success
            ? "Si existe una cuenta con ese correo, se han enviado las instrucciones para restablecer tu contraseña."
            : "Ingresa tu correo electrónico y te enviaremos las instrucciones para restablecer tu contraseña."}
        </Text>
      </View>
      <Card>
        {success ? (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>
              Revisa tu correo electrónico para continuar con el proceso de recuperación de contraseña.
            </Text>
            <Button
              label="Volver a iniciar sesión"
              onPress={() => navigation.navigate("Login")}
              style={styles.backButton}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <TextField
              label="Correo"
              value={email}
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              autoComplete="email"
              editable={!loading}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              label="Enviar instrucciones"
              onPress={handleSubmit}
              loading={loading}
              disabled={!email.trim() || loading}
              style={styles.submit}
            />
            <Pressable
              onPress={() => navigation.navigate("Login")}
              hitSlop={10}
              style={styles.linkContainer}
            >
              <Text style={styles.linkText}>¿Recordaste tu contraseña? Inicia sesión</Text>
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

export default ForgotPasswordScreen;

