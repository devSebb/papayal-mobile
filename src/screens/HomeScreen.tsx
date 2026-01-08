import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import Button from "../ui/components/Button";
import { theme } from "../ui/theme";
import { meApi } from "../api/endpoints";
import { AppTabsParamList } from "../navigation";
import { NavigationProp } from "@react-navigation/native";
import { useAuth } from "../auth/authStore";

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<AppTabsParamList>>();
  const { accessToken } = useAuth();
  const isQueryEnabled = !!accessToken;
  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: meApi.me,
    enabled: isQueryEnabled
  });
  const isBusy = isLoading || !accessToken;

  return (
    <Screen scrollable>
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.subtitle}>Manage your cards and redemptions easily.</Text>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Account</Text>
        {isBusy ? (
          <Text style={styles.muted}>Loading...</Text>
        ) : data ? (
          <View style={styles.userInfo}>
            <Text style={styles.name}>{data.name ?? "Anonymous user"}</Text>
            <Text style={styles.email}>{data.email}</Text>
            {data.phone ? <Text style={styles.muted}>{data.phone}</Text> : null}
          </View>
        ) : (
          <Text style={styles.muted}>Unable to fetch profile.</Text>
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <Button
          label="Open Wallet"
          onPress={() => navigation.navigate("WalletTab")}
          variant="primary"
          style={styles.button}
        />
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.text
  },
  subtitle: {
    color: theme.colors.muted,
    marginBottom: theme.spacing(2)
  },
  card: {
    marginTop: theme.spacing(1.5)
  },
  sectionTitle: {
    fontSize: theme.typography.subheading,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing(1)
  },
  muted: {
    color: theme.colors.muted
  },
  userInfo: {
    gap: theme.spacing(0.5)
  },
  name: {
    fontSize: theme.typography.subheading,
    fontWeight: "600",
    color: theme.colors.text
  },
  email: {
    color: theme.colors.muted
  },
  button: {
    marginTop: theme.spacing(1)
  }
});

export default HomeScreen;

