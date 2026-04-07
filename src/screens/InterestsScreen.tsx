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
import { CATEGORIES } from "../constants/categories";
import type { AuthStackParamList } from "../navigation";

type Nav = NativeStackNavigationProp<AuthStackParamList>;
type Route = RouteProp<AuthStackParamList, "Interests">;

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
          {CATEGORIES.map((cat) => {
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
    fontFamily: theme.fonts.semiBold,
    marginBottom: theme.spacing(0.5),
  },
  title: {
    fontSize: 32,
    fontFamily: theme.fonts.bold,
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
    fontFamily: theme.fonts.semiBold,
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
