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

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import Button from "../ui/components/Button";
import { theme } from "../ui/theme";
import { merchantsApi } from "../api/endpoints";
import { HomeStackParamList } from "../navigation";

const merchantPlaceholder = require("../../assets/merchant-default.png");

type RouteProps = RouteProp<HomeStackParamList, "MerchantProfile">;
type NavProps = NativeStackNavigationProp<HomeStackParamList, "MerchantProfile">;

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
  const logoSource = hasLogo ? { uri: merchant!.logo_url as string } : merchantPlaceholder;
  const categories = merchant?.categories ?? [];
  const hasCategories = categories.length > 0;

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
    <Screen scrollable edges={["left", "right"]}>
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

      {/* Header Card */}
      <Card style={styles.headerCard}>
        <View style={styles.logoContainer}>
          <Image source={logoSource} style={styles.logo} />
        </View>
        <Text style={styles.storeName}>{merchant.store_name || merchant.name}</Text>
      </Card>

      {/* About Section */}
      {(merchant.address || merchant.contact_email) && (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Información</Text>
          {merchant.address && (
            <View style={styles.infoRow}>
              <Feather name="map-pin" size={18} color={theme.colors.muted} />
              <Text style={styles.infoText}>{merchant.address}</Text>
            </View>
          )}
          {merchant.contact_email && (
            <View style={styles.infoRow}>
              <Feather name="mail" size={18} color={theme.colors.muted} />
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
            {categories.map((category, index) => (
              <View key={`${category}-${index}`} style={styles.categoryChip}>
                <Text style={styles.categoryText}>{category}</Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.noCategories}>Sin categorías</Text>
        )}
      </Card>

      {/* CTA Button */}
      <Button
        label="Comprar tarjeta"
        onPress={() => navigation.navigate("BuyGiftCardStart", { merchantId: merchant.id })}
        variant="primary"
        style={styles.ctaButton}
      />
    </Screen>
  );
};

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
  headerCard: {
    alignItems: "center",
    gap: theme.spacing(1.5),
    paddingVertical: theme.spacing(3)
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
    backgroundColor: "#F8F5EF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border
  },
  logo: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  storeName: {
    fontSize: theme.typography.heading,
    fontWeight: "800",
    color: theme.colors.text,
    textAlign: "center"
  },
  sectionCard: {
    marginTop: theme.spacing(1.5),
    gap: theme.spacing(1)
  },
  sectionTitle: {
    fontSize: theme.typography.subheading,
    fontWeight: "700",
    color: theme.colors.text
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1)
  },
  infoText: {
    color: theme.colors.text,
    fontSize: theme.typography.body,
    flex: 1
  },
  categoriesContainer: {
    flexDirection: "row",
    gap: theme.spacing(1),
    paddingVertical: theme.spacing(0.5)
  },
  categoryChip: {
    paddingVertical: theme.spacing(0.75),
    paddingHorizontal: theme.spacing(1.5),
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  categoryText: {
    color: theme.colors.secondary,
    fontWeight: "600",
    fontSize: theme.typography.small
  },
  noCategories: {
    color: theme.colors.muted,
    fontStyle: "italic"
  },
  ctaButton: {
    marginTop: theme.spacing(2),
    paddingVertical: theme.spacing(1.6),
    borderRadius: 18
  },
  loadingText: {
    marginTop: theme.spacing(1),
    color: theme.colors.muted
  },
  errorTitle: {
    marginTop: theme.spacing(1),
    fontSize: theme.typography.subheading,
    fontWeight: "700",
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
