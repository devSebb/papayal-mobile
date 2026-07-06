import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import Screen from "../../ui/components/Screen";
import Card from "../../ui/components/Card";
import AppHeader from "../../ui/components/AppHeader";
import TopNavBar from "../../ui/components/TopNavBar";
import { theme } from "../../ui/theme";
import { ProfileStackParamList } from "../../navigation";
import { openLegal } from "../../utils/openExternal";

type LegalItem = {
  title: string;
  path: string;
  icon?: keyof typeof Feather.glyphMap;
};

const LEGAL_ITEMS: LegalItem[] = [
  { title: "Hub Legal", path: "/legal", icon: "file-text" },
  { title: "Términos y Condiciones", path: "/legal/terminos", icon: "file-text" },
  { title: "Política de Privacidad", path: "/legal/privacidad", icon: "shield" },
  { title: "Términos Tarjetas de Regalo", path: "/legal/tarjetas-regalo", icon: "gift" },
  { title: "Pagos y Reembolsos", path: "/legal/pagos-reembolsos", icon: "credit-card" },
  { title: "Uso Aceptable", path: "/legal/uso-aceptable", icon: "check-circle" },
  { title: "Eliminación de Cuenta y Datos", path: "/legal/eliminacion-datos", icon: "trash-2" }
];

const LegalPrivacyScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ProfileStackParamList>>();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Settings");
    }
  };

  const handleItemPress = (path: string) => {
    openLegal(path);
  };

  return (
    <Screen scrollable edges={["left", "right"]}>
      <TopNavBar />
      <Card>
        <AppHeader
          title="Legal y Privacidad"
          subtitle="Documentos legales y políticas de Papayal. Toca cualquier documento para verlo en detalle."
          icon="file-text"
          onBack={handleBack}
          style={styles.cardHeader}
        />

        <View style={styles.list}>
          {LEGAL_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.path}
              style={[styles.item, index === LEGAL_ITEMS.length - 1 && styles.lastItem]}
              onPress={() => handleItemPress(item.path)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir ${item.title}`}
            >
              <View style={styles.itemContent}>
                {item.icon && (
                  <Feather
                    name={item.icon}
                    size={20}
                    color={theme.colors.primary}
                    style={styles.itemIcon}
                  />
                )}
                <Text style={styles.itemTitle}>{item.title}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={theme.colors.muted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            En caso de conflicto entre versiones, prevalece la versión en español.
          </Text>
        </View>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  cardHeader: {
    marginBottom: theme.spacing(2)
  },
  list: {
    gap: 0
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(1),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border
  },
  lastItem: {
    borderBottomWidth: 0
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  itemIcon: {
    marginRight: theme.spacing(1)
  },
  itemTitle: {
    fontSize: theme.typography.body,
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
    flex: 1
  },
  footer: {
    marginTop: theme.spacing(2),
    paddingTop: theme.spacing(1.5),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border
  },
  footerText: {
    fontSize: theme.typography.small,
    color: theme.colors.muted,
    textAlign: "center",
    lineHeight: 18
  }
});

export default LegalPrivacyScreen;
