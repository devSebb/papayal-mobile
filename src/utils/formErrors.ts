/**
 * Maps backend 422 validation `details` (snake_case field keys + English
 * Rails messages) to user-facing Spanish. Every form that renders
 * validation details must go through this so raw API text never reaches
 * the UI.
 */

const FIELD_LABELS: Record<string, string> = {
  email: "Correo electrónico",
  password: "Contraseña",
  password_confirmation: "Confirmación de contraseña",
  first_name: "Nombre",
  last_name: "Apellido",
  name: "Nombre",
  phone: "Teléfono",
  date_of_birth: "Fecha de nacimiento",
  address: "Dirección",
  address_line1: "Dirección",
  city: "Ciudad",
  country: "País",
  national_id: "Cédula",
  interests: "Intereses",
  token: "Código",
  claim_otp: "Código de verificación",
  base: ""
};

// Known Rails/Devise validation messages. Patterns are matched in order;
// the first hit wins. Anything unrecognized falls back to a generic phrase
// so English never leaks through.
const MESSAGE_PATTERNS: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/can'?t be blank/i, () => "no puede estar vacío"],
  [/doesn'?t match password/i, () => "no coincide con la contraseña"],
  [/has already been taken/i, () => "ya está registrado"],
  [/is too short \(minimum is (\d+) characters?\)/i, (m) => `es demasiado corta (mínimo ${m[1]} caracteres)`],
  [/is too long \(maximum is (\d+) characters?\)/i, (m) => `es demasiado larga (máximo ${m[1]} caracteres)`],
  [/is not a number/i, () => "debe ser un número"],
  [/is not included in the list/i, () => "no es una opción válida"],
  [/is invalid/i, () => "no es válido"],
  [/must be accepted/i, () => "debe ser aceptado"],
  [/is expired|has expired/i, () => "ha expirado"]
];

const GENERIC_MESSAGE = "no es válido";

export const translateFieldLabel = (field: string): string =>
  FIELD_LABELS[field] ?? field.replace(/_/g, " ");

export const translateValidationMessage = (message: string): string => {
  for (const [pattern, translate] of MESSAGE_PATTERNS) {
    const match = message.match(pattern);
    if (match) return translate(match);
  }
  return GENERIC_MESSAGE;
};

/**
 * Flattens a 422 `details` object into Spanish lines, e.g.
 * "Correo electrónico: ya está registrado". Returns null when there is
 * nothing displayable, so callers can fall back to their generic copy.
 */
export const formatValidationDetails = (
  details: Record<string, string[] | string> | undefined | null
): string | null => {
  if (!details || typeof details !== "object") return null;

  const lines: string[] = [];
  for (const [field, value] of Object.entries(details)) {
    const messages = Array.isArray(value) ? value : [value];
    const label = translateFieldLabel(field);
    for (const message of messages) {
      if (typeof message !== "string" || !message.trim()) continue;
      const translated = translateValidationMessage(message);
      lines.push(label ? `${label}: ${translated}` : translated);
    }
  }
  return lines.length > 0 ? lines.join("\n") : null;
};
