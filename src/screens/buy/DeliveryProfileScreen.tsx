import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";

import Screen from "../../ui/components/Screen";
import Card from "../../ui/components/Card";
import Button from "../../ui/components/Button";
import TextField from "../../ui/components/TextField";
import PhoneInput from "../../ui/components/PhoneInput";
import ContactPickerModal, { ContactPick } from "../../ui/components/ContactPickerModal";
import { theme } from "../../ui/theme";
import { HomeStackParamList } from "../../navigation";
import { usePurchaseDraft } from "../../domain/purchase/purchaseDraftStore";
import CheckoutHeader from "./CheckoutHeader";

const DeliveryProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { draft, setRecipient } = usePurchaseDraft();
  const [name, setName] = useState(draft.recipient?.name ?? "");
  const [email, setEmail] = useState(draft.recipient?.email ?? "");
  const [phoneE164, setPhoneE164] = useState<string | null>(draft.recipient?.phone ?? null);
  const [phoneValid, setPhoneValid] = useState(false);
  const [note, setNote] = useState(draft.recipient?.note ?? "");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [contactPickerVisible, setContactPickerVisible] = useState(false);

  // Same permission pattern as the avatar upload: request on tap, Spanish
  // alert on denial, and manual entry always remains available.
  const openContactPicker = async () => {
    let { status } = await Contacts.getPermissionsAsync();
    if (status !== "granted") {
      ({ status } = await Contacts.requestPermissionsAsync());
    }
    if (status !== "granted") {
      Alert.alert(
        "Permiso requerido",
        "Autoriza el acceso a tus contactos en Ajustes para elegir un destinatario, o escribe su número manualmente."
      );
      return;
    }
    setContactPickerVisible(true);
  };

  const handleContactSelected = ({ name: contactName, phoneE164: pickedPhone }: ContactPick) => {
    if (contactName) setName(contactName);
    setPhoneE164(pickedPhone);
    setTouched((prev) => ({ ...prev, name: true, phone: true }));
  };

  // Check if phone is valid when E.164 changes
  useEffect(() => {
    if (phoneE164) {
      setPhoneValid(true);
    } else {
      setPhoneValid(false);
    }
  }, [phoneE164]);

  const errors = useMemo(() => {
    const emailRegex = /\S+@\S+\.\S+/;
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Requerido";
    if (!email.trim() || !emailRegex.test(email.trim())) next.email = "Correo inválido";
    if (!phoneE164 || !phoneValid) next.phone = phoneE164 ? "Teléfono inválido" : "Teléfono requerido";
    if (note.length > 140) next.note = "Máximo 140 caracteres";
    return next;
  }, [email, name, note, phoneE164, phoneValid]);

  const isValid = Object.keys(errors).length === 0;

  const handleSubmit = () => {
    setTouched({ name: true, email: true, phone: true, note: true });
    if (!isValid) return;
    setRecipient({
      name: name.trim(),
      email: email.trim(),
      phone: phoneE164 || "",
      note: note.trim() ? note.trim() : undefined
    });
    navigation.navigate("PurchaseConfirmation");
  };

  return (
    <Screen scrollable>
      <CheckoutHeader
        step="recipient"
        title="Destinatario"
        subtitle="Ingresa los datos de entrega. Validamos email y teléfono para evitar errores."
        onBack={() => navigation.goBack()}
      />

      <Card style={styles.sectionCard}>
        <View style={styles.form}>
          <Pressable
            style={({ pressed }) => [styles.contactsRow, pressed ? styles.contactsRowPressed : null]}
            onPress={openContactPicker}
            accessibilityRole="button"
            accessibilityLabel="Elegir destinatario de mis contactos"
          >
            <View style={styles.contactsIcon}>
              <Feather name="users" size={18} color={theme.colors.secondary} />
            </View>
            <Text style={styles.contactsRowText}>Elegir de mis contactos</Text>
            <Feather name="chevron-right" size={18} color={theme.colors.muted} />
          </Pressable>

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
          <PhoneInput
            label="Teléfono"
            valueE164={phoneE164}
            onChangeE164={(e164) => {
              setPhoneE164(e164);
            }}
            onValidChange={setPhoneValid}
            required
            placeholder="099 123 4567"
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

      <ContactPickerModal
        visible={contactPickerVisible}
        onClose={() => setContactPickerVisible(false)}
        onSelect={handleContactSelected}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  sectionCard: {
    gap: theme.spacing(2),
    marginBottom: theme.spacing(1.5)
  },
  form: {
    gap: theme.spacing(2)
  },
  contactsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1),
    padding: theme.spacing(1.25),
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background
  },
  contactsRowPressed: {
    opacity: 0.85
  },
  contactsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7E6",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(252, 165, 15, 0.45)"
  },
  contactsRowText: {
    flex: 1,
    color: theme.colors.text,
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.typography.body - 1
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
