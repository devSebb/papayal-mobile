import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { CompositeNavigationProp, useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import Button from "../ui/components/Button";
import { theme } from "../ui/theme";
import { meApi } from "../api/endpoints";
import { AppTabsParamList, HomeStackParamList } from "../navigation";
import { useAuth } from "../auth/authStore";
import TopNavBar from "../ui/components/TopNavBar";

const heroImage = require("../../assets/home-hero.png");

const HomeScreen: React.FC = () => {
  type NavProps = CompositeNavigationProp<
    NativeStackNavigationProp<HomeStackParamList>,
    BottomTabNavigationProp<AppTabsParamList>
  >;

  const navigation = useNavigation<NavProps>();
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
      <Text style={styles.title}>Bienvenido</Text>
      <Text style={styles.subtitle}>Administra tus tarjetas y canjes fácilmente.</Text>

      <Card style={[styles.card, styles.ctaCard]}>
        <View style={styles.ctaHeader}>
          <Text style={styles.ctaTitle}>¿Listo para regalar?</Text>
          <Text style={styles.ctaSubtitle}>Compra o revisa tus tarjetas de regalo en segundos.</Text>
        </View>
        <View style={styles.ctaButtons}>
          <Button
            label="Comprar tarjeta de regalo"
            onPress={() => navigation.navigate("BuyGiftCardStart")}
            variant="primary"
            style={styles.ctaButtonPrimary}
          />
          <Button
            label="Ver mis tarjetas de regalo"
            onPress={() => navigation.navigate("WalletTab")}
            variant="secondary"
            style={styles.ctaButtonSecondary}
            labelColor={theme.colors.secondary}
          />
        </View>
      </Card>

      <Card style={[styles.card, styles.heroCard]}>
        <Text style={styles.heroTitle}>Tarjetas de regalo para lo esencial en Ecuador.</Text>
        <View style={styles.heroSubSection}>
          <Text style={styles.heroSubtitle}>Rápido. Seguro.</Text>

          <View style={styles.heroActionRow}>
            <Button
              label="Comenzar"
              onPress={() => navigation.navigate("WalletTab")}
              variant="primary"
              style={styles.heroButton}
            />

            <View style={styles.heroImageWrap}>
              <Image source={heroImage} style={styles.heroImage} />
            </View>
          </View>
        </View>

        <View style={styles.flowSection}>
          <Text style={styles.flowTitle}>Cómo funciona</Text>
          <View style={styles.flowSteps}>
            <View style={styles.flowStep}>
              <Feather name="shopping-bag" size={28} color={theme.colors.secondary} />
              <Text style={styles.flowLabel}>Elige una{"\n"}tienda</Text>
            </View>
            <Feather name="arrow-right" size={20} color={theme.colors.navbarMuted} />
            <View style={styles.flowStep}>
              <Feather name="send" size={28} color={theme.colors.secondary} />
              <Text style={styles.flowLabel}>Envía la{"\n"}tarjeta</Text>
            </View>
            <Feather name="arrow-right" size={20} color={theme.colors.navbarMuted} />
            <View style={styles.flowStep}>
              <Feather name="map-pin" size={28} color={theme.colors.secondary} />
              <Text style={styles.flowLabel}>Gasta{"\n"}localmente</Text>
            </View>
          </View>
        </View>

        <Text style={styles.promo}>Ahorra hasta un 30%{"\n"}en tu primer envío</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Cuenta</Text>
        {isBusy ? (
          <Text style={styles.muted}>Cargando...</Text>
        ) : data ? (
          <>
            <View style={styles.userInfo}>
              <Text style={styles.name}>{data.name ?? "Usuario anónimo"}</Text>
              <Text style={styles.email}>{data.email}</Text>
              {data.phone ? <Text style={styles.muted}>{data.phone}</Text> : null}
            </View>
            <Button
              label="Editar perfil"
              onPress={() => navigation.navigate("ProfileTab", { screen: "EditProfile" })}
              variant="secondary"
              style={styles.button}
              disabled={isBusy}
            />
          </>
        ) : (
          <Text style={styles.muted}>No pudimos obtener tu perfil.</Text>
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Acciones rápidas</Text>
        <Button
          label="Abrir billetera"
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
    // marginBottom: theme.spacing(1)
  },
  heroCard: {
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1)
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 32,
    color: theme.colors.text
  },
  heroSubSection: {
    gap: theme.spacing(0.4)
  },
  heroSubtitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text
  },
  heroActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(0.75),
    paddingVertical: 0,
    marginTop: theme.spacing(0.25)
  },
  heroButton: {
    flexShrink: 0
  },
  heroImageWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 40,
    flexShrink: 0,
    paddingVertical: 0,
    marginVertical: -50
  },
  heroImage: {
    width: "25%",
    maxWidth: 110,
    aspectRatio: 1,
    resizeMode: "contain",
    paddingRight: 10,
    marginTop: 0,
    marginBottom: 0
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
  ctaCard: {
    gap: theme.spacing(1.5)
  },
  ctaHeader: {
    gap: theme.spacing(0.5)
  },
  ctaTitle: {
    fontSize: theme.typography.subheading,
    fontWeight: "800",
    color: theme.colors.text
  },
  ctaSubtitle: {
    color: theme.colors.muted,
    fontWeight: "600"
  },
  ctaButtons: {
    flexDirection: "row",
    gap: theme.spacing(1),
    flexWrap: "wrap"
  },
  ctaButtonPrimary: {
    flex: 1,
    paddingVertical: theme.spacing(1.4),
    borderRadius: 18,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 }
  },
  ctaButtonSecondary: {
    flex: 1,
    paddingVertical: theme.spacing(1.4),
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.secondary
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

