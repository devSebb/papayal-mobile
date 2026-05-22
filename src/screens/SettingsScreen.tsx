import React, { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import Button from "../ui/components/Button";
import TopNavBar from "../ui/components/TopNavBar";
import { theme } from "../ui/theme";
import { useAuth } from "../auth/authStore";
import { ProfileStackParamList } from "../navigation";
import { meApi } from "../api/endpoints";
import { HttpError } from "../api/http";

type BusyAction = "logout" | "logoutAll" | null;
type Channel = "whatsapp" | "sms";

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ProfileStackParamList>>();
  const { logout, logoutAll, accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [busyAction, setBusyAction] = useState<BusyAction>(null);

  const { data: profile } = useQuery({
    queryKey: ["me"],
    queryFn: meApi.me,
    enabled: !!accessToken
  });

  const currentChannel: Channel = profile?.preferred_channel ?? "whatsapp";

  const { mutate: updateChannel, isPending: savingChannel } = useMutation({
    mutationFn: (channel: Channel) => meApi.update({ preferred_channel: channel }),
    onMutate: async (channel) => {
      // Optimistic update so the UI feels instant
      await queryClient.cancelQueries({ queryKey: ["me"] });
      const previous = queryClient.getQueryData(["me"]);
      queryClient.setQueryData(["me"], (old: any) => ({ ...(old ?? {}), preferred_channel: channel }));
      return { previous };
    },
    onError: (err, _channel, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["me"], ctx.previous);
      const message = (err as unknown as HttpError)?.error?.message ?? "No pudimos actualizar tu preferencia.";
      Alert.alert("Error", message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    }
  });

  const handleSelectChannel = (channel: Channel) => {
    if (channel === currentChannel || savingChannel) return;
    updateChannel(channel);
  };

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
        <Button
          label="Eliminar cuenta"
          onPress={() => navigation.navigate("DeleteAccount")}
          variant="danger"
          style={styles.button}
          disabled={!!busyAction}
        />
      </Card>

      <Card style={styles.channelCard}>
        <Text style={styles.sectionTitle}>Notificaciones</Text>
        <Text style={styles.sectionSubtitle}>
          Elige cómo quieres recibir los códigos de tarjeta y avisos importantes.
        </Text>
        <View style={styles.channelRow}>
          <TouchableOpacity
            onPress={() => handleSelectChannel("whatsapp")}
            style={[
              styles.channelOption,
              currentChannel === "whatsapp" && styles.channelOptionSelected
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: currentChannel === "whatsapp" }}
            disabled={savingChannel}
          >
            <Feather
              name="message-circle"
              size={20}
              color={currentChannel === "whatsapp" ? theme.colors.secondary : theme.colors.text}
            />
            <Text
              style={[
                styles.channelLabel,
                currentChannel === "whatsapp" && styles.channelLabelSelected
              ]}
            >
              WhatsApp
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleSelectChannel("sms")}
            style={[
              styles.channelOption,
              currentChannel === "sms" && styles.channelOptionSelected
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: currentChannel === "sms" }}
            disabled={savingChannel}
          >
            <Feather
              name="smartphone"
              size={20}
              color={currentChannel === "sms" ? theme.colors.secondary : theme.colors.text}
            />
            <Text
              style={[
                styles.channelLabel,
                currentChannel === "sms" && styles.channelLabelSelected
              ]}
            >
              SMS
            </Text>
          </TouchableOpacity>
        </View>
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
    fontFamily: theme.fonts.semiBold
  },
  title: {
    fontSize: theme.typography.subheading,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing(0.5)
  },
  subtitle: {
    color: theme.colors.muted,
    marginBottom: theme.spacing(1.5)
  },
  button: {
    marginTop: theme.spacing(1)
  },
  channelCard: {
    marginTop: theme.spacing(1.5)
  },
  sectionTitle: {
    fontSize: theme.typography.subheading,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing(0.5)
  },
  sectionSubtitle: {
    color: theme.colors.muted,
    marginBottom: theme.spacing(1.5)
  },
  channelRow: {
    flexDirection: "row",
    gap: theme.spacing(1)
  },
  channelOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing(0.75),
    paddingVertical: theme.spacing(1.25),
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card
  },
  channelOptionSelected: {
    borderColor: theme.colors.secondary,
    backgroundColor: theme.colors.card
  },
  channelLabel: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text
  },
  channelLabelSelected: {
    color: theme.colors.secondary
  }
});

export default SettingsScreen;
