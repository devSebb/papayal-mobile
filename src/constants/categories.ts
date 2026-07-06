export const CATEGORIES = [
  { key: "salud_y_medicina", label: "Salud y medicina", emoji: "\u{1F48A}" },
  { key: "mascotas", label: "Mascotas", emoji: "\u{1F43E}" },
  { key: "servicios", label: "Servicios", emoji: "\u{1F50C}" },
  { key: "supermercado", label: "Supermercado", emoji: "\u{1F6D2}" },
  { key: "hogar", label: "Hogar", emoji: "\u{1F3E0}" },
  { key: "tecnologia", label: "Tecnolog\u00EDa", emoji: "\u{1F4BB}" },
  { key: "ropa_y_moda", label: "Ropa y moda", emoji: "\u{1F457}" },
  { key: "belleza", label: "Belleza", emoji: "\u{1F484}" },
  { key: "deportes_y_fitness", label: "Deportes y fitness", emoji: "\u26BD" },
  { key: "entretenimiento", label: "Entretenimiento", emoji: "\u{1F3AC}" },
  { key: "restaurantes", label: "Restaurantes", emoji: "\u{1F37D}\uFE0F" },
  { key: "educacion", label: "Educaci\u00F3n", emoji: "\u{1F4DA}" },
  { key: "viajes", label: "Viajes", emoji: "\u2708\uFE0F" },
  { key: "bebes_y_ninos", label: "Beb\u00E9s y ni\u00F1os", emoji: "\u{1F476}" },
] as const;

export type CategoryKey = typeof CATEGORIES[number]["key"];

export type Category = typeof CATEGORIES[number];

// Fast lookup by key — use to resolve label/emoji from a raw key string
export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c])
) as Record<string, Category>;
