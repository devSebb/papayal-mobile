import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import Button from "../ui/components/Button";
import { theme } from "../ui/theme";
import { meApi } from "../api/endpoints";
import { useAuth } from "../auth/authStore";
import { API_BASE_URL } from "../config/env";
import { getLastRequestId } from "../api/http";

const ProfileScreen: React.FC = () => {
  const { logout, logoutAll, accessToken } = useAuth();
  const isQueryEnabled = !!accessToken;
  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: meApi.me,
    enabled: isQueryEnabled
  });
  const [busy, setBusy] = useState(false);
  const isBusy = isLoading || !accessToken;

  const requestId = useMemo(() => getLastRequestId(), [data]);

  const handleLogout = async () => {
    setBusy(true);
    await logout();
    setBusy(false);
  };

  const handleLogoutAll = async () => {
    setBusy(true);
    await logoutAll();
    setBusy(false);
  };

  return (
    <Screen scrollable>
      <Card>
        <Text style={styles.title}>Profile</Text>
        {isBusy ? (
          <Text style={styles.muted}>Loading...</Text>
        ) : data ? (
          <View style={styles.info}>
            <Text style={styles.name}>{data.name ?? "User"}</Text>
            <Text style={styles.muted}>{data.email}</Text>
            {data.phone ? <Text style={styles.muted}>{data.phone}</Text> : null}
            {data.role ? <Text style={styles.tag}>Role: {data.role}</Text> : null}
          </View>
        ) : (
          <Text style={styles.error}>Unable to load profile.</Text>
        )}
        <Button
          label="Logout"
          onPress={handleLogout}
          style={styles.button}
          variant="ghost"
          disabled={busy}
        />
        <Button
          label="Logout all sessions"
          onPress={handleLogoutAll}
          style={styles.button}
          variant="danger"
          disabled={busy}
        />
      </Card>

      <Card style={styles.meta}>
        <Text style={styles.sectionTitle}>App info</Text>
        <Text style={styles.muted}>API base URL: {API_BASE_URL}</Text>
        {requestId ? <Text style={styles.muted}>Last request id: {requestId}</Text> : null}
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
  info: {
    gap: theme.spacing(0.5),
    marginBottom: theme.spacing(1)
  },
  name: {
    fontSize: theme.typography.subheading,
    fontWeight: "700",
    color: theme.colors.text
  },
  muted: {
    color: theme.colors.muted
  },
  tag: {
    color: theme.colors.secondary,
    fontWeight: "600"
  },
  button: {
    marginTop: theme.spacing(1)
  },
  error: {
    color: theme.colors.danger
  },
  meta: {
    marginTop: theme.spacing(1.5)
  },
  sectionTitle: {
    fontSize: theme.typography.body,
    fontWeight: "600",
    marginBottom: theme.spacing(0.5)
  }
});

export default ProfileScreen;

