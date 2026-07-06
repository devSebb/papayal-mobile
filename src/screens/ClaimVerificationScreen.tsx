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
import type { ClaimVerificationDetails } from "../types/api";
import type { AuthStackParamList } from "../navigation";

type Nav = NativeStackNavigationProp<AuthStackParamList>;
type Route = RouteProp<AuthStackParamList, "ClaimVerification">;

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

const channelLabel = (details: ClaimVerificationDetails): string => {
  const parts: string[] = [];
  if (details.masked_email) parts.push(details.masked_email);
  if (details.masked_phone) parts.push(details.masked_phone);
  if (parts.length === 0) return "tus datos de contacto";
  return parts.join(" y ");
};

/**
 * Maps claim-OTP error codes to Spanish copy. Raw API text must never
 * reach the UI, so anything unrecognized falls back to a generic phrase.
 */
const messageForError = (err: HttpError): string => {
  const code = err?.error?.code;
  if (code === "auth.claim_otp_invalid") {
    const details = err.error?.details as { attempts_remaining?: number } | undefined;
    const remaining = details?.attempts_remaining;
    if (typeof remaining === "number") {
      return remaining === 1
        ? "Código incorrecto. Te queda 1 intento."
        : `Código incorrecto. Te quedan ${remaining} intentos.`;
    }
    return "Código incorrecto. Inténtalo de nuevo.";
  }
  if (code === "auth.claim_otp_expired") {
    return "El código expiró. Pide uno nuevo.";
  }
  if (code === "network_error") {
    return "Sin conexión. Verifica tu internet e inténtalo de nuevo.";
  }
  return "No pudimos verificar el código. Inténtalo de nuevo.";
};

const ClaimVerificationScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { signup, authLoading } = useAuth();

  const { formData } = route.params;
  const [details, setDetails] = useState<ClaimVerificationDetails>(route.params.details);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(
    route.params.details.retry_in_seconds ?? RESEND_SECONDS
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
        // On success the auth store receives the tokens and RootNavigator
        // switches to the app — same as the normal signup flow.
        await signup({ ...formData, claim_otp: otp });
      } catch (err) {
        const httpErr = err as HttpError;
        setError(messageForError(httpErr));
        setCode("");
        lastSubmittedCode.current = null;
      }
    },
    [formData, signup]
  );

  // Auto-submit once the 6th digit is typed (guarded so the same code
  // isn't re-sent while a request is in flight or after it failed).
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
      // Re-POST the signup WITHOUT claim_otp: the backend re-issues (or,
      // if throttled, re-describes) the challenge via the same 409.
      await signup({ ...formData, claim_otp: undefined });
      // A signup without OTP should never succeed while the account is
      // pending; if it somehow does, the auth store already has tokens.
      setCountdown(RESEND_SECONDS);
    } catch (err) {
      const httpErr = err as HttpError;
      if (httpErr?.status === 409 && httpErr.error?.code === "auth.claim_verification_required") {
        const nextDetails = (httpErr.error?.details as ClaimVerificationDetails) ?? {};
        setDetails(nextDetails);
        setCountdown(nextDetails.retry_in_seconds ?? RESEND_SECONDS);
        setCode("");
        lastSubmittedCode.current = null;
        setNotice(
          typeof nextDetails.retry_in_seconds === "number"
            ? "Ya te enviamos un código hace poco. Revisa tus mensajes."
            : "Te enviamos un nuevo código."
        );
      } else {
        setError(messageForError(httpErr));
      }
    } finally {
      setResending(false);
    }
  };

  const busy = authLoading || resending;

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
        <Text style={styles.title}>Verifica que eres tú</Text>
        <Text style={styles.subtitle}>
          Encontramos tarjetas de regalo esperándote en esta cuenta.
        </Text>
      </View>

      <Card style={styles.card}>
        <View style={styles.giftRow}>
          <View style={styles.giftBadge}>
            <Feather name="gift" size={20} color={theme.colors.primary} />
          </View>
          <Text style={styles.giftText}>
            Para protegerlas, enviamos un código de verificación a {channelLabel(details)}.
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
  giftRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing(1),
    padding: theme.spacing(1),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background
  },
  giftBadge: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border
  },
  giftText: {
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

export default ClaimVerificationScreen;
