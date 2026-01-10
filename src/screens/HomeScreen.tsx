import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import Button from "../ui/components/Button";
import { theme } from "../ui/theme";
import { meApi } from "../api/endpoints";
import { AppTabsParamList } from "../navigation";
import { useAuth } from "../auth/authStore";
import TopNavBar from "../ui/components/TopNavBar";

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
    <Screen scrollable edges={["left", "right"]}>
      <TopNavBar />
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.subtitle}>Manage your cards and redemptions easily.</Text>

      <Card style={[styles.card, styles.heroCard]}>
        <Text style={styles.heroTitle}>Tarjetas de regalo para lo esencial en Ecuador.</Text>
        <Text style={styles.heroSubtitle}>Rápido. Seguro.</Text>

        <Button
          label="Comenzar"
          onPress={() => navigation.navigate("WalletTab")}
          variant="primary"
          style={styles.heroButton}
        />

        <View style={styles.flowSection}>
          <Text style={styles.flowTitle}>Como Funciona</Text>
          <View style={styles.flowSteps}>
            <View style={styles.flowStep}>
              <Feather name="shopping-bag" size={28} color={theme.colors.secondary} />
              <Text style={styles.flowLabel}>Elige una{"\n"}Tienda</Text>
            </View>
            <Feather name="arrow-right" size={20} color={theme.colors.navbarMuted} />
            <View style={styles.flowStep}>
              <Feather name="send" size={28} color={theme.colors.secondary} />
              <Text style={styles.flowLabel}>Envia la{"\n"}tarjeta</Text>
            </View>
            <Feather name="arrow-right" size={20} color={theme.colors.navbarMuted} />
            <View style={styles.flowStep}>
              <Feather name="map-pin" size={28} color={theme.colors.secondary} />
              <Text style={styles.flowLabel}>Gasta{"\n"}Localmente</Text>
            </View>
          </View>
        </View>

        <Text style={styles.promo}>Ahorra hasta un 30%{"\n"}en tu primer envio</Text>
      </Card>

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
  heroCard: {
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(1)
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 32,
    color: theme.colors.text
  },
  heroSubtitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text
  },
  heroButton: {
    alignSelf: "flex-start"
  },
  flowSection: {
    gap: theme.spacing(1)
  },
  flowTitle: {
    fontSize: theme.typography.subheading,
    fontWeight: "700",
    color: theme.colors.text
  },
  flowSteps: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    // gap: theme.spacing(1)
  },
  flowStep: {
    alignItems: "center",
    gap: theme.spacing(0.5),
    flexGrow: 1,
    minWidth: 90
  },
  flowLabel: {
    color: theme.colors.text,
    textAlign: "center",
    fontSize: theme.typography.small
  },
  promo: {
    marginTop: theme.spacing(1),
    textAlign: "center",
    color: theme.colors.primary,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 30,
    textShadowColor: "rgba(0,0,0,0.08)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6
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

