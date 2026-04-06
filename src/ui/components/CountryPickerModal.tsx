import React, { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View, FlatList } from "react-native";
import { Feather } from "@expo/vector-icons";
import { getCountryCallingCode, CountryCode } from "libphonenumber-js";
import { theme } from "../theme";

// Common countries list with their names and codes
const COUNTRIES: Array<{ code: CountryCode; name: string; flag: string }> = [
  { code: "EC", name: "Ecuador", flag: "🇪🇨" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "PE", name: "Peru", flag: "🇵🇪" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾" },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷" },
  { code: "PA", name: "Panama", flag: "🇵🇦" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹" },
  { code: "HN", name: "Honduras", flag: "🇭🇳" },
  { code: "NI", name: "Nicaragua", flag: "🇳🇮" },
  { code: "SV", name: "El Salvador", flag: "🇸🇻" },
  { code: "DO", name: "Dominican Republic", flag: "🇩🇴" },
  { code: "CU", name: "Cuba", flag: "🇨🇺" },
  { code: "JM", name: "Jamaica", flag: "🇯🇲" },
  { code: "HT", name: "Haiti", flag: "🇭🇹" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "RU", name: "Russia", flag: "🇷🇺" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "IL", name: "Israel", flag: "🇮🇱" },
  { code: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "GR", name: "Greece", flag: "🇬🇷" }
];

type CountryPickerModalProps = {
  visible: boolean;
  selectedCountry: CountryCode;
  onSelect: (country: CountryCode) => void;
  onClose: () => void;
};

const CountryPickerModal: React.FC<CountryPickerModalProps> = ({
  visible,
  selectedCountry,
  onSelect,
  onClose
}) => {
  const [search, setSearch] = useState("");

  const filteredCountries = useMemo(() => {
    if (!search.trim()) {
      return COUNTRIES;
    }
    const query = search.toLowerCase();
    return COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query) ||
        getCountryCallingCode(country.code).includes(query.replace(/\D/g, ""))
    );
  }, [search]);

  const handleSelect = (code: CountryCode) => {
    onSelect(code);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Seleccionar país</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.colors.text} />
            </Pressable>
          </View>

          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color={theme.colors.muted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar país..."
              placeholderTextColor={theme.colors.lightText}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => {
              const callingCode = getCountryCallingCode(item.code);
              const isSelected = item.code === selectedCountry;

              return (
                <Pressable
                  style={[styles.countryItem, isSelected && styles.countryItemSelected]}
                  onPress={() => handleSelect(item.code)}
                  android_ripple={{ color: theme.colors.border }}
                >
                  <Text style={styles.flag}>{item.flag}</Text>
                  <View style={styles.countryInfo}>
                    <Text style={styles.countryName}>{item.name}</Text>
                    <Text style={styles.callingCode}>+{callingCode}</Text>
                  </View>
                  {isSelected && <Feather name="check" size={20} color={theme.colors.primary} />}
                </Pressable>
              );
            }}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          />
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
  list: {
    flex: 1
  },
  listContent: {
    paddingBottom: theme.spacing(2)
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border
  },
  countryItemSelected: {
    backgroundColor: theme.colors.card
  },
  flag: {
    fontSize: 28,
    marginRight: theme.spacing(1.5)
  },
  countryInfo: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  countryName: {
    fontSize: theme.typography.body,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
    flex: 1
  },
  callingCode: {
    fontSize: theme.typography.body,
    color: theme.colors.muted,
    fontFamily: theme.fonts.regular,
    marginRight: theme.spacing(1)
  }
});

export default CountryPickerModal;

