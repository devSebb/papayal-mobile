import React, { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";

import Screen from "../../ui/components/Screen";
import Card from "../../ui/components/Card";
import Button from "../../ui/components/Button";
import MerchantGridCard from "../../ui/components/MerchantGridCard";
import { EmptyStateCard, SkeletonBlock } from "../../ui/components/StateViews";
import { theme } from "../../ui/theme";
import { publicMerchantsApi } from "../../api/endpoints";
import { CATEGORIES } from "../../constants/categories";
import { Merchant } from "../../types/api";
import { GuestHomeStackParamList } from "../../navigation";

type Nav = NativeStackNavigationProp<GuestHomeStackParamList, "GuestHome">;

const GuestBrowseScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const numColumns = width >= 1100 ? 4 : width >= 760 ? 3 : 2;
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const {
    data: merchants,
    isLoading,
    isRefetching,
    refetch
  } = useQuery<Merchant[]>({
    queryKey: ["publicMerchants"],
    queryFn: publicMerchantsApi.list
  });

  const merchantsList = merchants ?? [];
  const availableCategories = useMemo(
    () => CATEGORIES.filter((cat) => merchantsList.some((merchant) => merchant.categories?.includes(cat.key))),
    [merchantsList]
  );
  const filteredMerchants = useMemo(
    () =>
      selectedCategory
        ? merchantsList.filter((merchant) => merchant.categories?.includes(selectedCategory))
        : merchantsList,
    [merchantsList, selectedCategory]
  );

  const rootNavigation = navigation.getParent()?.getParent() as any;
  const isBusy = isLoading || isRefetching;

  return (
    <Screen scrollable edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <View style={styles.topLeft}>
            {rootNavigation?.canGoBack?.() ? (
              <Pressable
                onPress={() => rootNavigation.goBack()}
                style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Volver a la pantalla de inicio"
              >
                <Feather name="arrow-left" size={18} color={theme.colors.secondary} />
              </Pressable>
            ) : null}
            <View style={styles.brandBlock}>
              <Text style={styles.brand}>Papayal</Text>
              <Text style={styles.kicker}>Explora comercios antes de crear una cuenta.</Text>
            </View>
          </View>
          <Pressable
            onPress={() => rootNavigation?.navigate("Auth", { screen: "Login" })}
            style={styles.signInPill}
            accessibilityRole="button"
            accessibilityLabel="Iniciar sesión"
          >
            <Feather name="log-in" size={16} color={theme.colors.secondary} />
            <Text style={styles.signInText}>Entrar</Text>
          </Pressable>
        </View>

        <Card style={styles.heroCard}>
          <Text style={styles.heroTitle}>Tarjetas de regalo digitales para lo esencial en Ecuador.</Text>
          <Text style={styles.heroText}>
            Revisa los comercios disponibles sin registrarte. Para comprar, pagar o administrar tu billetera te pediremos iniciar sesión.
          </Text>
          <View style={styles.heroActions}>
            <Button
              label="Crear cuenta"
              onPress={() => rootNavigation?.navigate("Auth", { screen: "Signup" })}
              style={styles.heroButton}
            />
            <Button
              label="Iniciar sesión"
              variant="ghost"
              onPress={() => rootNavigation?.navigate("Auth", { screen: "Login" })}
              style={styles.heroButton}
            />
          </View>
        </Card>

        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Comercios</Text>
            <Text style={styles.sectionHint}>
              {isBusy
                ? "Cargando comercios..."
                : filteredMerchants.length === 1
                ? "1 comercio disponible"
                : `${filteredMerchants.length} comercios disponibles`}
            </Text>
          </View>
        </View>

        {!isBusy && availableCategories.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterBar}
            style={styles.filterBarWrapper}
          >
            <Pressable
              onPress={() => setSelectedCategory(null)}
              style={[styles.filterChip, selectedCategory === null && styles.filterChipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedCategory === null }}
            >
              <Text style={[styles.filterChipText, selectedCategory === null && styles.filterChipTextActive]}>
                Todos
              </Text>
            </Pressable>
            {availableCategories.map((category) => (
              <Pressable
                key={category.key}
                onPress={() => setSelectedCategory(selectedCategory === category.key ? null : category.key)}
                style={[styles.filterChip, selectedCategory === category.key && styles.filterChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedCategory === category.key }}
              >
                <Text style={styles.filterChipEmoji}>{category.emoji}</Text>
                <Text style={[styles.filterChipText, selectedCategory === category.key && styles.filterChipTextActive]}>
                  {category.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {isBusy ? (
          <View style={styles.gridSkeletons}>
            {Array.from({ length: numColumns * 2 }).map((_, index) => (
              <SkeletonBlock
                key={`public-merchant-skeleton-${index}`}
                height={138}
                radius={20}
                style={[styles.skeletonTile, numColumns >= 3 ? styles.skeletonThird : null]}
              />
            ))}
          </View>
        ) : filteredMerchants.length > 0 ? (
          <FlatList
            data={filteredMerchants}
            key={`guest-grid-${numColumns}`}
            numColumns={numColumns}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={numColumns > 1 ? styles.gridColumn : undefined}
            ItemSeparatorComponent={() => <View style={{ height: theme.spacing(1) }} />}
            renderItem={({ item }) => (
              <View style={styles.gridItem}>
                <MerchantGridCard
                  merchantId={item.id}
                  name={item.store_name || item.name}
                  logoUrl={item.logo_url}
                  onPress={() => navigation.navigate("GuestMerchantProfile", { id: item.id })}
                />
              </View>
            )}
          />
        ) : (
          <EmptyStateCard
            icon="shopping-bag"
            title={selectedCategory ? "No hay comercios en esta categoría" : "No hay comercios disponibles"}
            message={
              selectedCategory
                ? "Prueba con otra categoría o vuelve a ver todos los comercios."
                : "Estamos actualizando la lista de comercios disponibles."
            }
            actionLabel={selectedCategory ? "Ver todos" : "Reintentar"}
            onAction={() => {
              if (selectedCategory) {
                setSelectedCategory(null);
                return;
              }
              void refetch();
            }}
          />
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 980,
    alignSelf: "center"
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(2)
  },
  topLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1)
  },
  brandBlock: {
    flex: 1
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(13, 47, 50, 0.18)",
    backgroundColor: "transparent"
  },
  backButtonPressed: {
    backgroundColor: "rgba(13, 47, 50, 0.06)"
  },
  brand: {
    fontSize: 30,
    fontFamily: theme.fonts.brandBlack,
    color: theme.colors.secondary
  },
  kicker: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    marginTop: theme.spacing(0.25)
  },
  signInPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(0.5),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    paddingVertical: theme.spacing(0.8),
    paddingHorizontal: theme.spacing(1.15),
    borderRadius: 999
  },
  signInText: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.bold,
    fontSize: theme.typography.small
  },
  heroCard: {
    marginBottom: theme.spacing(2),
    gap: theme.spacing(1)
  },
  heroTitle: {
    color: theme.colors.text,
    fontFamily: theme.fonts.extraBold,
    fontSize: 26,
    lineHeight: 34
  },
  heroText: {
    color: theme.colors.muted,
    fontSize: theme.typography.body,
    lineHeight: 25
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    marginTop: theme.spacing(0.5)
  },
  heroButton: {
    flexGrow: 1,
    minWidth: 160
  },
  sectionHeaderRow: {
    marginBottom: theme.spacing(1)
  },
  sectionTitle: {
    fontSize: theme.typography.subheading,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text
  },
  sectionHint: {
    color: theme.colors.muted,
    marginTop: theme.spacing(0.25)
  },
  filterBarWrapper: {
    marginBottom: theme.spacing(1.5)
  },
  filterBar: {
    flexDirection: "row",
    gap: theme.spacing(0.75),
    paddingVertical: theme.spacing(0.25)
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(0.5),
    paddingVertical: theme.spacing(0.6),
    paddingHorizontal: theme.spacing(1.25),
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background
  },
  filterChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary
  },
  filterChipEmoji: {
    fontSize: 14
  },
  filterChipText: {
    fontSize: theme.typography.small,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text
  },
  filterChipTextActive: {
    color: theme.colors.secondary
  },
  gridContent: {
    gap: theme.spacing(1)
  },
  gridColumn: {
    gap: theme.spacing(1)
  },
  gridItem: {
    flex: 1
  },
  gridSkeletons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing(1)
  },
  skeletonTile: {
    flexBasis: "48%"
  },
  skeletonThird: {
    flexBasis: "31%"
  }
});

export default GuestBrowseScreen;
