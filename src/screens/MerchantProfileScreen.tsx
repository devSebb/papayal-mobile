import React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring
} from "react-native-reanimated";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import Button from "../ui/components/Button";
import { theme } from "../ui/theme";
import { merchantsApi } from "../api/endpoints";
import { HomeStackParamList } from "../navigation";
import { CATEGORY_MAP } from "../constants/categories";
import { getMerchantColors } from "../utils/merchantColors";

type RouteProps = RouteProp<HomeStackParamList, "MerchantProfile">;
type NavProps = NativeStackNavigationProp<HomeStackParamList, "MerchantProfile">;

const SPRING_CONFIG = { damping: 15, stiffness: 300 };

const MerchantProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavProps>();
  const route = useRoute<RouteProps>();
  const { id } = route.params;

  const {
    data: merchant,
    isLoading,
    isError
  } = useQuery({
    queryKey: ["merchant", id],
    queryFn: () => merchantsApi.detail(id),
    enabled: !!id
  });

  const hasLogo = Boolean(merchant?.logo_url);
  const categories = merchant?.categories ?? [];
  const hasCategories = categories.length > 0;
  const colors = getMerchantColors(id);
  const initial =
    (merchant?.store_name || merchant?.name)?.trim()?.charAt(0)?.toUpperCase() || "C";

  // CTA spring animation
  const ctaScale = useSharedValue(1);
  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }]
  }));

  if (isLoading) {
    return (
      <Screen centerContent>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Cargando comercio...</Text>
      </Screen>
    );
  }

  if (isError || !merchant) {
    return (
      <Screen centerContent>
        <Feather name="alert-circle" size={48} color={theme.colors.danger} />
        <Text style={styles.errorTitle}>Error al cargar</Text>
        <Text style={styles.errorSubtitle}>
          No pudimos obtener la información del comercio.
        </Text>
        <Button
          label="Volver"
          onPress={() => navigation.goBack()}
          variant="secondary"
          style={styles.errorButton}
        />
      </Screen>
    );
  }

  return (
    <Screen
      scrollable
      header={
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
        </View>
      }
    >
      {/* Header Card */}
      <Card style={styles.headerCard}>
        {/* Brand zone */}
        <View style={[styles.brandZone, { backgroundColor: colors.bg }]} />

        {/* Logo — overlaps brand zone boundary */}
        <View style={styles.logoAnchor}>
          <View style={[styles.logoContainer, !hasLogo ? styles.logoPlaceholder : null]}>
            {hasLogo ? (
              <Image source={{ uri: merchant.logo_url as string }} style={styles.logo} />
            ) : (
              <Text style={styles.logoInitial}>{initial}</Text>
            )}
          </View>
        </View>

        <Text style={styles.storeName}>
          {merchant.store_name || merchant.name}
        </Text>
      </Card>

      {/* About Section */}
      {(merchant.address || merchant.contact_email) && (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Información</Text>
          {merchant.address && (
            <View style={styles.infoRow}>
              <Feather name="map-pin" size={20} color={theme.colors.muted} />
              <Text style={styles.infoText}>{merchant.address}</Text>
            </View>
          )}
          {merchant.contact_email && (
            <View style={styles.infoRow}>
              <Feather name="mail" size={20} color={theme.colors.muted} />
              <Text style={styles.infoText}>{merchant.contact_email}</Text>
            </View>
          )}
        </Card>
      )}

      {/* Categories Section */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Categorías</Text>
        {hasCategories ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {categories.map((category, index) => {
              const cat = CATEGORY_MAP[category];
              return (
                <View key={`${category}-${index}`} style={styles.categoryChip}>
                  {cat && <Text style={styles.categoryEmoji}>{cat.emoji}</Text>}
                  <Text style={styles.categoryText}>{cat?.label ?? category}</Text>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={styles.noCategories}>Sin categorías</Text>
        )}
      </Card>

      {/* CTA Button */}
      <Animated.View style={ctaAnimatedStyle}>
        <Pressable
          onPressIn={() => {
            ctaScale.value = withSpring(0.96, SPRING_CONFIG);
          }}
          onPressOut={() => {
            ctaScale.value = withSpring(1, SPRING_CONFIG);
          }}
          onPress={() =>
            navigation.navigate("BuyGiftCardStart", { merchantId: merchant.id })
          }
          style={styles.ctaPressable}
          accessibilityRole="button"
          accessibilityLabel="Comprar tarjeta"
        >
          <Text style={styles.ctaLabel}>Comprar tarjeta</Text>
        </Pressable>
      </Animated.View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  navRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent"
  },
  headerCard: {
    alignItems: "center",
    overflow: "hidden",
    padding: 0,
    paddingBottom: theme.spacing(3)
  },
  brandZone: {
    height: 120,
    width: "100%"
  },
  logoAnchor: {
    alignItems: "center",
    marginTop: -40
  },
  logoContainer: {
    width: "60%",
    aspectRatio: 2,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    padding: 8
  },
  logoPlaceholder: {
    backgroundColor: theme.colors.primary,
    padding: 0
  },
  logo: {
    width: "100%",
    height: "100%",
    resizeMode: "contain"
  },
  logoInitial: {
    color: "#FFFFFF",
    fontFamily: theme.fonts.black,
    fontSize: 32
  },
  storeName: {
    fontSize: 20,
    fontFamily: theme.fonts.extraBold,
    color: theme.colors.text,
    textAlign: "center",
    marginTop: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(2)
  },
  sectionCard: {
    marginTop: theme.spacing(2),
    gap: theme.spacing(1)
  },
  sectionTitle: {
    fontSize: theme.typography.subheading,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1.5),
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(1.5),
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border
  },
  infoText: {
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontFamily: theme.fonts.regular,
    flex: 1
  },
  categoriesContainer: {
    flexDirection: "row",
    gap: theme.spacing(1),
    paddingVertical: theme.spacing(0.5)
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: "#FFF8EC",
    borderWidth: 1,
    borderColor: "rgba(252, 165, 15, 0.3)"
  },
  categoryEmoji: {
    fontSize: 14
  },
  categoryText: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.bold,
    fontSize: theme.typography.small
  },
  noCategories: {
    color: theme.colors.muted,
    fontFamily: theme.fonts.italic
  },
  ctaPressable: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    paddingVertical: theme.spacing(1.6),
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.secondary,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  ctaLabel: {
    fontSize: theme.typography.body,
    fontFamily: theme.fonts.bold,
    color: theme.colors.secondary,
    letterSpacing: 0.1,
    textAlign: "center"
  },
  loadingText: {
    marginTop: theme.spacing(1),
    color: theme.colors.muted
  },
  errorTitle: {
    marginTop: theme.spacing(1),
    fontSize: theme.typography.subheading,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text
  },
  errorSubtitle: {
    color: theme.colors.muted,
    textAlign: "center",
    marginTop: theme.spacing(0.5)
  },
  errorButton: {
    marginTop: theme.spacing(2)
  }
});

export default MerchantProfileScreen;
