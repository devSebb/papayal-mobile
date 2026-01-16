import { parsePhoneNumber, getCountryCallingCode, AsYouType, CountryCode } from "libphonenumber-js";

/**
 * Get default country ISO2 code
 * Defaults to "EC" (Ecuador) - the primary market for this app
 * 
 * Note: To enable locale detection, install and rebuild with:
 *   npx expo install expo-localization
 *   npx expo run:ios (or run:android)
 */
export const getDefaultCountry = (): CountryCode => {
  // Default to Ecuador (primary market)
  // Locale detection can be added later if needed by installing expo-localization
  // and rebuilding the native app
  return "EC";
};

/**
 * Parse E.164 phone number and extract country code
 */
export const getCountryFromE164 = (e164: string): CountryCode | null => {
  if (!e164 || !e164.startsWith("+")) {
    return null;
  }
  try {
    const parsed = parsePhoneNumber(e164);
    return parsed.country || null;
  } catch {
    return null;
  }
};

/**
 * Parse phone number and return E.164 format
 * Returns null if invalid
 */
export const parseToE164 = (
  value: string,
  countryIso2: CountryCode
): string | null => {
  if (!value || !value.trim()) {
    return null;
  }

  try {
    // If it already starts with +, parse directly
    if (value.trim().startsWith("+")) {
      const parsed = parsePhoneNumber(value.trim());
      return parsed.isValid() ? parsed.number : null;
    }

    // Otherwise parse with country context
    const parsed = parsePhoneNumber(value.trim(), countryIso2);
    return parsed.isValid() ? parsed.number : null;
  } catch {
    return null;
  }
};

/**
 * Format phone number to national format for display
 */
export const formatNational = (
  e164: string | null,
  countryIso2: CountryCode
): string => {
  if (!e164) {
    return "";
  }

  try {
    const parsed = parsePhoneNumber(e164);
    return parsed.formatNational();
  } catch {
    // If parsing fails, try to extract national number
    try {
      const parsed = parsePhoneNumber(e164, countryIso2);
      return parsed.formatNational();
    } catch {
      return "";
    }
  }
};

/**
 * Get national number from E.164 (without country code)
 */
export const getNationalNumber = (
  e164: string | null,
  countryIso2: CountryCode
): string => {
  if (!e164) {
    return "";
  }

  try {
    const parsed = parsePhoneNumber(e164);
    return parsed.nationalNumber;
  } catch {
    try {
      const parsed = parsePhoneNumber(e164, countryIso2);
      return parsed.nationalNumber;
    } catch {
      return "";
    }
  }
};

/**
 * Format as user types (national format)
 */
export const formatAsYouType = (
  value: string,
  countryIso2: CountryCode
): string => {
  if (!value) {
    return "";
  }

  // If starts with +, parse as international
  if (value.trim().startsWith("+")) {
    try {
      const formatter = new AsYouType();
      return formatter.input(value);
    } catch {
      return value;
    }
  }

  // Otherwise format as national
  try {
    const formatter = new AsYouType(countryIso2);
    return formatter.input(value);
  } catch {
    return value;
  }
};

/**
 * Validate phone number
 */
export const isValidPhone = (
  value: string,
  countryIso2: CountryCode
): boolean => {
  if (!value || !value.trim()) {
    return false;
  }

  try {
    const e164 = parseToE164(value, countryIso2);
    return e164 !== null;
  } catch {
    return false;
  }
};

