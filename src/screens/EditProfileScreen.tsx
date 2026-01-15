import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import Button from "../ui/components/Button";
import TextField from "../ui/components/TextField";
import { theme } from "../ui/theme";
import { meApi } from "../api/endpoints";
import { useAuth } from "../auth/authStore";
import { ProfileStackParamList } from "../navigation";
import { HttpError } from "../api/http";

type EditProfileNav = NativeStackNavigationProp<ProfileStackParamList, "EditProfile">;

const emailRegex = /\S+@\S+\.\S+/;

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation<EditProfileNav>();
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: meApi.me,
    enabled: !!accessToken
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (data) {
      const fallbackName = data.name ?? "";
      const [given, ...rest] = fallbackName.split(" ").filter(Boolean);
      setFirstName(data.first_name ?? given ?? "");
      setLastName(data.last_name ?? (rest.length ? rest.join(" ") : ""));
      setEmail(data.email ?? "");
      setPhone(data.phone ?? "");
    }
  }, [data]);

  const errors = useMemo(() => {
    const next: Record<string, string> = {};
    if (!firstName.trim()) next.first_name = "Requerido";
    if (!lastName.trim()) next.last_name = "Requerido";
    if (!email.trim() || !emailRegex.test(email.trim())) next.email = "Correo inválido";
    if (!phone.trim()) next.phone = "Requerido";
    return next;
  }, [email, firstName, lastName, phone]);

  const isValid = Object.keys(errors).length === 0;
  const isBusy = isLoading || !accessToken;

  const { mutateAsync: updateProfile, isPending: saving } = useMutation({
    mutationFn: meApi.update,
    onSuccess: async (updated) => {
      queryClient.setQueryData(["me"], updated);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    }
  });

  const friendlyError = (err: HttpError) => {
    const details = err?.error?.details;
    if (err?.status === 422 && details) {
      if (typeof details === "string") return details;
      if (Array.isArray(details)) return details.filter(Boolean).join(", ");
      if (typeof details === "object") {
        const parts = Object.entries(details as Record<string, unknown>)
          .map(([key, value]) => {
            if (!value) return null;
            if (Array.isArray(value)) return `${key}: ${value.join(", ")}`;
            return `${key}: ${String(value)}`;
          })
          .filter(Boolean)
          .join(" ");
        if (parts) return parts;
      }
    }
    return err?.error?.message ?? "No pudimos actualizar tu perfil. Inténtalo de nuevo.";
  };

  const handleSubmit = async () => {
    setTouched({ first_name: true, last_name: true, email: true, phone: true });
    if (!isValid) return;

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone: phone.trim()
    };

    try {
      await updateProfile(payload);
      Alert.alert("Perfil actualizado", "Tus datos se guardaron correctamente.");
      navigation.goBack();
    } catch (err) {
      const message = friendlyError(err as HttpError);
      Alert.alert("No pudimos guardar", message);
    }
  };

  return (
    <Screen scrollable>
      <View style={styles.navRow}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={22} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.navTitle}>Editar perfil</Text>
        <View style={styles.navSpacer} />
      </View>

      <Card>
        <View style={styles.form}>
          {isBusy ? (
            <Text style={styles.muted}>Cargando perfil...</Text>
          ) : (
            <>
              <TextField
                label="Nombre"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Ej: Ana"
                autoComplete="name"
                onBlur={() => setTouched((prev) => ({ ...prev, first_name: true }))}
                error={touched.first_name ? errors.first_name : undefined}
              />
              <TextField
                label="Apellido"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Ej: Morales"
                autoComplete="name"
                onBlur={() => setTouched((prev) => ({ ...prev, last_name: true }))}
                error={touched.last_name ? errors.last_name : undefined}
              />
              <TextField
                label="Correo"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                error={touched.email ? errors.email : undefined}
              />
              <TextField
                label="Teléfono"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                placeholder="+593..."
                onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                error={touched.phone ? errors.phone : undefined}
              />
              <Button
                label="Guardar cambios"
                onPress={handleSubmit}
                loading={saving}
                disabled={!isValid || saving || isBusy}
                style={styles.submit}
              />
            </>
          )}
        </View>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(1.5)
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent"
  },
  navTitle: {
    fontSize: theme.typography.subheading,
    fontWeight: "800",
    color: theme.colors.text
  },
  navSpacer: {
    width: 36,
    height: 36
  },
  form: {
    gap: theme.spacing(1.5)
  },
  muted: {
    color: theme.colors.muted
  },
  submit: {
    marginTop: theme.spacing(0.5)
  }
});

export default EditProfileScreen;


