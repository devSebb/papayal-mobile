import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Screen from "../../ui/components/Screen";
import Card from "../../ui/components/Card";
import Button from "../../ui/components/Button";
import TextField from "../../ui/components/TextField";
import { theme } from "../../ui/theme";
import { meApi, checkoutApi } from "../../api/endpoints";
import { useAuth } from "../../auth/authStore";
import { HomeStackParamList } from "../../navigation";
import { HttpError } from "../../api/http";

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

const CompleteDetailsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const route = useRoute<RouteProp<HomeStackParamList, "CompleteDetails">>();
  const missing = route.params?.missing ?? [];
  const returnTo = route.params?.returnTo ?? "StripePayment";
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: meApi.me,
    enabled: !!accessToken
  });

  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [validating, setValidating] = useState(false);

  // Check if phone is required (missing or user doesn't have one)
  const needsPhone = useMemo(() => {
    return missing.includes("phone") || !data?.phone;
  }, [missing, data?.phone]);

  useEffect(() => {
    if (data) {
      setAddress(data.address ?? "");
      setCountry(data.country_of_residence ?? "");
      setDob(toDisplayDate(data.date_of_birth));
      // Only set phone if user doesn't have one (for new phone input)
      if (!data.phone) {
        setPhone("");
      } else {
        setPhone(data.phone);
      }
    }
  }, [data]);

  useEffect(() => {
    if (missing.length > 0) {
      setTouched((prev) => ({
        ...prev,
        ...missing.reduce<Record<string, boolean>>((acc, key) => {
          acc[key] = true;
          return acc;
        }, {})
      }));
    }
  }, [missing]);

  const phoneRegex = /^\+?[0-9\s-]{7,15}$/;

  const derivedErrors = useMemo(() => {
    const next: Record<string, string> = {};
    if (!address.trim()) next.address = "Requerido";
    if (!country.trim()) next.country_of_residence = "Requerido";
    if (!dob.trim()) {
      next.date_of_birth = "Requerido";
    } else if (!toIsoDate(dob)) {
      next.date_of_birth = "Usa formato dd/mm/aaaa";
    }
    if (needsPhone) {
      if (!phone.trim()) {
        next.phone = "Requerido";
      } else if (!phoneRegex.test(phone.trim())) {
        next.phone = "Teléfono inválido";
      }
    }
    return next;
  }, [address, country, dob, phone, needsPhone]);

  const { mutateAsync: updateKyc, isPending: saving } = useMutation({
    mutationFn: meApi.updateKyc,
    onSuccess: async (updated) => {
      queryClient.setQueryData(["me"], updated);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    }
  });

  const displayName = useMemo(() => {
    const combined = [data?.first_name, data?.last_name].filter(Boolean).join(" ").trim();
    if (combined) return combined;
    return data?.name || "Usuario";
  }, [data]);

  const errorFor = (key: string) => fieldErrors[key] ?? (touched[key] ? derivedErrors[key] : undefined);
  const isValid = Object.keys(derivedErrors).length === 0;
  const isBusy = isLoading || !accessToken;

  const friendlyError = (err: HttpError) => {
    const details = err?.error?.details;
    if (typeof details === "string") return details;
    if (Array.isArray(details)) return details.filter(Boolean).join(", ");
    if (typeof details === "object" && details) {
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
    return err?.error?.message ?? "No pudimos guardar tus datos. Inténtalo de nuevo.";
  };

  const handleSubmit = async () => {
    setTouched({ address: true, country_of_residence: true, date_of_birth: true, phone: true });
    setFieldErrors({});
    const isoDob = toIsoDate(dob);
    if (!isValid || !isoDob) return;

    try {
      // Always include phone in the payload to satisfy backend requirements
      // Phone state is initialized from data.phone if user has one, or empty if they don't
      const payload: {
        address: string;
        country_of_residence: string;
        date_of_birth: string;
        phone: string;
      } = {
        address: address.trim(),
        country_of_residence: country.trim(),
        date_of_birth: isoDob,
        phone: phone.trim()
      };

      await updateKyc(payload);
      setValidating(true);
      const validation = await checkoutApi.validateKyc();
      if (validation.ok) {
        navigation.navigate(returnTo);
        return;
      }
      const missingErrors = (validation.missing ?? []).reduce<Record<string, string>>((acc, key) => {
        acc[key] = "Requerido";
        return acc;
      }, {});
      setFieldErrors(missingErrors);
      setTouched((prev) => ({
        ...prev,
        address: true,
        country_of_residence: true,
        date_of_birth: true,
        phone: true
      }));
      Alert.alert("Faltan datos", "Revisa los campos resaltados.");
    } catch (err) {
      const message = friendlyError(err as HttpError);
      Alert.alert("No pudimos guardar", message);
    } finally {
      setValidating(false);
    }
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("PurchaseConfirmation");
    }
  };

  return (
    <Screen scrollable>
      <View style={styles.navRow}>
        <Pressable
          onPress={handleGoBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={22} color={theme.colors.text} />
        </Pressable>
      </View>
      <Text style={styles.header}>Completa tus datos</Text>
      <Text style={styles.subheader}>
        Necesitamos estos datos para procesar tu compra de forma segura.
      </Text>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Tu perfil</Text>
        {isBusy ? (
          <Text style={styles.muted}>Cargando perfil...</Text>
        ) : (
          <View style={styles.infoList}>
            <InfoRow label="Nombre" value={displayName} />
            <InfoRow label="Correo" value={data?.email ?? "—"} />
            <InfoRow label="Teléfono" value={data?.phone ?? "—"} />
          </View>
        )}
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Datos requeridos para el pago</Text>
        <View style={styles.form}>
          <TextField
            label="Dirección"
            value={address}
            onChangeText={(text) => {
              setAddress(text);
              setFieldErrors((prev) => ({ ...prev, address: undefined }));
            }}
            placeholder="Calle y número"
            multiline
            numberOfLines={3}
            autoComplete="street-address"
            onBlur={() => setTouched((prev) => ({ ...prev, address: true }))}
            error={errorFor("address")}
          />
          <TextField
            label="País de residencia"
            value={country}
            onChangeText={(text) => {
              setCountry(text);
              setFieldErrors((prev) => ({ ...prev, country_of_residence: undefined }));
            }}
            placeholder="Ej: Ecuador"
            autoComplete="country-name"
            onBlur={() => setTouched((prev) => ({ ...prev, country_of_residence: true }))}
            error={errorFor("country_of_residence")}
          />
          <TextField
            label="Fecha de nacimiento (dd/mm/aaaa)"
            value={dob}
            onChangeText={(text) => {
              setDob(text);
              setFieldErrors((prev) => ({ ...prev, date_of_birth: undefined }));
            }}
            placeholder="dd/mm/aaaa"
            keyboardType="numbers-and-punctuation"
            onBlur={() => setTouched((prev) => ({ ...prev, date_of_birth: true }))}
            error={errorFor("date_of_birth")}
          />
          {needsPhone && (
            <TextField
              label="Teléfono"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                setFieldErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              placeholder="Ej: +593 99 123 4567"
              keyboardType="phone-pad"
              autoComplete="tel"
              onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
              error={errorFor("phone")}
            />
          )}
        </View>
      </Card>

      <Button
        label="Guardar y continuar"
        onPress={handleSubmit}
        loading={saving || validating}
        disabled={!isValid || saving || validating || isBusy}
        style={styles.submit}
      />
    </Screen>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || "—"}</Text>
  </View>
);

const styles = StyleSheet.create({
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing(1)
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent"
  },
  header: {
    fontSize: 26,
    fontWeight: "800",
    color: theme.colors.text
  },
  subheader: {
    color: theme.colors.muted,
    marginTop: theme.spacing(0.5),
    marginBottom: theme.spacing(1.5)
  },
  sectionCard: {
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1.25)
  },
  sectionTitle: {
    fontSize: theme.typography.subheading,
    fontWeight: "700",
    color: theme.colors.text
  },
  muted: {
    color: theme.colors.muted
  },
  infoList: {
    gap: theme.spacing(0.75)
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  infoLabel: {
    color: theme.colors.muted,
    fontWeight: "600"
  },
  infoValue: {
    color: theme.colors.text,
    fontWeight: "700",
    maxWidth: "65%"
  },
  form: {
    gap: theme.spacing(1.25)
  },
  submit: {
    marginTop: theme.spacing(0.5),
    paddingVertical: theme.spacing(1.4),
    borderRadius: 18
  }
});

export default CompleteDetailsScreen;


