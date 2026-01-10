import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import Screen from "../../ui/components/Screen";
import Card from "../../ui/components/Card";
import Button from "../../ui/components/Button";
import TextField from "../../ui/components/TextField";
import { theme } from "../../ui/theme";
import { HomeStackParamList } from "../../navigation";
import { usePurchaseDraft } from "../../domain/purchase/purchaseDraftStore";

const SAMPLE_RECIPIENT = {
  name: "Ana Ejemplo",
  email: "ana.ejemplo@demo.com",
  phone: "+593991112233",
  note: ""
};

const DeliveryProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { draft, setRecipient } = usePurchaseDraft();
  const [name, setName] = useState(draft.recipient?.name ?? SAMPLE_RECIPIENT.name);
  const [email, setEmail] = useState(draft.recipient?.email ?? SAMPLE_RECIPIENT.email);
  const [phone, setPhone] = useState(draft.recipient?.phone ?? SAMPLE_RECIPIENT.phone);
  const [note, setNote] = useState(draft.recipient?.note ?? SAMPLE_RECIPIENT.note);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = useMemo(() => {
    const emailRegex = /\S+@\S+\.\S+/;
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Requerido";
    if (!email.trim() || !emailRegex.test(email.trim())) next.email = "Correo inválido";
    if (!phone.trim()) next.phone = "Teléfono requerido";
    if (note.length > 140) next.note = "Máximo 140 caracteres";
    return next;
  }, [email, name, note, phone]);

  const isValid = Object.keys(errors).length === 0;

  const handleSubmit = () => {
    setTouched({ name: true, email: true, phone: true, note: true });
    if (!isValid) return;
    setRecipient({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      note: note.trim() ? note.trim() : undefined
    });
    navigation.navigate("PurchaseConfirmation");
  };

  return (
    <Screen scrollable>
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
      <Text style={styles.header}>Destinatario</Text>
      <Text style={styles.subheader}>
        Ingresa los datos del destinatario. Validamos email y teléfono para evitar errores.
      </Text>

      <Card style={styles.sectionCard}>
        <View style={styles.form}>
          <TextField
            label="Nombre completo"
            value={name}
            onChangeText={setName}
            placeholder="Ej: Ana Morales"
            onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
            error={touched.name ? errors.name : undefined}
          />
          <TextField
            label="Correo"
            value={email}
            onChangeText={setEmail}
            placeholder="correo@ejemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
            error={touched.email ? errors.email : undefined}
          />
          <TextField
            label="Teléfono"
            value={phone}
            onChangeText={setPhone}
            placeholder="+593..."
            keyboardType="phone-pad"
            onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
            error={touched.phone ? errors.phone : undefined}
          />
          <TextField
            label="Nota (opcional)"
            value={note}
            onChangeText={setNote}
            placeholder="Añade un mensaje corto"
            multiline
            onBlur={() => setTouched((prev) => ({ ...prev, note: true }))}
            error={touched.note ? errors.note : undefined}
          />
          <Text style={styles.helperText}>Máximo 140 caracteres. Se mostrará al destinatario.</Text>
        </View>
      </Card>

      <Button
        label="Continuar"
        onPress={handleSubmit}
        disabled={!isValid}
        style={styles.continueButton}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    fontSize: 26,
    fontWeight: "800",
    color: theme.colors.text
  },
  subheader: {
    color: theme.colors.muted,
    marginTop: theme.spacing(0.5),
    marginBottom: theme.spacing(1.5)
  },
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
  sectionCard: {
    gap: theme.spacing(2),
    marginBottom: theme.spacing(1.5)
  },
  form: {
    gap: theme.spacing(2)
  },
  helperText: {
    color: theme.colors.muted,
    fontSize: theme.typography.small
  },
  continueButton: {
    paddingVertical: theme.spacing(1.4),
    borderRadius: 18
  }
});

export default DeliveryProfileScreen;

