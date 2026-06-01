import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import Screen from "../../ui/components/Screen";
import Card from "../../ui/components/Card";
import AppHeader from "../../ui/components/AppHeader";
import { EmptyStateCard, SkeletonBlock } from "../../ui/components/StateViews";
import { theme } from "../../ui/theme";
import { publicMerchantsApi } from "../../api/endpoints";
import { CATEGORY_MAP } from "../../constants/categories";
import { getMerchantColors } from "../../utils/merchantColors";
import { setPendingPostAuthIntent } from "../../navigation/postAuthIntent";
import { GuestHomeStackParamList } from "../../navigation";

type RouteProps = RouteProp<GuestHomeStackParamList, "GuestMerchantProfile">;
type Nav = NativeStackNavigationProp<GuestHomeStackParamList, "GuestMerchantProfile">;

const SPRING_CONFIG = { damping: 15, stiffness: 300 };

const GuestMerchantProfileScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { id } = route.params;
  const rootNavigation = navigation.getParent()?.getParent() as any;

  const {
    data: merchant,
    isLoading,
    isError
  } = useQuery({
    queryKey: ["publicMerchant", id],
    queryFn: () => publicMerchantsApi.detail(id),
    enabled: !!id
  });

  const ctaScale = useSharedValue(1);
  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }]
  }));

  const colors = getMerchantColors(id);
  const categories = merchant?.categories ?? [];
  const hasLogo = Boolean(merchant?.logo_url);
  const initial = (merchant?.store_name || merchant?.name)?.trim()?.charAt(0)?.toUpperCase() || "C";

  const handleBuy = () => {
    setPendingPostAuthIntent({ type: "buy_gift_card", merchantId: id });
    rootNavigation?.navigate("Auth", { screen: "Login" });
  };

  if (isLoading) {
    return (
      <Screen scrollable header={<AppHeader onBack={() => navigation.goBack()} showBackLabel={false} />}>
        <View style={styles.container}>
          <Card style={styles.headerCard}>
            <SkeletonBlock height={120} radius={0} />
            <View style={styles.logoAnchor}>
              <SkeletonBlock width="60%" height={82} radius={22} />
            </View>
            <SkeletonBlock width="52%" height={22} radius={11} style={styles.loadingTitleLine} />
          </Card>
          <Card style={styles.sectionCard}>
            <SkeletonBlock width="38%" height={20} radius={10} />
            <SkeletonBlock height={54} />
          </Card>
        </View>
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
    <Screen scrollable header={<AppHeader onBack={() => navigation.goBack()} showBackLabel={false} />}>
      <View style={styles.container}>
        <Card style={styles.headerCard}>
          <View style={[styles.brandZone, { backgroundColor: colors.bg }]} />
          <View style={styles.logoAnchor}>
            <View style={[styles.logoContainer, !hasLogo ? styles.logoPlaceholder : null]}>
              {hasLogo ? (
                <Image source={{ uri: merchant.logo_url as string }} style={styles.logo} />
              ) : (
                <Text style={styles.logoInitial}>{initial}</Text>
              )}
            </View>
          </View>
          <Text style={styles.storeName}>{merchant.store_name || merchant.name}</Text>
        </Card>

        {merchant.address ? (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Información</Text>
            <View style={styles.infoRow}>
              <Feather name="map-pin" size={20} color={theme.colors.muted} />
              <Text style={styles.infoText}>{merchant.address}</Text>
            </View>
          </Card>
        ) : null}

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Categorías</Text>
          {categories.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
              {categories.map((category, index) => {
                const cat = CATEGORY_MAP[category];
                return (
                  <View key={`${category}-${index}`} style={styles.categoryChip}>
                    {cat ? <Text style={styles.categoryEmoji}>{cat.emoji}</Text> : null}
                    <Text style={styles.categoryText}>{cat?.label ?? category}</Text>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={styles.noCategories}>Sin categorías</Text>
          )}
        </Card>

        <Card style={styles.authCard}>
          <Text style={styles.authTitle}>Compra con una cuenta Papayal</Text>
          <Text style={styles.authText}>
            Puedes explorar comercios sin registrarte. Para pagar, recibir comprobantes y administrar tu billetera, inicia sesión o crea una cuenta.
          </Text>
        </Card>

        <Animated.View style={ctaAnimatedStyle}>
          <Pressable
            onPressIn={() => {
              ctaScale.value = withSpring(0.96, SPRING_CONFIG);
            }}
            onPressOut={() => {
              ctaScale.value = withSpring(1, SPRING_CONFIG);
            }}
            onPress={handleBuy}
            style={styles.ctaPressable}
            accessibilityRole="button"
            accessibilityLabel="Iniciar sesión para comprar tarjeta"
          >
            <Text style={styles.ctaLabel}>Iniciar sesión para comprar</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center"
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
    backgroundColor: theme.colors.secondary,
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
    fontSize: 22,
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
  authCard: {
    marginTop: theme.spacing(2),
    gap: theme.spacing(0.75),
    borderColor: "rgba(13, 47, 50, 0.18)"
  },
  authTitle: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    fontSize: theme.typography.subheading
  },
  authText: {
    color: theme.colors.muted,
    fontSize: theme.typography.body,
    lineHeight: 25
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
    textAlign: "center"
  },
  loadingTitleLine: {
    marginTop: theme.spacing(2)
  },
  errorCard: {
    width: "100%"
  }
});

export default GuestMerchantProfileScreen;
