import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import TextField from "../ui/components/TextField";
import Button from "../ui/components/Button";
import { theme } from "../ui/theme";
import { useAuth } from "../auth/authStore";
import { HttpError } from "../api/http";

const LoginScreen: React.FC = () => {
  const { login, authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      const friendly =
        (err as HttpError)?.error?.message ??
        "No pudimos iniciar sesión. Revisa tus credenciales.";
      setError(friendly);
    }
  };

  return (
    <Screen scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>Papayal</Text>
        <Text style={styles.subtitle}>Inicia sesión para administrar tu billetera.</Text>
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
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label="Iniciar sesión"
            onPress={handleLogin}
            loading={authLoading}
            disabled={!email || !password}
            style={styles.submit}
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
    gap: theme.spacing(1.5)
  },
  inputSpacing: {
    marginTop: theme.spacing(0.5)
  },
  submit: {
    marginTop: theme.spacing(1)
  },
  error: {
    color: theme.colors.danger
  }
});

export default LoginScreen;

