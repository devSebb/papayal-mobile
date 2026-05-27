import React, { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import TopNavBar from "../ui/components/TopNavBar";
import { theme } from "../ui/theme";
import { useAuth } from "../auth/authStore";
import { ProfileStackParamList } from "../navigation";
import { meApi } from "../api/endpoints";
import { HttpError } from "../api/http";

type BusyAction = "logout" | "logoutAll" | null;
type Channel = "whatsapp" | "sms";
type FeatherIcon = keyof typeof Feather.glyphMap;

type SettingsRowProps = {
  icon: FeatherIcon;
  title: string;
  subtitle?: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  danger?: boolean;
};

const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  disabled,
  loading,
  danger
}) => {
  const iconColor = danger ? theme.colors.danger : theme.colors.text;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.settingsRow, disabled ? styles.rowDisabled : null]}
      accessibilityRole="button"
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      <View style={[styles.rowIconWrap, danger ? styles.rowIconDanger : null]}>
        <Feather name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, danger ? styles.rowTitleDanger : null]}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={danger ? theme.colors.danger : theme.colors.primary} />
      ) : (
        <Feather name="chevron-right" size={18} color={theme.colors.muted} />
      )}
    </TouchableOpacity>
  );
};

type ChannelOptionProps = {
  channel: Channel;
  icon: FeatherIcon;
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
};

const ChannelOption: React.FC<ChannelOptionProps> = ({
  icon,
  label,
  selected,
  disabled,
  onPress
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.channelOption, selected ? styles.channelOptionSelected : null]}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    disabled={disabled}
    activeOpacity={0.75}
  >
    <Feather
      name={icon}
      size={19}
      color={selected ? theme.colors.secondary : theme.colors.muted}
    />
    <Text style={[styles.channelLabel, selected ? styles.channelLabelSelected : null]}>
      {label}
    </Text>
    {selected ? <Feather name="check" size={16} color={theme.colors.secondary} /> : null}
  </TouchableOpacity>
);

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

        <View style={styles.settingsList}>
          <SettingsRow
            icon="user"
            title="Editar perfil"
            subtitle="Nombre, teléfono y datos personales"
            onPress={() => navigation.navigate("EditProfile")}
            disabled={!!busyAction}
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            icon="file-text"
            title="Legal y privacidad"
            subtitle="Términos, políticas y datos"
            onPress={() => navigation.navigate("LegalPrivacy")}
            disabled={!!busyAction}
          />
        </View>
      </Card>

      <Card style={styles.channelCard}>
        <Text style={styles.sectionTitle}>Notificaciones</Text>
        <Text style={styles.sectionSubtitle}>
          Elige cómo recibir códigos de tarjeta y avisos importantes.
        </Text>
        <View style={styles.currentPreference}>
          <Feather name="bell" size={15} color={theme.colors.muted} />
          <Text style={styles.currentPreferenceText}>
            Actual: {currentChannel === "whatsapp" ? "WhatsApp" : "SMS"}
          </Text>
          {savingChannel ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
        </View>
        <View style={styles.channelRow}>
          <ChannelOption
            channel="whatsapp"
            icon="message-circle"
            label="WhatsApp"
            selected={currentChannel === "whatsapp"}
            disabled={savingChannel}
            onPress={() => handleSelectChannel("whatsapp")}
          />
          <ChannelOption
            channel="sms"
            icon="smartphone"
            label="SMS"
            selected={currentChannel === "sms"}
            disabled={savingChannel}
            onPress={() => handleSelectChannel("sms")}
          />
        </View>
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Sesiones</Text>
        <Text style={styles.sectionSubtitle}>
          Controla el acceso de esta cuenta en tus dispositivos.
        </Text>
        <View style={styles.settingsList}>
          <SettingsRow
            icon="log-out"
            title="Cerrar sesión"
            subtitle="Salir solo de este dispositivo"
            onPress={handleLogout}
            disabled={!!busyAction}
            loading={busyAction === "logout"}
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            icon="shield-off"
            title="Cerrar todas las sesiones"
            subtitle="Salir en todos tus dispositivos"
            onPress={handleLogoutAll}
            disabled={!!busyAction}
            loading={busyAction === "logoutAll"}
          />
        </View>
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Cuenta</Text>
        <Text style={styles.sectionSubtitle}>
          Acciones permanentes sobre tu cuenta Papayal.
        </Text>
        <View style={styles.settingsList}>
          <SettingsRow
            icon="trash-2"
            title="Eliminar cuenta"
            subtitle="Eliminar datos y cerrar acceso"
            onPress={() => navigation.navigate("DeleteAccount")}
            disabled={!!busyAction}
            danger
          />
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
  sectionCard: {
    marginTop: theme.spacing(1.5)
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
    marginBottom: theme.spacing(1.25),
    lineHeight: 20
  },
  settingsList: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    overflow: "hidden",
    backgroundColor: theme.colors.card
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1),
    paddingVertical: theme.spacing(1.25),
    paddingHorizontal: theme.spacing(1.25),
    backgroundColor: theme.colors.card
  },
  rowDisabled: {
    opacity: 0.55
  },
  rowIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border
  },
  rowIconDanger: {
    backgroundColor: "#FFF5F5",
    borderColor: "#F4C7C7"
  },
  rowText: {
    flex: 1,
    gap: 2
  },
  rowTitle: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    fontSize: 16
  },
  rowTitleDanger: {
    color: theme.colors.danger
  },
  rowSubtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    lineHeight: 18
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginLeft: theme.spacing(6.5)
  },
  currentPreference: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(0.65),
    marginBottom: theme.spacing(1),
    paddingVertical: theme.spacing(0.75),
    paddingHorizontal: theme.spacing(1),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background
  },
  currentPreferenceText: {
    flex: 1,
    color: theme.colors.muted,
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.typography.small
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
    gap: theme.spacing(0.6),
    paddingVertical: theme.spacing(1.15),
    paddingHorizontal: theme.spacing(1),
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card
  },
  channelOptionSelected: {
    borderColor: "rgba(13, 47, 50, 0.34)",
    backgroundColor: "#FFF8EC"
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
