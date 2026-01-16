import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
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

type AuthNav = NativeStackNavigationProp<AuthStackParamList>;

const SignupScreen: React.FC = () => {
  const navigation = useNavigation<AuthNav>();
  const { signup, authLoading } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  const phoneRegex = /^\+?[0-9\s-]{7,15}$/;

  const handleSignup = async () => {
    setError(null);
    setFieldErrors({});

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    const nextErrors: Record<string, string> = {};
    if (!trimmedFirstName) nextErrors.first_name = "Requerido";
    if (!trimmedLastName) nextErrors.last_name = "Requerido";
    if (!trimmedEmail) nextErrors.email = "Requerido";
    if (!trimmedPhone || !phoneRegex.test(trimmedPhone)) nextErrors.phone = "Teléfono inválido";
    if (!password) nextErrors.password = "Requerido";
    if (!confirmPassword) nextErrors.password_confirmation = "Confirma tu contraseña";
    if (password && confirmPassword && password !== confirmPassword)
      nextErrors.password_confirmation = "Las contraseñas no coinciden.";

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError("Revisa los campos resaltados.");
      return;
    }

    const payload = {
      first_name: trimmedFirstName,
      last_name: trimmedLastName,
      email: trimmedEmail,
      password,
      password_confirmation: confirmPassword,
      phone: trimmedPhone
    };

    try {
      await signup(payload);
    } catch (err) {
      const httpErr = err as HttpError;
      const details = httpErr?.error?.details;
      const nextFieldErrors: Record<string, string> = {};
      let friendly =
        (httpErr?.error?.message as string | undefined) ??
        "No pudimos crear tu cuenta. Inténtalo de nuevo.";

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
    }
  };

  const canSubmit = Boolean(
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    password &&
    confirmPassword &&
    phoneRegex.test(phone.trim())
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
            label="Nombre"
            value={firstName}
            onChangeText={(text) => {
              setFirstName(text);
              setFieldErrors((prev) => ({ ...prev, first_name: undefined }));
            }}
            autoComplete="name"
            style={styles.inputSpacing}
            error={fieldErrors.first_name}
          />
          <TextField
            label="Apellido"
            value={lastName}
            onChangeText={(text) => {
              setLastName(text);
              setFieldErrors((prev) => ({ ...prev, last_name: undefined }));
            }}
            autoComplete="name"
            style={styles.inputSpacing}
            error={fieldErrors.last_name}
          />
          <TextField
            label="Correo"
            value={email}
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={(text) => {
              setEmail(text);
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            autoComplete="email"
            style={styles.inputSpacing}
            error={fieldErrors.email}
          />
          <TextField
            label="Teléfono"
            value={phone}
            keyboardType="phone-pad"
            onChangeText={(text) => {
              setPhone(text);
              setFieldErrors((prev) => ({ ...prev, phone: undefined }));
            }}
            autoComplete="tel"
            style={styles.inputSpacing}
            placeholder="+593..."
            error={fieldErrors.phone}
          />
          <TextField
            label="Contraseña"
            value={password}
            secureTextEntry
            onChangeText={(text) => {
              setPassword(text);
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            autoComplete="password"
            style={styles.inputSpacing}
            error={fieldErrors.password}
          />
          <TextField
            label="Confirmar contraseña"
            value={confirmPassword}
            secureTextEntry
            onChangeText={(text) => {
              setConfirmPassword(text);
              setFieldErrors((prev) => ({ ...prev, password_confirmation: undefined }));
            }}
            autoComplete="password"
            style={styles.inputSpacing}
            error={fieldErrors.password_confirmation}
          />
          <Pressable
            onPress={() => {
              const trimmedEmail = email.trim();
              (navigation as any).navigate("ForgotPassword", trimmedEmail ? { email: trimmedEmail } : {});
            }}
            hitSlop={10}
            style={styles.forgotPasswordLink}
          >
          </Pressable>
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
  forgotPasswordLink: {
    alignSelf: "flex-end",
    marginTop: theme.spacing(0.5)
  },
  forgotPasswordText: {
    fontSize: theme.typography.small,
    color: theme.colors.primary,
    fontWeight: "600"
  },
  submit: {
    marginTop: theme.spacing(1)
  },
  error: {
    color: theme.colors.danger
  }
});

export default SignupScreen;


