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

type LoginNav = NativeStackNavigationProp<AuthStackParamList>;

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginNav>();
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
          <Pressable
            onPress={() => {
              const trimmedEmail = email.trim();
              (navigation as any).navigate("ForgotPassword", trimmedEmail ? { email: trimmedEmail } : {});
            }}
            hitSlop={10}
            style={styles.forgotPasswordLink}
          >
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
          </Pressable>
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

export default LoginScreen;

