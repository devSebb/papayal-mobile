export const centsToDollars = (cents?: number | null) =>
  typeof cents === "number" && Number.isFinite(cents) ? cents / 100 : null;

/**
 * Money for compact UI copy — limits, chips, hints: "$5" instead of "$5.00".
 * Cents are kept whenever they carry information ("$7.50"). Use formatMoney
 * for anything the user is paying or holding; those always show cents.
 */
export const formatMoneyCompact = (amount: number | null | undefined, currency?: string) => {
  if (!currency) return "—";
  const safeAmount = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  if (!Number.isInteger(safeAmount)) return formatMoney(safeAmount, currency);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(safeAmount);
  } catch {
    return `${currency} ${safeAmount}`;
  }
};

export const formatMoney = (amount: number | null | undefined, currency?: string) => {
  if (!currency) return "—";
  const safeAmount = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  try {
    // Deliberately pinned to "en-US" (NOT the device locale, NOT "es-EC"):
    // the app's established money convention everywhere is "$1,250.00" —
    // period decimals with comma thousands. es-EC would render "$1.250,50"
    // and the device locale varies per user ("US$ 10,00", "$10.00", ...).
    // Pinning keeps every screen consistent with what users already see.
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(safeAmount);
  } catch {
    return `${currency} ${safeAmount.toFixed(2)}`;
  }
};

