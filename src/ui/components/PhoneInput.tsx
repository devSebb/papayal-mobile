import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { parsePhoneNumber, getCountryCallingCode, CountryCode } from "libphonenumber-js";

import { theme } from "../theme";
import { getDefaultCountry, getCountryFromE164, parseToE164, formatNational, formatAsYouType } from "../../utils/phone";
import CountryPickerModal from "./CountryPickerModal";

type PhoneInputProps = Omit<TextInputProps, "value" | "onChangeText"> & {
  label?: string;
  valueE164?: string | null;
  onChangeE164?: (e164: string | null) => void;
  onValidChange?: (isValid: boolean) => void;
  error?: string;
  required?: boolean;
  defaultCountryIso2?: CountryCode;
};

const PhoneInput: React.FC<PhoneInputProps> = ({
  label,
  valueE164,
  onChangeE164,
  onValidChange,
  error,
  required = false,
  defaultCountryIso2,
  ...textInputProps
}) => {
  const [countryCode, setCountryCode] = useState<CountryCode>(defaultCountryIso2 || getDefaultCountry());
  const [nationalValue, setNationalValue] = useState("");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Initialize from E.164 value
  useEffect(() => {
    if (valueE164) {
      const country = getCountryFromE164(valueE164) || countryCode;
      setCountryCode(country);
      const national = formatNational(valueE164, country);
      setNationalValue(national);
    } else {
      setNationalValue("");
    }
  }, [valueE164]);

  // Compute E.164 and validity
  const phoneE164 = useMemo(() => {
    if (!nationalValue.trim()) {
      return null;
    }
    return parseToE164(nationalValue, countryCode);
  }, [nationalValue, countryCode]);

  const isValid = useMemo(() => {
    if (!nationalValue.trim()) {
      return !required;
    }
    return phoneE164 !== null;
  }, [nationalValue, phoneE164, required]);

  // Notify parent of changes
  useEffect(() => {
    onChangeE164?.(phoneE164 || null);
    onValidChange?.(isValid);
  }, [phoneE164, isValid, onChangeE164, onValidChange]);

  const handleNationalChange = (text: string) => {
    // If pasted value starts with +, try to parse it
    if (text.trim().startsWith("+")) {
      try {
        const parsed = parsePhoneNumber(text.trim());
        if (parsed.isValid()) {
          setCountryCode(parsed.country || countryCode);
          setNationalValue(parsed.nationalNumber);
          return;
        }
      } catch {
        // Fall through to normal formatting
      }
    }

    // Format as user types
    const formatted = formatAsYouType(text, countryCode);
    setNationalValue(formatted);
  };

  const handleCountrySelect = (code: CountryCode) => {
    setCountryCode(code);
    setShowCountryPicker(false);
    // Re-format current value with new country
    if (nationalValue) {
      const formatted = formatAsYouType(nationalValue.replace(/\D/g, ""), code);
      setNationalValue(formatted);
    }
  };

  // Get flag emoji for country (simple mapping)
  const getCountryFlag = (code: CountryCode): string => {
    const flagMap: Record<string, string> = {
      EC: "🇪🇨",
      US: "🇺🇸",
      MX: "🇲🇽",
      CO: "🇨🇴",
      PE: "🇵🇪",
      CL: "🇨🇱",
      AR: "🇦🇷",
      BR: "🇧🇷",
      ES: "🇪🇸",
      CA: "🇨🇦",
      GB: "🇬🇧",
      FR: "🇫🇷",
      DE: "🇩🇪",
      IT: "🇮🇹",
      PT: "🇵🇹",
      VE: "🇻🇪",
      BO: "🇧🇴",
      PY: "🇵🇾",
      UY: "🇺🇾",
      CR: "🇨🇷",
      PA: "🇵🇦",
      GT: "🇬🇹",
      HN: "🇭🇳",
      NI: "🇳🇮",
      SV: "🇸🇻",
      DO: "🇩🇴",
      CU: "🇨🇺",
      JM: "🇯🇲",
      HT: "🇭🇹",
      AU: "🇦🇺",
      NZ: "🇳🇿",
      JP: "🇯🇵",
      CN: "🇨🇳",
      IN: "🇮🇳",
      RU: "🇷🇺",
      KR: "🇰🇷",
      SG: "🇸🇬",
      AE: "🇦🇪",
      SA: "🇸🇦",
      ZA: "🇿🇦",
      EG: "🇪🇬",
      NG: "🇳🇬",
      KE: "🇰🇪",
      IL: "🇮🇱",
      TR: "🇹🇷",
      PL: "🇵🇱",
      NL: "🇳🇱",
      BE: "🇧🇪",
      CH: "🇨🇭",
      AT: "🇦🇹",
      SE: "🇸🇪",
      NO: "🇳🇴",
      DK: "🇩🇰",
      FI: "🇫🇮",
      IE: "🇮🇪",
      GR: "🇬🇷"
    };
    return flagMap[code] || "🌍";
  };

  const callingCode = useMemo(() => {
    try {
      return `+${getCountryCallingCode(countryCode)}`;
    } catch {
      return "+1";
    }
  }, [countryCode]);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputContainer, error ? styles.inputError : null, isFocused ? styles.inputFocused : null]}>
        <Pressable
          onPress={() => setShowCountryPicker(true)}
          style={styles.countryChip}
          accessibilityRole="button"
          accessibilityLabel="Seleccionar país"
        >
          <View style={styles.chipContent}>
            <Text style={styles.flag}>{getCountryFlag(countryCode)}</Text>
            <Text style={styles.callingCode}>{callingCode}</Text>
            <Feather name="chevron-down" size={16} color={theme.colors.muted} />
          </View>
        </Pressable>
        <View style={styles.divider} />
        <TextInput
          style={styles.input}
          value={nationalValue}
          onChangeText={handleNationalChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          keyboardType="phone-pad"
          placeholderTextColor={theme.colors.lightText}
          {...textInputProps}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <CountryPickerModal
        visible={showCountryPicker}
        selectedCountry={countryCode}
        onSelect={handleCountrySelect}
        onClose={() => setShowCountryPicker(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%"
  },
  label: {
    fontSize: theme.typography.small,
    color: theme.colors.muted,
    marginBottom: theme.spacing(0.5),
    fontFamily: theme.fonts.regular
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    minHeight: 48
  },
  inputFocused: {
    borderColor: theme.colors.primary
  },
  inputError: {
    borderColor: theme.colors.danger
  },
  countryChip: {
    paddingHorizontal: theme.spacing(1),
    paddingVertical: theme.spacing(0.75)
  },
  chipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(0.5)
  },
  flag: {
    fontSize: 20
  },
  callingCode: {
    fontSize: theme.typography.body,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
    fontWeight: "600"
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing(0.5)
  },
  input: {
    flex: 1,
    paddingHorizontal: theme.spacing(1.5),
    paddingVertical: theme.spacing(1.25),
    fontSize: theme.typography.body,
    color: theme.colors.text,
    fontFamily: theme.fonts.light
  },
  error: {
    color: theme.colors.danger,
    marginTop: theme.spacing(0.5),
    fontSize: theme.typography.small,
    fontFamily: theme.fonts.regular
  }
});

export default PhoneInput;

