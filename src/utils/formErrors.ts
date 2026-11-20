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

/**
 * §4.1 checkout cap codes → the Spanish copy in §4.4. Every cap carries
 * `details` with the numbers, so the message can say how much room is left
 * instead of a flat "no puedes". The limits themselves are never hard-coded
 * here: they come from the payload the server sent.
 */
export type CheckoutCapDetails = {
  limit?: number;
  limit_cents?: number;
  used_cents?: number;
  room_cents?: number;
  min_cents?: number;
  max_cents?: number;
  resets_at?: string;
};

const money = (cents?: number) =>
  typeof cents === "number" && Number.isFinite(cents)
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(cents / 100)
    : null;

/** Room of exactly $0 means "no room": say so in words, never "hasta $0.00". */
const roomLeft = (cents?: number) =>
  typeof cents === "number" && cents > 0 ? money(cents) : null;

const CAP_MESSAGES: Record<string, (d: CheckoutCapDetails) => string> = {
  "checkout.load_amount_out_of_range": (d) => {
    const min = money(d.min_cents);
    const max = money(d.max_cents);
    return min && max
      ? `El monto por recarga debe estar entre ${min} y ${max}.`
      : "Ese monto no está permitido para una recarga.";
  },
  "checkout.card_daily_load_limit": (d) => {
    const room = roomLeft(d.room_cents);
    return room
      ? `Puedes recargar hasta ${room} más hoy en esta tarjeta.`
      : "Llegaste al límite de recargas de hoy en esta tarjeta. Inténtalo mañana.";
  },
  "checkout.card_daily_count_limit": () =>
    "Llegaste al límite de recargas de hoy. Inténtalo mañana.",
  "checkout.card_balance_limit": (d) => {
    const limit = money(d.limit_cents);
    const room = roomLeft(d.room_cents);
    if (limit && room) return `Esta tarjeta puede tener hasta ${limit} de saldo. Puedes recargar ${room}.`;
    if (limit) return `Esta tarjeta puede tener hasta ${limit} de saldo.`;
    return "Esta tarjeta llegó a su saldo máximo.";
  },
  "checkout.buyer_daily_limit": (d) => {
    const room = roomLeft(d.room_cents);
    return room
      ? `Puedes recargar hasta ${room} más hoy.`
      : "Llegaste al límite de recargas de hoy. Inténtalo mañana.";
  },
  "checkout.buyer_daily_count_limit": () =>
    "Llegaste al límite de recargas de hoy. Inténtalo mañana.",
  "checkout.recipient_monthly_limit": (d) => {
    const room = roomLeft(d.room_cents);
    return room
      ? `Esta persona puede recibir ${room} más en los próximos 30 días.`
      : "Esta persona llegó al límite de los últimos 30 días.";
  },
  "checkout.buyer_monthly_limit": (d) => {
    const room = roomLeft(d.room_cents);
    return room
      ? `Puedes recargar ${room} más en los próximos 30 días.`
      : "Llegaste a tu límite de los últimos 30 días.";
  },
  "checkout.buyer_dispute_open": () =>
    "Por seguridad, no puedes recargar mientras haya un pago en revisión."
};

/**
 * Returns the Spanish message for a `checkout.*` cap error, or null when the
 * code isn't one — callers then fall back to their own copy.
 */
export const translateCheckoutError = (
  code: string | undefined | null,
  details?: unknown
): string | null => {
  if (!code) return null;
  const build = CAP_MESSAGES[code];
  if (!build) return null;
  const safeDetails =
    details && typeof details === "object" && !Array.isArray(details)
      ? (details as CheckoutCapDetails)
      : {};
  return build(safeDetails);
};
