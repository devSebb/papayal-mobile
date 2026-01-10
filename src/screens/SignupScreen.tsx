import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import TextField from "../ui/components/TextField";
import Button from "../ui/components/Button";
import { theme } from "../ui/theme";
import { useAuth } from "../auth/authStore";
import { HttpError } from "../api/http";
import type { AuthStackParamList } from "../navigation";

type AuthNav = NativeStackNavigationProp<AuthStackParamList, "Signup">;

const SignupScreen: React.FC = () => {
  const navigation = useNavigation<AuthNav>();
  const { signup, authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async () => {
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedNationalId = nationalId.trim();

    if (!trimmedEmail || !password || !confirmPassword || !trimmedName || !trimmedPhone || !trimmedNationalId) {
      setError("Completa todos los campos obligatorios.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    const payload = {
      email: trimmedEmail,
      password,
      name: trimmedName,
      phone: trimmedPhone,
      national_id: trimmedNationalId
    };

    try {
      await signup(payload);
    } catch (err) {
      const httpErr = err as HttpError;
      const details = httpErr?.error?.details;
      let friendly =
        (httpErr?.error?.message as string | undefined) ?? "No pudimos crear tu cuenta. Inténtalo de nuevo.";

      if (httpErr?.status === 422 && details) {
        if (typeof details === "string") {
          friendly = details;
        } else if (Array.isArray(details)) {
          friendly = details.filter(Boolean).join(", ");
        } else if (typeof details === "object") {
          const parts = Object.entries(details as Record<string, unknown>)
            .map(([key, value]) => {
              if (!value) return null;
              if (Array.isArray(value)) {
                return `${key}: ${value.join(", ")}`;
              }
              return `${key}: ${String(value)}`;
            })
            .filter(Boolean)
            .join(" ");
          if (parts) {
            friendly = parts;
          }
        }
      }

      setError(friendly);
    }
  };

  const canSubmit = Boolean(
    email.trim() &&
    password &&
    confirmPassword &&
    name.trim() &&
    phone.trim() &&
    nationalId.trim()
  );

  return (
    <Screen scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>Crea tu cuenta</Text>
        <Text style={styles.subtitle}>Empieza a gestionar tu billetera Papayal.</Text>
      </View>
      <Card>
        <View style={styles.form}>
          <TextField
            label="Correo"
            value={email}
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            autoComplete="email"
          />
          <TextField
            label="Contraseña"
            value={password}
            secureTextEntry
            onChangeText={setPassword}
            autoComplete="password"
            style={styles.inputSpacing}
          />
          <TextField
            label="Confirmar contraseña"
            value={confirmPassword}
            secureTextEntry
            onChangeText={setConfirmPassword}
            autoComplete="password"
            style={styles.inputSpacing}
          />
          <TextField
            label="Nombre completo"
            value={name}
            onChangeText={setName}
            autoComplete="name"
            style={styles.inputSpacing}
          />
          <TextField
            label="Teléfono"
            value={phone}
            keyboardType="phone-pad"
            onChangeText={setPhone}
            autoComplete="tel"
            style={styles.inputSpacing}
          />
          <TextField
            label="Documento de identidad"
            value={nationalId}
            onChangeText={setNationalId}
            autoCapitalize="characters"
            style={styles.inputSpacing}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label="Crear cuenta"
            onPress={handleSignup}
            loading={authLoading}
            disabled={!canSubmit || authLoading}
            style={styles.submit}
          />
          <Button
            label="¿Ya tienes una cuenta? Inicia sesión"
            variant="ghost"
            onPress={() => navigation.navigate("Login")}
          />
        </View>
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
    gap: theme.spacing(1.25)
  },
  inputSpacing: {
    marginTop: theme.spacing(0.25)
  },
  submit: {
    marginTop: theme.spacing(1)
  },
  error: {
    color: theme.colors.danger
  }
});

export default SignupScreen;


