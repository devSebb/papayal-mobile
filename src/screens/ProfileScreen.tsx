import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { NavigationProp, useNavigation } from "@react-navigation/native";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import Button from "../ui/components/Button";
import TopNavBar from "../ui/components/TopNavBar";
import { theme } from "../ui/theme";
import { meApi } from "../api/endpoints";
import { useAuth } from "../auth/authStore";
import { API_BASE_URL } from "../config/env";
import { getLastRequestId } from "../api/http";
import { ProfileStackParamList } from "../navigation";

const avatarPlaceholder = require("../../assets/avatar-default.png");

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ProfileStackParamList>>();
  const { accessToken } = useAuth();
  const isQueryEnabled = !!accessToken;
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: meApi.me,
    enabled: isQueryEnabled
  });
  const { mutateAsync: uploadAvatar, isPending: uploading } = useMutation({
    mutationFn: meApi.uploadAvatar,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    }
  });
  const isBusy = isLoading || !accessToken;

  const requestId = useMemo(() => getLastRequestId(), [data]);
  const avatarSource =
    data?.avatar_thumb_url || data?.avatar_url
      ? { uri: (data.avatar_thumb_url ?? data.avatar_url) as string }
      : avatarPlaceholder;

  const handleOpenSettings = () => {
    navigation.navigate("Settings");
  };

  const handleChangePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso requerido", "Autoriza el acceso a tus fotos para cambiar tu avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const formData = new FormData();
    formData.append("avatar", {
      uri: asset.uri,
      name: asset.fileName ?? "avatar.jpg",
      type: asset.mimeType ?? "image/jpeg"
    } as any);

    try {
      await uploadAvatar(formData);
      Alert.alert("Perfil actualizado", "Tu foto ha sido actualizada.");
    } catch (error) {
      console.error(error);
      Alert.alert("Error al subir", "No pudimos actualizar tu foto. Inténtalo de nuevo.");
    }
  };

  return (
    <Screen scrollable edges={["left", "right"]}>
      <TopNavBar />
      <Card>
        <Text style={styles.title}>Perfil</Text>
        {isBusy ? (
          <Text style={styles.muted}>Cargando...</Text>
        ) : data ? (
          <>
            <View style={styles.headerRow}>
              <View style={styles.avatarWrapper}>
                <Image source={avatarSource} style={styles.avatar} />
                {uploading ? (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator color="#fff" />
                  </View>
                ) : null}
              </View>
              <View style={styles.infoContainer}>
                <View style={styles.infoRow}>
                  <View style={styles.info}>
                    <Text style={styles.name}>{data.name ?? "Usuario"}</Text>
                    <Text style={styles.muted}>{data.email}</Text>
                    {data.phone ? <Text style={styles.muted}>{data.phone}</Text> : null}
                    {data.role ? <Text style={styles.tag}>Rol: {data.role}</Text> : null}
                  </View>
                  <TouchableOpacity
                    onPress={handleOpenSettings}
                    style={styles.settingsButton}
                    accessibilityRole="button"
                    accessibilityLabel="Abrir ajustes"
                  >
                    <Feather name="tool" size={20} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
                <Button
                  label="Cambiar foto"
                  onPress={handleChangePhoto}
                  style={styles.changePhotoButton}
                  variant="secondary"
                  labelStyle={styles.changePhotoLabel}
                  loading={uploading}
                  disabled={uploading}
                />
              </View>
            </View>
          </>
        ) : (
          <Text style={styles.error}>No pudimos cargar el perfil.</Text>
        )}
      </Card>

      <Card style={styles.helpCard}>
        <Text style={styles.sectionTitle}>Ayuda</Text>
        <Text style={styles.helpText}>Encuentra respuestas rápidas o contacta a soporte.</Text>
        <Button label="Ir a Ayuda" onPress={() => navigation.navigate("Help")} />
      </Card>

      <Card style={styles.meta}>
        <Text style={styles.sectionTitle}>Información de la app</Text>
        <Text style={styles.muted}>URL base de la API: {API_BASE_URL}</Text>
        {requestId ? <Text style={styles.muted}>ID de la última solicitud: {requestId}</Text> : null}
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1.5)
  },
  avatarWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: "hidden",
    backgroundColor: theme.colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  avatar: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  avatarOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#00000055",
    alignItems: "center",
    justifyContent: "center"
  },
  infoContainer: {
    flex: 1
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing(1)
  },
  info: {
    gap: theme.spacing(0.5),
    flex: 1,
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
  changePhotoButton: {
    marginTop: theme.spacing(0.5),
    alignSelf: "flex-start",
    paddingVertical: theme.spacing(0.6),
    paddingHorizontal: theme.spacing(1.2),
    borderRadius: 10
  },
  changePhotoLabel: {
    fontSize: theme.typography.small,
    fontWeight: "700"
  },
  settingsButton: {
    padding: theme.spacing(1),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    alignSelf: "flex-start"
  },
  helpCard: {
    marginTop: theme.spacing(1.5)
  },
  helpText: {
    color: theme.colors.muted,
    marginBottom: theme.spacing(1)
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

