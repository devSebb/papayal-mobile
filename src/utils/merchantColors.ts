// Merchant ID → { bg: zone background color, accent: accent bar color }

const merchantColorMap: Record<string, { bg: string; accent: string }> = {
  // Farmacia Buendía — pharmacy green/teal
  "cm5nq8kjs0001s6010umj8ggf": { bg: "#EDF7F2", accent: "#34A06C" },
  // Ferretería Uno — hardware warm orange
  "cm5nq8kjs0002s601xvnq3b2h": { bg: "#FFF3E6", accent: "#E87C1E" },
  // Supermercado Central — grocery fresh green
  "cm5nq8kjs0003s601k9dm5f4r": { bg: "#F0F7EC", accent: "#5BA539" },
  // Test Cafe — coffee brown/warm
  "cm5nq8kjs0004s601m2tp7g9w": { bg: "#F5F0EB", accent: "#8B6543" },
};

const DEFAULT_COLORS = { bg: "#FFF8EC", accent: "#FCA50F" };

export const getMerchantColors = (merchantId?: string) =>
  merchantColorMap[merchantId ?? ""] ?? DEFAULT_COLORS;
