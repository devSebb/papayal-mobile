import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Application from "expo-application";
import { NavigationProp, useNavigation } from "@react-navigation/native";

import Screen from "../ui/components/Screen";
import Avatar from "../ui/components/Avatar";
import TopNavBar from "../ui/components/TopNavBar";
import { ListDivider, ListGroup, ListRow } from "../ui/components/ListRow";
import { EmptyStateCard, SkeletonBlock } from "../ui/components/StateViews";
import { theme } from "../ui/theme";
import { meApi } from "../api/endpoints";
import { useAuth } from "../auth/authStore";
import { HttpError } from "../api/http";
import { ProfileStackParamList } from "../navigation";
import { shareApp } from "../sharing/shareApp";
import { hapticWarning } from "../utils/haptics";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  merchant: "Comercio"
};

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ProfileStackParamList>>();
  const { accessToken, logout } = useAuth();
  const isQueryEnabled = !!accessToken;
  const queryClient = useQueryClient();
  const { data, isLoading, error, isRefetching, refetch } = useQuery({
    queryKey: ["me"],
    queryFn: meApi.me,
    enabled: isQueryEnabled
  });
  const [avatarCacheBuster, setAvatarCacheBuster] = useState<number>(Date.now());
  const [avatarLoadError, setAvatarLoadError] = useState<boolean>(false);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);
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

  const avatarUri = useMemo(() => {
    // If there was a load error, fall back to initials
    if (avatarLoadError) {
      return null;
    }
    const thumbUrl = data?.avatar_thumb_url;
    const fullUrl = data?.avatar_url;
    if (thumbUrl || fullUrl) {
      const url = (thumbUrl ?? fullUrl) as string;
      // Add cache buster query param to force refresh after upload
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}v=${avatarCacheBuster}`;
    }
    return null;
  }, [data?.avatar_thumb_url, data?.avatar_url, avatarCacheBuster, avatarLoadError]);
  const displayName = useMemo(() => {
    const combined = [data?.first_name, data?.last_name].filter(Boolean).join(" ").trim();
    if (combined) return combined;
    return data?.name || "Usuario";
  }, [data]);
  const contactLine = useMemo(
    () => [data?.email, data?.phone].filter(Boolean).join("  ·  "),
    [data?.email, data?.phone]
  );
  // Internal role never shown to consumers; staff get a readable chip
  const roleLabel = data?.role && data.role !== "consumer" ? ROLE_LABELS[data.role] ?? data.role : null;

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

  const executeLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  // Same OS-native confirmation as SettingsScreen so both entry points behave alike
  const handleLogout = () => {
    hapticWarning();
    Alert.alert(
      "Cerrar sesión",
      "¿Quieres salir de tu cuenta en este dispositivo?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Cerrar sesión", style: "destructive", onPress: () => void executeLogout() }
      ]
    );
  };

  const appVersion = Application.nativeApplicationVersion;
  const buildNumber = Application.nativeBuildVersion;

  return (
    <Screen
      scrollable
      edges={["left", "right"]}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            void refetch();
          }}
          tintColor={theme.colors.primary}
        />
      }
    >
      <TopNavBar />

      {isBusy ? (
        <View style={styles.hero}>
          <SkeletonBlock width={96} height={96} radius={48} />
          <SkeletonBlock width={170} height={26} radius={13} style={styles.skeletonName} />
          <SkeletonBlock width={230} height={16} radius={8} style={styles.skeletonContact} />
          <SkeletonBlock width={150} height={44} radius={22} style={styles.skeletonPill} />
        </View>
      ) : data ? (
        <View style={styles.hero}>
          <Pressable
            onPress={handleChangePhoto}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel="Cambiar foto de perfil"
            style={({ pressed }) => [
              styles.avatarPressable,
              pressed && !uploading ? styles.avatarPressed : null
            ]}
          >
            <Avatar
              uri={avatarUri}
              name={displayName}
              size={96}
              onError={() => {
                // Fall back to initials if the image fails to load
                setAvatarLoadError(true);
              }}
            />
            {uploading ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : null}
            <View style={styles.cameraBadge} accessible={false} importantForAccessibility="no">
              <Feather name="camera" size={14} color={theme.colors.secondary} />
            </View>
          </Pressable>

          <Text style={styles.name}>{displayName}</Text>
          {contactLine ? <Text style={styles.contact}>{contactLine}</Text> : null}
          {roleLabel ? (
            <View style={styles.roleChip}>
              <Feather name="shield" size={12} color={theme.colors.secondary} />
              <Text style={styles.roleChipText}>{roleLabel}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleEditProfile}
            accessibilityRole="button"
            accessibilityLabel="Editar perfil"
            style={({ pressed }) => [styles.editPill, pressed ? styles.editPillPressed : null]}
          >
            <Feather name="edit-3" size={15} color={theme.colors.secondary} />
            <Text style={styles.editPillLabel}>Editar perfil</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.heroError}>
          <EmptyStateCard
            icon="user"
            title="No pudimos cargar tu perfil"
            message="Revisa tu conexión e inténtalo de nuevo."
            actionLabel="Reintentar"
            onAction={() => {
              void refetch();
            }}
          />
          {__DEV__ && error ? (() => {
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
          })() : null}
        </View>
      )}

      <Text style={styles.sectionLabel}>Cuenta</Text>
      <ListGroup>
        <ListRow
          icon="settings"
          title="Ajustes"
          subtitle="Sesiones, seguridad y cuenta"
          onPress={() => navigation.navigate("Settings")}
        />
      </ListGroup>

      <Text style={styles.sectionLabel}>Papayal</Text>
      <ListGroup>
        <ListRow
          icon="share-2"
          variant="accent"
          title="Compartir Papayal"
          subtitle="Invita a tu familia y amigos"
          onPress={shareApp}
        />
        <ListDivider />
        <ListRow
          icon="help-circle"
          title="Ayuda"
          subtitle="Preguntas frecuentes y soporte"
          onPress={() => navigation.navigate("Help")}
        />
        <ListDivider />
        <ListRow
          icon="file-text"
          title="Legal y privacidad"
          subtitle="Términos y políticas de datos"
          onPress={() => navigation.navigate("LegalPrivacy")}
        />
      </ListGroup>

      <ListGroup style={styles.logoutGroup}>
        <ListRow
          icon="log-out"
          variant="danger"
          chevron={false}
          title="Cerrar sesión"
          onPress={handleLogout}
          loading={loggingOut}
          disabled={loggingOut}
        />
      </ListGroup>

      <Text style={styles.version}>
        Papayal · Versión {appVersion ?? "—"}
        {buildNumber ? ` (${buildNumber})` : ""}
      </Text>
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1)
  },
  heroError: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1)
  },
  avatarPressable: {
    marginBottom: theme.spacing(1.5)
  },
  avatarPressed: {
    opacity: 0.85
  },
  avatarOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 48,
    backgroundColor: "#00000055",
    alignItems: "center",
    justifyContent: "center"
  },
  cameraBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: theme.colors.background
  },
  name: {
    fontSize: 24,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    textAlign: "center"
  },
  contact: {
    marginTop: theme.spacing(0.5),
    color: theme.colors.muted,
    fontSize: 15,
    textAlign: "center"
  },
  roleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(0.5),
    marginTop: theme.spacing(1),
    paddingVertical: theme.spacing(0.4),
    paddingHorizontal: theme.spacing(1),
    borderRadius: 999,
    backgroundColor: theme.colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border
  },
  roleChipText: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.typography.small
  },
  editPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(0.75),
    marginTop: theme.spacing(1.75),
    minHeight: 44,
    paddingVertical: theme.spacing(1),
    paddingHorizontal: theme.spacing(2.25),
    borderRadius: 999,
    backgroundColor: theme.colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2
  },
  editPillPressed: {
    backgroundColor: "#F8F2E6"
  },
  editPillLabel: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.semiBold,
    fontSize: 15
  },
  skeletonName: {
    marginTop: theme.spacing(1.5)
  },
  skeletonContact: {
    marginTop: theme.spacing(0.75)
  },
  skeletonPill: {
    marginTop: theme.spacing(1.75)
  },
  sectionLabel: {
    marginTop: theme.spacing(2.5),
    marginBottom: theme.spacing(1),
    paddingLeft: theme.spacing(0.5),
    color: theme.colors.secondary,
    fontFamily: theme.fonts.extraBold,
    fontSize: 16
  },
  logoutGroup: {
    marginTop: theme.spacing(2.5)
  },
  version: {
    marginTop: theme.spacing(2.5),
    textAlign: "center",
    color: theme.colors.captionMuted,
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    letterSpacing: 0.3
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
  }
});

export default ProfileScreen;
