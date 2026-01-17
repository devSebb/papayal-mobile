import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import Button from "../ui/components/Button";
import TopNavBar from "../ui/components/TopNavBar";
import { theme } from "../ui/theme";
import { useAuth } from "../auth/authStore";
import { ProfileStackParamList } from "../navigation";

type BusyAction = "logout" | "logoutAll" | null;

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ProfileStackParamList>>();
  const { logout, logoutAll } = useAuth();
  const [busyAction, setBusyAction] = useState<BusyAction>(null);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Profile");
    }
  };

  const handleLogout = async () => {
    setBusyAction("logout");
    try {
      await logout();
    } finally {
      setBusyAction(null);
    }
  };

  const handleLogoutAll = async () => {
    setBusyAction("logoutAll");
    try {
      await logoutAll();
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <Screen scrollable edges={["left", "right"]}>
      <TopNavBar />
      <Card>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Feather name="arrow-left" size={20} color={theme.colors.text} />
            <Text style={styles.backLabel}>Volver</Text>
          </TouchableOpacity>
          <Feather name="settings" size={20} color={theme.colors.text} />
        </View>

        <Text style={styles.title}>Ajustes</Text>
        <Text style={styles.subtitle}>Gestiona tu perfil y sesiones activas.</Text>

        <Button
          label="Editar perfil"
          onPress={() => navigation.navigate("EditProfile")}
          variant="secondary"
          style={styles.button}
          disabled={!!busyAction}
        />
        <Button
          label="Cerrar sesión"
          onPress={handleLogout}
          variant="ghost"
          style={styles.button}
          disabled={!!busyAction}
          loading={busyAction === "logout"}
        />
        <Button
          label="Cerrar todas las sesiones"
          onPress={handleLogoutAll}
          variant="danger"
          style={styles.button}
          disabled={!!busyAction}
          loading={busyAction === "logoutAll"}
        />
        <Button
          label="Legal y Privacidad"
          onPress={() => navigation.navigate("LegalPrivacy")}
          variant="ghost"
          style={styles.button}
          disabled={!!busyAction}
        />
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(1)
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(0.5),
    paddingVertical: theme.spacing(0.5),
    paddingHorizontal: theme.spacing(0.5),
    borderRadius: theme.radius.md
  },
  backLabel: {
    color: theme.colors.text,
    fontWeight: "600"
  },
  title: {
    fontSize: theme.typography.subheading,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing(0.5)
  },
  subtitle: {
    color: theme.colors.muted,
    marginBottom: theme.spacing(1.5)
  },
  button: {
    marginTop: theme.spacing(1)
  }
});

export default SettingsScreen;


