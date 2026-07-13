import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";

import { theme } from "../theme";
import { formatNational, getDefaultCountry, parseToE164 } from "../../utils/phone";
import { getInitials } from "../../utils/initials";

/**
 * Bottom-sheet contact picker for the gifting flow (same shell as
 * CountryPickerModal). One row per phone number, so multi-number contacts
 * appear once per number — that IS the number chooser. Numbers are
 * normalized to E.164 with the EC default; ones that can't parse are
 * skipped (manual entry always remains available in the form).
 *
 * The caller owns the permission flow — this modal assumes access is
 * already granted when it becomes visible.
 */

export type ContactPick = {
  name: string | null;
  phoneE164: string;
};

type ContactEntry = {
  key: string;
  name: string | null;
  phoneE164: string;
  display: string;
};

type ContactPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (pick: ContactPick) => void;
};

// Accent-insensitive comparison so typing "jose" matches "José".
const normalizeForSearch = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const ContactPickerModal: React.FC<ContactPickerModalProps> = ({ visible, onClose, onSelect }) => {
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<Contacts.Contact[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSearch("");
    if (contacts) return; // already loaded this session

    setLoading(true);
    Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers],
      sort: Contacts.SortTypes.FirstName
    })
      .then(({ data }) => setContacts(data))
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  }, [visible, contacts]);

  const entries = useMemo<ContactEntry[]>(() => {
    if (!contacts) return [];
    const defaultCountry = getDefaultCountry();
    const rows: ContactEntry[] = [];

    contacts.forEach((contact, index) => {
      const name = contact.name?.trim() || null;
      const seen = new Set<string>();

      (contact.phoneNumbers ?? []).forEach((phone) => {
        const raw = phone.number ?? phone.digits ?? "";
        const phoneE164 = parseToE164(raw, defaultCountry);
        if (!phoneE164 || seen.has(phoneE164)) return;
        seen.add(phoneE164);
        rows.push({
          key: `${index}-${phoneE164}`,
          name,
          phoneE164,
          display: formatNational(phoneE164, defaultCountry) || phoneE164
        });
      });
    });

    // Nameless contacts sort to the end.
    rows.sort((a, b) => (a.name ?? "\uffff").localeCompare(b.name ?? "\uffff", "es"));
    return rows;
  }, [contacts]);

  const filteredEntries = useMemo(() => {
    if (!search.trim()) return entries;
    const query = normalizeForSearch(search);
    const digits = search.replace(/\D/g, "");
    return entries.filter(
      (entry) =>
        (entry.name && normalizeForSearch(entry.name).includes(query)) ||
        (digits.length > 0 && entry.phoneE164.replace(/\D/g, "").includes(digits))
    );
  }, [entries, search]);

  const handleSelect = (entry: ContactEntry) => {
    onSelect({ name: entry.name, phoneE164: entry.phoneE164 });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Elegir contacto</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.colors.text} />
            </Pressable>
          </View>

          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color={theme.colors.muted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre o número..."
              placeholderTextColor={theme.colors.lightText}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {loading ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.stateText}>Cargando tus contactos…</Text>
            </View>
          ) : filteredEntries.length === 0 ? (
            <View style={styles.stateContainer}>
              <Feather name="users" size={28} color={theme.colors.muted} />
              <Text style={styles.stateText}>
                {entries.length === 0
                  ? "No encontramos contactos con número de teléfono."
                  : "Sin resultados para tu búsqueda."}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredEntries}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.contactItem}
                  onPress={() => handleSelect(item)}
                  android_ripple={{ color: theme.colors.border }}
                >
                  <View style={styles.initialsCircle}>
                    <Text style={styles.initialsText}>{getInitials(item.name) || "?"}</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{item.name ?? "Sin nombre"}</Text>
                    <Text style={styles.contactNumber}>{item.display}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={theme.colors.muted} />
                </Pressable>
              )}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              nestedScrollEnabled
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end"
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    maxHeight: "80%",
    height: "80%",
    flexDirection: "column"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  headerTitle: {
    fontSize: theme.typography.subheading,
    color: theme.colors.text,
    fontFamily: theme.fonts.bold
  },
  closeButton: {
    padding: theme.spacing(0.5)
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: theme.spacing(2),
    paddingHorizontal: theme.spacing(1.5),
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  searchIcon: {
    marginRight: theme.spacing(1)
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.body,
    color: theme.colors.text,
    fontFamily: theme.fonts.light,
    paddingVertical: theme.spacing(1)
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing(1),
    padding: theme.spacing(3)
  },
  stateText: {
    color: theme.colors.muted,
    textAlign: "center",
    lineHeight: 20
  },
  list: {
    flex: 1
  },
  listContent: {
    paddingBottom: theme.spacing(2)
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1.5),
    padding: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border
  },
  initialsCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7E6",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(252, 165, 15, 0.45)"
  },
  initialsText: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.bold,
    fontSize: theme.typography.small
  },
  contactInfo: {
    flex: 1,
    gap: 2
  },
  contactName: {
    fontSize: theme.typography.body,
    color: theme.colors.text,
    fontFamily: theme.fonts.semiBold
  },
  contactNumber: {
    fontSize: theme.typography.small,
    color: theme.colors.muted
  }
});

export default ContactPickerModal;
