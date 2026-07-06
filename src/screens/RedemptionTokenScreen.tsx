import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RouteProp, useFocusEffect, useRoute } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Barcode } from "expo-barcode-generator";
import { Feather } from "@expo/vector-icons";
import * as Brightness from "expo-brightness";
import { usePreventScreenCapture } from "expo-screen-capture";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import Button from "../ui/components/Button";
import { theme } from "../ui/theme";
import { giftCardApi } from "../api/endpoints";
import { WalletStackParamList } from "../navigation";
import { HttpError } from "../api/http";
import { useAuth } from "../auth/authStore";
import { toDisplayTime } from "../utils/date";

const formatCountdown = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// Visual-only: groups the 10-char token as XXXX-XXX-XXX for easier manual
// reading. Never used as input to QR/barcode or sent to the API.
const formatTokenForDisplay = (token: string) => {
  if (!token || token.length !== 10) return token;
  return `${token.slice(0, 4)}-${token.slice(4, 7)}-${token.slice(7)}`;
};

const RedemptionTokenScreen: React.FC = () => {
  usePreventScreenCapture();
  const route = useRoute<RouteProp<WalletStackParamList, "RedemptionToken">>();
  const { id } = route.params;
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const isQueryEnabled = !!accessToken;
  const [version, setVersion] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [cooldown, setCooldown] = useState(0);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["redemptionToken", id, version],
    queryFn: () => giftCardApi.redemptionToken(id),
    staleTime: 0,
    enabled: isQueryEnabled,
    retry: (failureCount, err: any) => {
      const httpErr = err as HttpError;
      if (httpErr.status === 422 || httpErr.status === 403) return false;
      return failureCount < 1;
    }
  });
  const isBusy = !isQueryEnabled || isLoading || isFetching;

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Derived from `now` so the countdown is correct on the very first render
  // after data arrives, instead of flashing 0:00 until the first tick.
  const remaining = useMemo(() => {
    if (!data?.expires_at) return 0;
    const diffMs = new Date(data.expires_at).getTime() - now;
    return Math.max(0, Math.round(diffMs / 1000));
  }, [data?.expires_at, now]);

  const isExpired = !!data && remaining <= 0;

  // Max brightness while the code is on screen so register scanners can read
  // it; best-effort only — brightness failures must never break redemption.
  useFocusEffect(
    useCallback(() => {
      let saved: number | null = null;
      let active = true;
      (async () => {
        try {
          saved = await Brightness.getBrightnessAsync();
          if (active) await Brightness.setBrightnessAsync(1);
        } catch {
          // ignore: keep the token visible even if brightness control fails
        }
      })();
      return () => {
        active = false;
        if (saved !== null) {
          Brightness.setBrightnessAsync(saved).catch(() => {});
        }
      };
    }, [])
  );

  // The merchant likely redeemed while this screen was open; refresh balances
  // so the wallet reflects the new amounts when the user navigates back.
  useFocusEffect(
    useCallback(() => {
      return () => {
        queryClient.invalidateQueries({ queryKey: ["giftCard", id] });
        queryClient.invalidateQueries({ queryKey: ["giftCards"] });
      };
    }, [id, queryClient])
  );

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const friendlyError = useMemo(() => {
    if (!error) return null;
    const err = error as HttpError;
    if (err.status === 422) return "La tarjeta está inactiva o no puede generar un token.";
    if (err.status === 403) return "No puedes canjear esta tarjeta.";
    return err.error?.message ?? "No pudimos generar el token.";
  }, [error]);

  const handleRegenerate = () => {
    setCooldown(4);
    setVersion((v) => v + 1);
  };

  return (
    <Screen scrollable edges={["left", "right"]}>
      <Card>
        <Text style={styles.title}>Token de canje</Text>
        {isBusy ? <Text style={styles.muted}>Generando...</Text> : null}
        {friendlyError ? <Text style={styles.error}>{friendlyError}</Text> : null}
        {data ? (
          <View style={styles.tokenContainer}>
            <View style={styles.codeArea}>
              <View style={styles.qrWrapper}>
                <QRCode value={data.token} size={180} />
              </View>
              <View style={styles.barcodeWrapper}>
                <Barcode
                  value={data.token}
                  options={{
                    format: "CODE128",
                    width: 2,
                    height: 70,
                    displayValue: false,
                    margin: 10,
                    background: theme.colors.card
                  }}
                />
              </View>
              <Text style={styles.tokenText}>{formatTokenForDisplay(data.token)}</Text>
              {isExpired ? (
                <View
                  style={styles.expiredOverlay}
                  accessible
                  accessibilityRole="alert"
                  accessibilityLabel="Código vencido. Genera un nuevo código para canjear."
                >
                  <Feather name="clock" size={40} color={theme.colors.danger} />
                  <Text style={styles.expiredTitle}>Código vencido</Text>
                </View>
              ) : null}
            </View>
            {isExpired ? (
              <Text style={styles.expiredHint}>
                Este código ya no es válido. Genera uno nuevo para canjear.
              </Text>
            ) : (
              <>
                <Text style={styles.muted}>Expira a las {toDisplayTime(data.expires_at)}</Text>
                <Text style={styles.countdown}>Tiempo restante: {formatCountdown(remaining)}</Text>
              </>
            )}
          </View>
        ) : null}
        <Button
          label={isExpired ? "Generar nuevo código" : "Regenerar"}
          accessibilityLabel={
            isExpired ? "Generar nuevo código de canje" : "Regenerar código de canje"
          }
          onPress={handleRegenerate}
          disabled={isFetching || cooldown > 0 || !accessToken}
          style={styles.button}
        />
        {cooldown > 0 ? (
          <Text style={styles.cooldown}>Espera {cooldown}s antes de regenerar.</Text>
        ) : null}
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: theme.typography.subheading,
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing(1)
  },
  tokenContainer: {
    alignItems: "center",
    gap: theme.spacing(1.25)
  },
  codeArea: {
    alignSelf: "stretch",
    alignItems: "center",
    gap: theme.spacing(1.25)
  },
  tokenText: {
    fontSize: 22,
    fontFamily: theme.fonts.bold,
    letterSpacing: 1.1,
    color: theme.colors.text
  },
  muted: {
    color: theme.colors.muted
  },
  countdown: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.semiBold
  },
  button: {
    marginTop: theme.spacing(2)
  },
  error: {
    color: theme.colors.danger,
    marginBottom: theme.spacing(1)
  },
  qrWrapper: {
    padding: theme.spacing(1),
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border
  },
  barcodeWrapper: {
    padding: theme.spacing(1),
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    overflow: "hidden"
  },
  expiredOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing(1),
    backgroundColor: "rgba(255, 255, 255, 0.93)",
    borderRadius: theme.radius.md,
    zIndex: 1
  },
  expiredTitle: {
    fontSize: theme.typography.subheading,
    fontFamily: theme.fonts.bold,
    color: theme.colors.danger
  },
  expiredHint: {
    color: theme.colors.muted,
    textAlign: "center"
  },
  cooldown: {
    color: theme.colors.muted,
    marginTop: theme.spacing(0.5)
  }
});

export default RedemptionTokenScreen;
