import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable, TouchableOpacity } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import TextField from "../ui/components/TextField";
import PhoneInput from "../ui/components/PhoneInput";
import Button from "../ui/components/Button";
import { theme } from "../ui/theme";
import { useAuth } from "../auth/authStore";
import { HttpError } from "../api/http";
import type { AuthStackParamList } from "../navigation";
import { openLegal } from "../utils/openExternal";

type AuthNav = NativeStackNavigationProp<AuthStackParamList>;

const SignupScreen: React.FC = () => {
  const navigation = useNavigation<AuthNav>();
  const { signup, authLoading } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneE164, setPhoneE164] = useState<string | null>(null);
  const [phoneValid, setPhoneValid] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState<string | undefined>(undefined);

  const handleSignup = async () => {
    setError(null);
    setFieldErrors({});

    setPhoneTouched(true);
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();

    const nextErrors: Record<string, string> = {};
    if (!trimmedFirstName) nextErrors.first_name = "Requerido";
    if (!trimmedLastName) nextErrors.last_name = "Requerido";
    if (!trimmedEmail) nextErrors.email = "Requerido";
    if (!phoneE164 || !phoneValid) nextErrors.phone = phoneE164 ? "Teléfono inválido" : "Teléfono requerido";
    if (!password) nextErrors.password = "Requerido";
    if (!confirmPassword) nextErrors.password_confirmation = "Confirma tu contraseña";
    if (password && confirmPassword && password !== confirmPassword)
      nextErrors.password_confirmation = "Las contraseñas no coinciden.";
    
    if (!termsAccepted) {
      setTermsError("Debes aceptar los Términos y la Política de Privacidad para continuar.");
      setFieldErrors(nextErrors);
      setError("Debes aceptar los Términos y la Política de Privacidad para continuar.");
      return;
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError("Revisa los campos resaltados.");
      return;
    }

    if (!phoneE164) {
      setFieldErrors((prev) => ({ ...prev, phone: "Teléfono requerido" }));
      setError("Revisa los campos resaltados.");
      return;
    }

    const payload = {
      first_name: trimmedFirstName,
      last_name: trimmedLastName,
      email: trimmedEmail,
      password,
      password_confirmation: confirmPassword,
      phone: phoneE164
    };

    try {
      await signup(payload);
      // Store acceptance on successful signup
      await AsyncStorage.setItem(
        "legal_acceptance_v1",
        JSON.stringify({
          accepted: true,
          accepted_at: new Date().toISOString()
        })
      );
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
    phoneE164 &&
    phoneValid &&
    termsAccepted
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
          <PhoneInput
            label="Teléfono"
            valueE164={phoneE164}
            onChangeE164={(e164) => {
              setPhoneE164(e164);
              setFieldErrors((prev) => ({ ...prev, phone: undefined }));
            }}
            onValidChange={setPhoneValid}
            required
            style={styles.inputSpacing}
            placeholder="099 123 4567"
            error={phoneTouched || fieldErrors.phone ? fieldErrors.phone : undefined}
            onBlur={() => setPhoneTouched(true)}
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
          <View style={styles.termsContainer}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => {
                setTermsAccepted(!termsAccepted);
                setTermsError(undefined);
                setError(null);
              }}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  termsAccepted ? styles.checkboxChecked : null,
                  termsError ? styles.checkboxError : null
                ]}
              >
                {termsAccepted && (
                  <Feather name="check" size={16} color={theme.colors.secondary} />
                )}
              </View>
              <View style={styles.termsTextContainer}>
                <Text style={styles.termsText}>
                  He leído y acepto los{" "}
                  <Text
                    style={styles.termsLink}
                    onPress={() => openLegal("/legal/terminos")}
                  >
                    Términos
                  </Text>
                  {" "}y la{" "}
                  <Text
                    style={styles.termsLink}
                    onPress={() => openLegal("/legal/privacidad")}
                  >
                    Política de Privacidad
                  </Text>
                  .
                </Text>
              </View>
            </TouchableOpacity>
            {termsError ? <Text style={styles.termsError}>{termsError}</Text> : null}
          </View>
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
  },
  termsContainer: {
    marginTop: theme.spacing(0.5),
    marginBottom: theme.spacing(0.5)
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing(1)
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2
  },
  checkboxError: {
    borderColor: theme.colors.danger
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  termsTextContainer: {
    flex: 1,
    flexWrap: "wrap"
  },
  termsText: {
    fontSize: theme.typography.small,
    color: theme.colors.text,
    lineHeight: 20
  },
  termsLink: {
    color: theme.colors.primary,
    fontWeight: "600",
    textDecorationLine: "underline"
  },
  termsError: {
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    marginTop: theme.spacing(0.5),
    marginLeft: theme.spacing(3.5)
  }
});

export default SignupScreen;


