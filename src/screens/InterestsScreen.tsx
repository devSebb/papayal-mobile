import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable, useWindowDimensions } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import Button from "../ui/components/Button";
import { theme } from "../ui/theme";
import { useAuth } from "../auth/authStore";
import { HttpError } from "../api/http";
import type { AuthStackParamList } from "../navigation";

type Nav = NativeStackNavigationProp<AuthStackParamList>;
type Route = RouteProp<AuthStackParamList, "Interests">;

const INTEREST_CATEGORIES = [
  { key: "salud_y_medicina", label: "Salud y medicina", emoji: "\u{1F48A}" },
  { key: "mascotas", label: "Mascotas", emoji: "\u{1F43E}" },
  { key: "servicios", label: "Servicios", emoji: "\u{1F50C}" },
  { key: "supermercado", label: "Supermercado", emoji: "\u{1F6D2}" },
  { key: "hogar", label: "Hogar", emoji: "\u{1F3E0}" },
  { key: "tecnologia", label: "Tecnolog\u00EDa", emoji: "\u{1F4BB}" },
  { key: "ropa_y_moda", label: "Ropa y moda", emoji: "\u{1F457}" },
  { key: "belleza", label: "Belleza", emoji: "\u{1F484}" },
  { key: "deportes_y_fitness", label: "Deportes y fitness", emoji: "\u26BD" },
  { key: "entretenimiento", label: "Entretenimiento", emoji: "\u{1F3AC}" },
  { key: "restaurantes", label: "Restaurantes", emoji: "\u{1F37D}\uFE0F" },
  { key: "educacion", label: "Educaci\u00F3n", emoji: "\u{1F4DA}" },
  { key: "viajes", label: "Viajes", emoji: "\u2708\uFE0F" },
  { key: "bebes_y_ninos", label: "Beb\u00E9s y ni\u00F1os", emoji: "\u{1F476}" },
] as const;

const InterestsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { signup, authLoading } = useAuth();
  const { width } = useWindowDimensions();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const chipWidth = (width - theme.spacing(2) * 2 - theme.spacing(2) - theme.spacing(1)) / 2;

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSubmit = async (interests: string[]) => {
    setError(null);
    try {
      await signup({ ...route.params.formData, interests });
    } catch (err) {
      const httpErr = err as HttpError;
      const details = httpErr?.error?.details;
      let friendly =
        (httpErr?.error?.message as string | undefined) ??
        "No pudimos crear tu cuenta. Int\u00E9ntalo de nuevo.";

      if (httpErr?.status === 422 && details) {
        if (typeof details === "string") {
          friendly = details;
        } else if (Array.isArray(details)) {
          friendly = details.filter(Boolean).join(", ");
        } else if (typeof details === "object") {
          const parts = Object.entries(details as Record<string, unknown>)
            .map(([key, value]) => {
              if (!value) return null;
              const text = Array.isArray(value) ? value.join(", ") : String(value);
              return `${key}: ${text}`;
            })
            .filter(Boolean)
            .join(" ");
          if (parts) friendly = parts;
        }
      }
      setError(friendly);
    }
  };

  return (
    <Screen scrollable>
      <Pressable
        onPress={() => navigation.goBack()}
        style={styles.backButton}
        hitSlop={12}
      >
        <Feather name="arrow-left" size={24} color={theme.colors.text} />
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.step}>Paso 2 de 2</Text>
        <Text style={styles.title}>Tus intereses</Text>
        <Text style={styles.subtitle}>
          Selecciona las categor{"\u00ED"}as que m{"\u00E1"}s te interesan.
        </Text>
      </View>

      <Card>
        <View style={styles.grid}>
          {INTEREST_CATEGORIES.map((cat) => {
            const isSelected = selected.has(cat.key);
            return (
              <Pressable
                key={cat.key}
                onPress={() => toggle(cat.key)}
                style={[
                  styles.chip,
                  { width: chipWidth },
                  isSelected ? styles.chipSelected : styles.chipIdle,
                ]}
              >
                <Text style={styles.chipEmoji}>{cat.emoji}</Text>
                <Text
                  style={[
                    styles.chipLabel,
                    isSelected && styles.chipLabelSelected,
                  ]}
                  numberOfLines={1}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {selected.size > 0 && (
          <Text style={styles.counter}>
            {selected.size} seleccionada{selected.size !== 1 ? "s" : ""}
          </Text>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label="Crear cuenta"
          onPress={() => handleSubmit(Array.from(selected))}
          loading={authLoading}
          disabled={selected.size === 0 || authLoading}
          style={styles.submit}
        />
        <Button
          label="Omitir"
          variant="ghost"
          onPress={() => handleSubmit([])}
          disabled={authLoading}
        />
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  backButton: {
    marginBottom: theme.spacing(1),
    alignSelf: "flex-start",
  },
  header: {
    marginBottom: theme.spacing(2),
  },
  step: {
    fontSize: theme.typography.small,
    color: theme.colors.primary,
    fontWeight: "600",
    marginBottom: theme.spacing(0.5),
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.typography.body,
    color: theme.colors.muted,
    marginTop: theme.spacing(0.5),
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing(1),
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(0.75),
    paddingVertical: theme.spacing(1.25),
    paddingHorizontal: theme.spacing(1.25),
    borderRadius: 14,
    borderWidth: 1,
  },
  chipIdle: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipEmoji: {
    fontSize: 18,
  },
  chipLabel: {
    fontSize: theme.typography.small,
    fontWeight: "600",
    color: theme.colors.text,
    flexShrink: 1,
  },
  chipLabelSelected: {
    color: theme.colors.secondary,
  },
  counter: {
    fontSize: theme.typography.small,
    color: theme.colors.muted,
    textAlign: "center",
    marginTop: theme.spacing(1.5),
  },
  error: {
    color: theme.colors.danger,
    marginTop: theme.spacing(1),
  },
  submit: {
    marginTop: theme.spacing(2),
  },
});

export default InterestsScreen;
