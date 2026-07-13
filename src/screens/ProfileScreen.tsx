import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { NavigationProp, useNavigation } from "@react-navigation/native";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import Button from "../ui/components/Button";
import TopNavBar from "../ui/components/TopNavBar";
import { theme } from "../ui/theme";
import { meApi } from "../api/endpoints";
import { useAuth } from "../auth/authStore";
import { HttpError } from "../api/http";
import { ProfileStackParamList } from "../navigation";
import { shareApp } from "../sharing/shareApp";

const avatarPlaceholder = require("../../assets/avatar-default.png");

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ProfileStackParamList>>();
  const { accessToken } = useAuth();
  const isQueryEnabled = !!accessToken;
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["me"],
    queryFn: meApi.me,
    enabled: isQueryEnabled
  });
  const [avatarCacheBuster, setAvatarCacheBuster] = useState<number>(Date.now());
  const [avatarLoadError, setAvatarLoadError] = useState<boolean>(false);
  const { mutateAsync: uploadAvatar, isPending: uploading } = useMutation({
    mutationFn: meApi.uploadAvatar,
    onSuccess: async (updatedUser) => {
      // Update cache immediately with new avatar URLs
      queryClient.setQueryData(["me"], updatedUser);
      // Invalidate to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      // Add cache buster to force image refresh
      setAvatarCacheBuster(Date.now());
      // Reset error state when new avatar is uploaded
      setAvatarLoadError(false);
    }
  });
  const isBusy = isLoading || !accessToken;

  // Reset error state when avatar URLs change, so we retry loading new URLs
  useEffect(() => {
    setAvatarLoadError(false);
  }, [data?.avatar_thumb_url, data?.avatar_url]);

  const avatarSource = useMemo(() => {
    // If there was a load error, use placeholder
    if (avatarLoadError) {
      return avatarPlaceholder;
    }
    const thumbUrl = data?.avatar_thumb_url;
    const fullUrl = data?.avatar_url;
    if (thumbUrl || fullUrl) {
      const url = (thumbUrl ?? fullUrl) as string;
      // Add cache buster query param to force refresh after upload
      const separator = url.includes("?") ? "&" : "?";
      return { uri: `${url}${separator}v=${avatarCacheBuster}` };
    }
    return avatarPlaceholder;
  }, [data?.avatar_thumb_url, data?.avatar_url, avatarCacheBuster, avatarLoadError]);
  const displayName = useMemo(() => {
    const combined = [data?.first_name, data?.last_name].filter(Boolean).join(" ").trim();
    if (combined) return combined;
    return data?.name || "Usuario";
  }, [data]);

  const handleEditProfile = () => {
    navigation.navigate("EditProfile");
  };

  const handleChangePhoto = async () => {
    // Show action sheet to choose camera or library
    Alert.alert(
      "Cambiar foto de perfil",
      "¿Cómo quieres agregar tu foto?",
      [
        {
          text: "Cámara",
          onPress: () => {
            handleImagePicker("camera");
          }
        },
        {
          text: "Galería",
          onPress: () => {
            handleImagePicker("library");
          }
        },
        {
          text: "Cancelar",
          style: "cancel"
        }
      ],
      { cancelable: true }
    );
  };

  const handleImagePicker = async (source: "camera" | "library") => {
    try {
      // Request appropriate permissions
      if (source === "camera") {
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        if (!cameraPermission.granted) {
          Alert.alert(
            "Permiso requerido",
            "Autoriza el acceso a la cámara para tomar una foto."
          );
          return;
        }
      } else {
        const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!libraryPermission.granted) {
          Alert.alert(
            "Permiso requerido",
            "Autoriza el acceso a tus fotos para seleccionar una imagen."
          );
          return;
        }
      }

      // Launch image picker
      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1.0 // Use full quality before manipulation
      };

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(pickerOptions)
          : await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      await processAndUploadImage(asset);
    } catch (error) {
      if (__DEV__) console.error("[ProfileScreen] Error in image picker:", error);
      Alert.alert(
        "Error", 
        `No pudimos abrir la ${source === "camera" ? "cámara" : "galería"}. ${error instanceof Error ? error.message : "Inténtalo de nuevo."}`
      );
    }
  };

  const processAndUploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
    try {
      // Resize and compress image before upload
      // Resize longest edge to 1080px while maintaining aspect ratio
      const actions: ImageManipulator.Action[] = [];
      if (asset.width && asset.height) {
        const maxDimension = Math.max(asset.width, asset.height);
        if (maxDimension > 1080) {
          const ratio = 1080 / maxDimension;
          actions.push({
            resize: {
              width: Math.round(asset.width * ratio),
              height: Math.round(asset.height * ratio)
            }
          });
        }
        // If no resize needed, actions array stays empty and we just compress
      } else {
        // If dimensions unknown, resize to max 1080 on longest edge
        actions.push({ resize: { width: 1080 } });
      }

      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        actions.length > 0 ? actions : undefined,
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG
        }
      );

      // Create FormData with proper React Native format
      const formData = new FormData();
      const fileUri = manipulated.uri;
      
      // React Native FormData requires this exact structure
      // The file object must have uri, name, and type
      formData.append("avatar", {
        uri: fileUri,
        name: "avatar.jpg",
        type: "image/jpeg"
      } as any);

      await uploadAvatar(formData);
      Alert.alert("Perfil actualizado", "Tu foto ha sido actualizada.");
    } catch (error) {
      if (__DEV__) console.error("[ProfileScreen] Error uploading avatar:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Error desconocido";
      Alert.alert(
        "Error al subir",
        `No pudimos actualizar tu foto. ${errorMessage}`
      );
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
                <Image 
                  source={avatarSource} 
                  style={styles.avatar}
                  onError={() => {
                    // Fall back to placeholder if image fails to load
                    setAvatarLoadError(true);
                  }}
                />
                {uploading ? (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator color="#fff" />
                  </View>
                ) : null}
              </View>
              <View style={styles.infoContainer}>
                <View style={styles.infoRow}>
                  <View style={styles.info}>
                    <Text style={styles.name}>{displayName}</Text>
                    <Text style={styles.muted}>{data.email}</Text>
                    {data.phone ? <Text style={styles.muted}>{data.phone}</Text> : null}
                    {data.role ? <Text style={styles.tag}>Rol: {data.role}</Text> : null}
                  </View>
                  <TouchableOpacity
                    onPress={handleEditProfile}
                    style={styles.settingsButton}
                    accessibilityRole="button"
                    accessibilityLabel="Editar perfil"
                  >
                    <Feather name="edit" size={20} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
                <Button
                  label="Cambiar foto"
                  onPress={handleChangePhoto}
                  style={styles.changePhotoButton}
                  variant="secondary"
                  loading={uploading}
                  disabled={uploading}
                />
              </View>
            </View>
          </>
        ) : error ? (
          <View>
            <Text style={styles.error}>No pudimos cargar el perfil.</Text>
            {__DEV__ && (() => {
              const httpError = error as unknown as HttpError;
              const raw = httpError?.raw;
              const rawObj =
                raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
              const rawMessage =
                rawObj && typeof rawObj.message === "string" ? rawObj.message : null;
              const errorMessage =
                httpError?.error?.message ||
                httpError?.error?.code ||
                (typeof raw === "string"
                  ? raw
                  : rawMessage ||
                    (rawObj ? JSON.stringify(rawObj).slice(0, 200) : null) ||
                    (error instanceof Error ? error.message : "Unknown error"));
              const status = httpError?.status;
              return (
                <View style={styles.errorDetails}>
                  {status && <Text style={styles.errorDetail}>Status: {status}</Text>}
                  <Text style={styles.errorDetail}>Error: {errorMessage}</Text>
                  {httpError?.requestId && (
                    <Text style={styles.errorDetail}>Request ID: {httpError.requestId}</Text>
                  )}
                  {rawObj && (
                    <Text style={styles.errorDetail}>
                      Raw: {JSON.stringify(rawObj).slice(0, 300)}
                    </Text>
                  )}
                </View>
              );
            })()}
          </View>
        ) : (
          <Text style={styles.error}>No pudimos cargar el perfil.</Text>
        )}
      </Card>

      <Card style={styles.helpCard}>
        <View style={styles.sectionTitleRow}>
          <Feather name="settings" size={18} color={theme.colors.text} />
          <Text style={styles.sectionTitle}>Ajustes</Text>
        </View>
        <Text style={styles.helpText}>Gestiona tu perfil y sesiones activas.</Text>
        <Button label="Ir a Ajustes" onPress={() => navigation.navigate("Settings")} />
      </Card>

      <Card style={styles.helpCard}>
        <View style={styles.sectionTitleRow}>
          <Feather name="help-circle" size={18} color={theme.colors.text} />
          <Text style={styles.sectionTitle}>Ayuda</Text>
        </View>
        <Text style={styles.helpText}>Encuentra respuestas rápidas o contacta a soporte.</Text>
        <Button label="Ir a Ayuda" onPress={() => navigation.navigate("Help")} />
      </Card>

      <Card style={styles.helpCard}>
        <View style={styles.sectionTitleRow}>
          <Feather name="share-2" size={18} color={theme.colors.text} />
          <Text style={styles.sectionTitle}>Comparte Papayal</Text>
        </View>
        <Text style={styles.helpText}>
          Invita a tu familia y amigos a enviar y recibir tarjetas de regalo.
        </Text>
        <Button
          label="Compartir la app"
          onPress={shareApp}
          accessibilityLabel="Compartir Papayal con tus contactos"
        />
      </Card>

    </Screen>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: theme.typography.subheading,
    fontFamily: theme.fonts.bold,
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
    fontFamily: theme.fonts.bold,
    color: theme.colors.text
  },
  muted: {
    color: theme.colors.muted
  },
  tag: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.semiBold
  },
  changePhotoButton: {
    marginTop: theme.spacing(0.5),
    alignSelf: "flex-start",
    paddingVertical: theme.spacing(0.6),
    paddingHorizontal: theme.spacing(1.2),
    borderRadius: 10
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
  errorDetails: {
    marginTop: theme.spacing(1),
    gap: theme.spacing(0.5)
  },
  errorDetail: {
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    fontFamily: theme.fonts.medium,
    letterSpacing: 0.2
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(0.75),
    marginBottom: theme.spacing(0.5)
  },
  sectionTitle: {
    fontSize: theme.typography.body,
    fontFamily: theme.fonts.semiBold
  }
});

export default ProfileScreen;
