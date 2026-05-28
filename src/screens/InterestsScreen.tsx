import React, { useMemo, useState } from "react";
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

const FEATURED_KEYS = [
  "supermercado",
  "salud_y_medicina",
  "restaurantes",
  "servicios",
  "hogar",
  "belleza"
];

const CATEGORY_HINTS: Record<string, string> = {
  supermercado: "Compras de todos los días",
  salud_y_medicina: "Farmacias y cuidado",
  restaurantes: "Comida y antojos",
  servicios: "Pagos útiles",
  hogar: "Casa y familia",
  belleza: "Cuidado personal"
};

const InterestsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { signup, authLoading } = useAuth();
  const { width } = useWindowDimensions();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const contentWidth = width - theme.spacing(4);
  const featuredCardWidth = Math.floor((contentWidth - theme.spacing(1)) / 2);

  const { featuredCategories, compactCategories } = useMemo(() => {
    const featured = CATEGORIES.filter((cat) => FEATURED_KEYS.includes(cat.key));
    const compact = CATEGORIES.filter((cat) => !FEATURED_KEYS.includes(cat.key));
    return { featuredCategories: featured, compactCategories: compact };
  }, []);

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
        <View style={styles.stepRow}>
          <Text style={styles.step}>Paso 2 de 2</Text>
          <View style={styles.stepPill}>
            <Text style={styles.stepPillText}>{selected.size} elegida{selected.size === 1 ? "" : "s"}</Text>
          </View>
        </View>
        <Text style={styles.title}>Personaliza tu inicio</Text>
        <Text style={styles.subtitle}>
          Elige las categor{"\u00ED"}as que quieres ver primero cuando entres a Papayal.
        </Text>
      </View>

      <Card style={styles.preferenceCard}>
        <View style={styles.cardIntro}>
          <Text style={styles.sectionTitle}>Favoritas</Text>
          <Text style={styles.sectionSubtitle}>Toca una o varias. Puedes cambiarlas después.</Text>
        </View>

        <View style={styles.featuredGrid}>
          {featuredCategories.map((cat) => {
            const isSelected = selected.has(cat.key);
            return (
              <Pressable
                key={cat.key}
                onPress={() => toggle(cat.key)}
                style={[
                  styles.featuredCard,
                  { width: featuredCardWidth },
                  isSelected ? styles.featuredCardSelected : styles.featuredCardIdle
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <View style={styles.featuredTopRow}>
                  <View style={[styles.emojiBadge, isSelected ? styles.emojiBadgeSelected : null]}>
                    <Text style={styles.featuredEmoji}>{cat.emoji}</Text>
                  </View>
                  <View style={[styles.checkBadge, isSelected ? styles.checkBadgeSelected : null]}>
                    {isSelected ? (
                      <Feather name="check" size={14} color={theme.colors.secondary} />
                    ) : null}
                  </View>
                </View>
                <Text style={styles.featuredTitle} numberOfLines={2}>{cat.label}</Text>
                <Text style={styles.featuredHint} numberOfLines={2}>
                  {CATEGORY_HINTS[cat.key] ?? "Recomendaciones locales"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.moreSection}>
          <Text style={styles.sectionTitle}>M{"\u00E1"}s opciones</Text>
          <View style={styles.compactGrid}>
            {compactCategories.map((cat) => {
              const isSelected = selected.has(cat.key);
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => toggle(cat.key)}
                  style={[styles.compactChip, isSelected ? styles.compactChipSelected : null]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text style={styles.compactEmoji}>{cat.emoji}</Text>
                  <Text
                    style={[styles.compactLabel, isSelected ? styles.compactLabelSelected : null]}
                    numberOfLines={1}
                  >
                    {cat.label}
                  </Text>
                  {isSelected ? (
                    <Feather name="check" size={14} color={theme.colors.secondary} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.selectionSummary}>
          <Feather name="sliders" size={16} color={theme.colors.secondary} />
          <Text style={styles.selectionText}>
            {selected.size > 0
              ? `${selected.size} categoría${selected.size === 1 ? "" : "s"} seleccionada${selected.size === 1 ? "" : "s"}`
              : "Selecciona al menos una para personalizar tu experiencia"}
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label="Crear cuenta"
          onPress={() => handleSubmit(Array.from(selected))}
          loading={authLoading}
          disabled={selected.size === 0 || authLoading}
          style={styles.submit}
        />
        <Button
          label="Omitir por ahora"
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
    alignSelf: "flex-start"
  },
  header: {
    marginBottom: theme.spacing(2)
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(0.5)
  },
  step: {
    fontSize: theme.typography.small,
    color: theme.colors.primary,
    fontFamily: theme.fonts.semiBold
  },
  stepPill: {
    paddingHorizontal: theme.spacing(1),
    paddingVertical: theme.spacing(0.45),
    borderRadius: 999,
    backgroundColor: theme.colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border
  },
  stepPillText: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.bold,
    fontSize: theme.typography.small
  },
  title: {
    fontSize: 32,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text
  },
  subtitle: {
    fontSize: theme.typography.body,
    color: theme.colors.muted,
    marginTop: theme.spacing(0.5),
    lineHeight: 24
  },
  preferenceCard: {
    gap: theme.spacing(1.5)
  },
  cardIntro: {
    gap: theme.spacing(0.35)
  },
  sectionTitle: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    fontSize: theme.typography.subheading
  },
  sectionSubtitle: {
    color: theme.colors.muted,
    lineHeight: 20
  },
  featuredGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing(1)
  },
  featuredCard: {
    minHeight: 132,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    paddingHorizontal: theme.spacing(1.25),
    paddingVertical: theme.spacing(1.25),
    justifyContent: "space-between"
  },
  featuredCardIdle: {
    backgroundColor: "#F8FAFB",
    borderColor: theme.colors.border
  },
  featuredCardSelected: {
    backgroundColor: "#FFF7E6",
    borderColor: theme.colors.primary
  },
  featuredTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  emojiBadge: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border
  },
  emojiBadgeSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  featuredEmoji: {
    fontSize: 20
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.card
  },
  checkBadgeSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary
  },
  featuredTitle: {
    color: theme.colors.text,
    fontFamily: theme.fonts.extraBold,
    fontSize: 16,
    lineHeight: 20
  },
  featuredHint: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 17
  },
  moreSection: {
    gap: theme.spacing(1)
  },
  compactGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing(0.75)
  },
  compactChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(0.5),
    maxWidth: "100%",
    paddingVertical: theme.spacing(0.75),
    paddingHorizontal: theme.spacing(1),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#F8FAFB"
  },
  compactChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: "#FFF7E6"
  },
  compactEmoji: {
    fontSize: 15
  },
  compactLabel: {
    fontSize: theme.typography.small,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text,
    flexShrink: 1
  },
  compactLabelSelected: {
    color: theme.colors.secondary
  },
  selectionSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(0.75),
    padding: theme.spacing(1),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background
  },
  selectionText: {
    flex: 1,
    fontSize: theme.typography.small,
    color: theme.colors.secondary,
    fontFamily: theme.fonts.semiBold,
    lineHeight: 18
  },
  error: {
    color: theme.colors.danger,
    marginTop: theme.spacing(0.25)
  },
  submit: {
    marginTop: theme.spacing(0.5)
  }
});

export default InterestsScreen;
