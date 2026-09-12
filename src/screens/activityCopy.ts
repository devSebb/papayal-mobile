import { Feather } from "@expo/vector-icons";

import { theme } from "../ui/theme";
import type { ActivityEvent, ActivityEventType } from "../types/api";

/**
 * Shared rendering of the server activity feed (§8.2) so the "Historial" tab
 * and the full-screen feed can never describe the same event differently.
 * Copy is §4.4 "Historial (activity feed)".
 */
const TITLES: Record<ActivityEventType, string> = {
  load_received: "Recarga recibida",
  load_sent: "Recarga enviada",
  load_self: "Recarga propia",
  redemption: "Canje",
  reversal: "Devolución del comercio",
  refund: "Reembolso a tu tarjeta de pago",
  write_off: "Recarga anulada",
  hold_released: "Retención liberada"
};

const ICONS: Record<ActivityEventType, { name: keyof typeof Feather.glyphMap; color: string }> = {
  load_received: { name: "arrow-down-left", color: theme.colors.secondary },
  load_sent: { name: "arrow-up-right", color: theme.colors.secondary },
  load_self: { name: "plus-circle", color: theme.colors.secondary },
  redemption: { name: "shopping-bag", color: theme.colors.primary },
  reversal: { name: "rotate-ccw", color: theme.colors.success },
  refund: { name: "credit-card", color: theme.colors.success },
  write_off: { name: "alert-circle", color: theme.colors.danger },
  hold_released: { name: "unlock", color: theme.colors.success }
};

const DATE_FORMATTER = new Intl.DateTimeFormat("es-EC", {
  day: "numeric",
  month: "short",
  year: "numeric"
});

export const activityIcon = (type: ActivityEventType) =>
  ICONS[type] ?? { name: "circle" as const, color: theme.colors.muted };

/** "Recarga recibida · de María" — the counterpart is part of the headline. */
export const activityTitle = (event: ActivityEvent) => {
  const base = TITLES[event.type] ?? "Movimiento";
  const who = event.counterpart?.name?.trim();
  if (!who) return base;
  if (event.type === "load_received") return `${base} · de ${who}`;
  if (event.type === "load_sent") return `${base} · a ${who}`;
  return base;
};

/** The merchant the money belongs to — every event has exactly one. */
export const activitySubtitle = (event: ActivityEvent) =>
  event.merchant?.store_name?.trim() || "Tarjeta de regalo";

export const formatActivityDate = (timestamp?: string | null) => {
  if (!timestamp) return "Reciente";
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return "Reciente";
  return DATE_FORMATTER.format(new Date(parsed));
};
