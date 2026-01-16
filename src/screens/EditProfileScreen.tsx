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
const phoneRegex = /^\+?[0-9\s-]{7,15}$/;

const toDisplayDate = (value?: string | null) => {
  if (!value) return "";
  const isoParts = value.split("-");
  if (isoParts.length === 3) {
    const [year, month, day] = isoParts;
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  }
  return value;
};

const toIsoDate = (value: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, dayStr, monthStr, yearStr] = match;
  const day = Number(dayStr);
  const month = Number(monthStr);
  const year = Number(yearStr);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  const paddedMonth = monthStr.padStart(2, "0");
  const paddedDay = dayStr.padStart(2, "0");
  return `${yearStr}-${paddedMonth}-${paddedDay}`;
};

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
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [dob, setDob] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (data) {
      const fallbackName = data.name ?? "";
      const [given, ...rest] = fallbackName.split(" ").filter(Boolean);
      setFirstName(data.first_name ?? given ?? "");
      setLastName(data.last_name ?? (rest.length ? rest.join(" ") : ""));
      setEmail(data.email ?? "");
      setPhone(data.phone ?? "");
      setAddress(data.address ?? "");
      setCountry(data.country_of_residence ?? "");
      setDob(toDisplayDate(data.date_of_birth));
    }
  }, [data]);

  const errors = useMemo(() => {
    const next: Record<string, string> = {};
    if (!firstName.trim()) next.first_name = "Requerido";
    if (!lastName.trim()) next.last_name = "Requerido";
    if (!email.trim() || !emailRegex.test(email.trim())) next.email = "Correo inválido";
    if (!phone.trim()) {
      next.phone = "Requerido";
    } else if (!phoneRegex.test(phone.trim())) {
      next.phone = "Teléfono inválido";
    }
    if (dob.trim() && !toIsoDate(dob)) {
      next.date_of_birth = "Usa formato dd/mm/aaaa";
    }
    return next;
  }, [email, firstName, lastName, phone, dob]);

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
    setTouched({
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
      address: true,
      country_of_residence: true,
      date_of_birth: true
    });
    if (!isValid) return;

    const isoDob = dob.trim() ? toIsoDate(dob) : null;
    if (dob.trim() && !isoDob) {
      setTouched((prev) => ({ ...prev, date_of_birth: true }));
      return;
    }

    const payload: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
      address?: string;
      country_of_residence?: string;
      date_of_birth?: string;
    } = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone: phone.trim()
    };

    if (address.trim()) {
      payload.address = address.trim();
    }
    if (country.trim()) {
      payload.country_of_residence = country.trim();
    }
    if (isoDob) {
      payload.date_of_birth = isoDob;
    }

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
              <TextField
                label="Dirección"
                value={address}
                onChangeText={setAddress}
                placeholder="Calle y número"
                multiline
                numberOfLines={3}
                autoComplete="street-address"
                onBlur={() => setTouched((prev) => ({ ...prev, address: true }))}
                error={touched.address ? errors.address : undefined}
              />
              <TextField
                label="País de residencia"
                value={country}
                onChangeText={setCountry}
                placeholder="Ej: Ecuador"
                autoComplete="country-name"
                onBlur={() => setTouched((prev) => ({ ...prev, country_of_residence: true }))}
                error={touched.country_of_residence ? errors.country_of_residence : undefined}
              />
              <TextField
                label="Fecha de nacimiento (dd/mm/aaaa)"
                value={dob}
                onChangeText={setDob}
                placeholder="dd/mm/aaaa"
                keyboardType="numbers-and-punctuation"
                onBlur={() => setTouched((prev) => ({ ...prev, date_of_birth: true }))}
                error={touched.date_of_birth ? errors.date_of_birth : undefined}
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


