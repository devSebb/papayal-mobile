import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import TextField from "../ui/components/TextField";
import Button from "../ui/components/Button";
import { theme } from "../ui/theme";
import { useAuth } from "../auth/authStore";
import { HttpError } from "../api/http";
import type { AuthStackParamList } from "../navigation";

type Nav = NativeStackNavigationProp<AuthStackParamList>;
type Route = RouteProp<AuthStackParamList, "EmailVerification">;

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

/**
 * Maps email-verification error codes to Spanish copy. Raw API text must
 * never reach the UI, so anything unrecognized falls back to a generic phrase.
 */
const messageForError = (err: HttpError): string => {
  const code = err?.error?.code;
  if (code === "auth.email_otp_invalid") {
    const details = err.error?.details as { attempts_remaining?: number } | undefined;
    const remaining = details?.attempts_remaining;
    if (typeof remaining === "number") {
      return remaining === 1
        ? "Código incorrecto. Te queda 1 intento."
        : `Código incorrecto. Te quedan ${remaining} intentos.`;
    }
    return "Código incorrecto. Inténtalo de nuevo.";
  }
  if (code === "auth.email_otp_expired") {
    return "El código expiró. Pide uno nuevo.";
  }
  if (code === "auth.email_verification_not_found") {
    return "No encontramos una verificación pendiente. Regresa e inténtalo de nuevo.";
  }
  if (code === "network_error") {
    return "Sin conexión. Verifica tu internet e inténtalo de nuevo.";
  }
  return "No pudimos verificar el código. Inténtalo de nuevo.";
};

const EmailVerificationScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { verifyEmail, resendEmailVerification, authLoading } = useAuth();

  const { email } = route.params;
  const [maskedEmail, setMaskedEmail] = useState<string | null | undefined>(
    route.params.maskedEmail
  );
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(
    route.params.resendAvailableIn ?? RESEND_SECONDS
  );
  const lastSubmittedCode = useRef<string | null>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSubmit = useCallback(
    async (otp: string) => {
      if (otp.length !== OTP_LENGTH) return;
      lastSubmittedCode.current = otp;
      setError(null);
      setNotice(null);
      try {
        // On success the auth store stores the tokens and RootNavigator
        // switches to the app — same as a normal login.
        await verifyEmail(email, otp);
      } catch (err) {
        const httpErr = err as HttpError;
        setError(messageForError(httpErr));
        setCode("");
        lastSubmittedCode.current = null;
      }
    },
    [email, verifyEmail]
  );

  // Auto-submit once the 6th digit is typed (guarded so the same code isn't
  // re-sent while a request is in flight or right after it failed).
  useEffect(() => {
    if (
      code.length === OTP_LENGTH &&
      !authLoading &&
      !resending &&
      lastSubmittedCode.current !== code
    ) {
      handleSubmit(code);
    }
  }, [code, authLoading, resending, handleSubmit]);

  const handleResend = async () => {
    setError(null);
    setNotice(null);
    setResending(true);
    try {
      const details = await resendEmailVerification(email);
      if (details.masked_email) setMaskedEmail(details.masked_email);
      setCountdown(details.resend_available_in ?? RESEND_SECONDS);
      setCode("");
      lastSubmittedCode.current = null;
      setNotice(
        typeof details.resend_available_in === "number" && details.resend_available_in > 0
          ? "Ya te enviamos un código hace poco. Revisa tu correo."
          : "Te enviamos un nuevo código."
      );
    } catch (err) {
      setError(messageForError(err as HttpError));
    } finally {
      setResending(false);
    }
  };

  const busy = authLoading || resending;
  const target = maskedEmail || email;

  return (
    <Screen scrollable>
      <Pressable
        onPress={() => navigation.goBack()}
        style={styles.backButton}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Volver"
      >
        <Feather name="arrow-left" size={24} color={theme.colors.text} />
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.title}>Verifica tu correo</Text>
        <Text style={styles.subtitle}>
          Ya casi terminas de crear tu cuenta.
        </Text>
      </View>

      <Card style={styles.card}>
        <View style={styles.mailRow}>
          <View style={styles.mailBadge}>
            <Feather name="mail" size={20} color={theme.colors.primary} />
          </View>
          <Text style={styles.mailText}>
            Enviamos un código de 6 dígitos a {target}. Ingrésalo para activar tu cuenta.
          </Text>
        </View>

        <TextField
          label="Código de verificación"
          value={code}
          onChangeText={(text) => {
            setError(null);
            setCode(text.replace(/[^0-9]/g, "").slice(0, OTP_LENGTH));
          }}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={OTP_LENGTH}
          placeholder="123456"
          autoFocus
          editable={!busy}
          style={styles.codeInput}
          error={error ?? undefined}
        />

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <Button
          label="Verificar y crear cuenta"
          onPress={() => handleSubmit(code)}
          loading={authLoading}
          disabled={code.length !== OTP_LENGTH || busy}
          style={styles.submit}
        />
        <Button
          label={countdown > 0 ? `Reenviar código (${countdown}s)` : "Reenviar código"}
          variant="ghost"
          onPress={handleResend}
          loading={resending}
          disabled={countdown > 0 || busy}
        />
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  backButton: {
    marginBottom: theme.spacing(1),
    alignSelf: "flex-start"
  },
  header: {
    marginBottom: theme.spacing(2)
  },
  title: {
    fontSize: 32,
    fontFamily: theme.fonts.extraBold,
    color: theme.colors.secondary
  },
  subtitle: {
    fontSize: theme.typography.body,
    color: theme.colors.muted,
    marginTop: theme.spacing(0.5),
    lineHeight: 24
  },
  card: {
    gap: theme.spacing(1.5)
  },
  mailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing(1),
    padding: theme.spacing(1),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background
  },
  mailBadge: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border
  },
  mailText: {
    flex: 1,
    fontSize: theme.typography.small,
    color: theme.colors.secondary,
    fontFamily: theme.fonts.semiBold,
    lineHeight: 20
  },
  codeInput: {
    letterSpacing: 8,
    fontSize: 22,
    textAlign: "center",
    fontFamily: theme.fonts.bold
  },
  notice: {
    color: theme.colors.success,
    fontSize: theme.typography.small,
    fontFamily: theme.fonts.semiBold
  },
  submit: {
    marginTop: theme.spacing(0.5)
  }
});

export default EmailVerificationScreen;
