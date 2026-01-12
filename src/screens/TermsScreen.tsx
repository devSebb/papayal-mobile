import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import TopNavBar from "../ui/components/TopNavBar";
import Button from "../ui/components/Button";
import { theme } from "../ui/theme";
import { ProfileStackParamList } from "../navigation";

const TermsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ProfileStackParamList>>();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Settings");
    }
  };

  return (
    <Screen scrollable edges={["left", "right"]}>
      <TopNavBar />
      <Card>
        <View style={styles.headerRow}>
          <Button
            label="Volver"
            onPress={handleBack}
            variant="ghost"
            style={styles.backButton}
            labelColor={theme.colors.text}
          />
          <Feather name="file-text" size={20} color={theme.colors.text} />
        </View>
        <Text style={styles.title}>Términos y condiciones</Text>
        <Text style={styles.muted}>
          Esta es información de ejemplo. Reemplaza este texto con los términos y condiciones
          oficiales cuando estén disponibles.
        </Text>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uso de la aplicación</Text>
          <Text style={styles.sectionText}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse
            lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor.
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacidad</Text>
          <Text style={styles.sectionText}>
            Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod
            non, mi.
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Soporte</Text>
          <Text style={styles.sectionText}>
            Quisque dictum. Integer nisl risus, sagittis convallis, rutrum id, elementum congue,
            nibh.
          </Text>
        </View>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(1)
  },
  backButton: {
    paddingHorizontal: theme.spacing(1),
    paddingVertical: theme.spacing(0.5),
    alignSelf: "flex-start"
  },
  title: {
    fontSize: theme.typography.subheading,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing(0.5)
  },
  muted: {
    color: theme.colors.muted
  },
  section: {
    marginTop: theme.spacing(1.5)
  },
  sectionTitle: {
    fontSize: theme.typography.body,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing(0.25)
  },
  sectionText: {
    color: theme.colors.muted,
    lineHeight: 22
  }
});

export default TermsScreen;


