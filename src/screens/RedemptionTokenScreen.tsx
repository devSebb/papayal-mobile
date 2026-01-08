import React, { useEffect, useMemo, useState } from "react";
import { RouteProp, useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import Button from "../ui/components/Button";
import { theme } from "../ui/theme";
import { giftCardApi } from "../api/endpoints";
import { WalletStackParamList } from "../navigation";
import { HttpError } from "../api/http";
import { useAuth } from "../auth/authStore";

const formatCountdown = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const RedemptionTokenScreen: React.FC = () => {
  const route = useRoute<RouteProp<WalletStackParamList, "RedemptionToken">>();
  const { id } = route.params;
  const { accessToken } = useAuth();
  const isQueryEnabled = !!accessToken;
  const [version, setVersion] = useState(0);
  const [remaining, setRemaining] = useState(0);
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
    const interval = setInterval(() => {
      if (data?.expires_at) {
        const diffMs = new Date(data.expires_at).getTime() - Date.now();
        setRemaining(Math.max(0, Math.round(diffMs / 1000)));
      } else {
        setRemaining(0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [data?.expires_at]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const friendlyError = useMemo(() => {
    if (!error) return null;
    const err = error as HttpError;
    if (err.status === 422) return "Card is inactive or cannot generate a token.";
    if (err.status === 403) return "You are not allowed to redeem this card.";
    return err.error?.message ?? "Unable to generate token.";
  }, [error]);

  const handleRegenerate = () => {
    setCooldown(4);
    setVersion((v) => v + 1);
  };

  return (
    <Screen scrollable edges={["left", "right"]}>
      <Card>
        <Text style={styles.title}>Redemption Token</Text>
        {isBusy ? <Text style={styles.muted}>Generating...</Text> : null}
        {friendlyError ? <Text style={styles.error}>{friendlyError}</Text> : null}
        {data ? (
          <View style={styles.tokenContainer}>
            <View style={styles.qrWrapper}>
              <QRCode value={data.token} size={180} />
            </View>
            <Text style={styles.tokenText}>{data.token}</Text>
            <Text style={styles.muted}>Expires at: {data.expires_at}</Text>
            <Text style={styles.countdown}>Time left: {formatCountdown(remaining)}</Text>
          </View>
        ) : null}
        <Button
          label="Regenerate"
          onPress={handleRegenerate}
          disabled={isFetching || cooldown > 0 || !accessToken}
          style={styles.button}
        />
        {cooldown > 0 ? (
          <Text style={styles.cooldown}>Please wait {cooldown}s before regenerating.</Text>
        ) : null}
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: theme.typography.subheading,
    fontWeight: "700",
    marginBottom: theme.spacing(1)
  },
  tokenContainer: {
    alignItems: "center",
    gap: theme.spacing(1.25)
  },
  tokenText: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 1.1,
    color: theme.colors.text
  },
  muted: {
    color: theme.colors.muted
  },
  countdown: {
    color: theme.colors.secondary,
    fontWeight: "600"
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
  cooldown: {
    color: theme.colors.muted,
    marginTop: theme.spacing(0.5)
  }
});

export default RedemptionTokenScreen;

