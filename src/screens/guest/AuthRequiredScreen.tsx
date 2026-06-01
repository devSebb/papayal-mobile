import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import Screen from "../../ui/components/Screen";
import Card from "../../ui/components/Card";
import Button from "../../ui/components/Button";
import { theme } from "../../ui/theme";

type Props = {
  kind: "wallet" | "profile";
};

const copy = {
  wallet: {
    icon: "credit-card" as const,
    title: "Inicia sesión para ver tu billetera",
    message:
      "Tus tarjetas, saldos, tokens de canje y actividad están protegidos en tu cuenta Papayal."
  },
  profile: {
    icon: "user" as const,
    title: "Inicia sesión para administrar tu perfil",
    message:
      "Desde tu cuenta puedes editar tus datos, revisar ayuda, configurar privacidad y eliminar tu cuenta cuando lo necesites."
  }
};

const AuthRequiredScreen: React.FC<Props> = ({ kind }) => {
  const navigation = useNavigation();
  const rootNavigation = navigation.getParent()?.getParent() as any;
  const content = copy[kind];

  return (
    <Screen centerContent edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <Card style={styles.card}>
          <View style={styles.iconWrap}>
            <Feather name={content.icon} size={32} color={theme.colors.secondary} />
          </View>
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.message}>{content.message}</Text>
          <View style={styles.actions}>
            <Button
              label="Iniciar sesión"
              onPress={() => rootNavigation?.navigate("Auth", { screen: "Login" })}
            />
            <Button
              label="Crear cuenta"
              variant="ghost"
              onPress={() => rootNavigation?.navigate("Auth", { screen: "Signup" })}
            />
          </View>
        </Card>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 520
  },
  card: {
    alignItems: "center",
    gap: theme.spacing(1.25)
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.fonts.extraBold,
    fontSize: 24,
    lineHeight: 31,
    textAlign: "center"
  },
  message: {
    color: theme.colors.muted,
    fontSize: theme.typography.body,
    lineHeight: 25,
    textAlign: "center"
  },
  actions: {
    width: "100%",
    gap: theme.spacing(1),
    marginTop: theme.spacing(0.75)
  }
});

export default AuthRequiredScreen;
