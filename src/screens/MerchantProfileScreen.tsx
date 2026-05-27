import React from "react";
import {
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
import AppHeader from "../ui/components/AppHeader";
import { EmptyStateCard, SkeletonBlock } from "../ui/components/StateViews";
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
      <Screen scrollable>
        <Card style={styles.headerCard}>
          <SkeletonBlock height={120} radius={0} />
          <View style={styles.logoAnchor}>
            <SkeletonBlock width="60%" height={82} radius={22} />
          </View>
          <SkeletonBlock width="58%" height={22} radius={11} style={styles.loadingTitleLine} />
        </Card>
        <Card style={styles.sectionCard}>
          <SkeletonBlock width="42%" height={20} radius={10} />
          <SkeletonBlock height={54} />
          <SkeletonBlock height={54} />
        </Card>
        <Card style={styles.sectionCard}>
          <SkeletonBlock width="36%" height={20} radius={10} />
          <View style={styles.loadingChipRow}>
            <SkeletonBlock width={92} height={38} radius={19} />
            <SkeletonBlock width={116} height={38} radius={19} />
            <SkeletonBlock width={84} height={38} radius={19} />
          </View>
        </Card>
      </Screen>
    );
  }

  if (isError || !merchant) {
    return (
      <Screen centerContent>
        <EmptyStateCard
          icon="alert-circle"
          title="No pudimos cargar el comercio"
          message="Revisa tu conexión e intenta abrirlo nuevamente."
          actionLabel="Volver"
          onAction={() => navigation.goBack()}
          style={styles.errorCard}
        />
      </Screen>
    );
  }

  return (
    <Screen
      scrollable
      header={
        <AppHeader onBack={() => navigation.goBack()} showBackLabel={false} />
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
  loadingTitleLine: {
    marginTop: theme.spacing(2)
  },
  loadingChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    paddingVertical: theme.spacing(0.5)
  },
  errorCard: {
    width: "100%"
  }
});

export default MerchantProfileScreen;
