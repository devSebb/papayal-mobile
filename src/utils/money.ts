export const centsToDollars = (cents?: number | null) =>
  typeof cents === "number" && Number.isFinite(cents) ? cents / 100 : null;

export const formatMoney = (amount: number | null | undefined, currency?: string) => {
  if (!currency) return "—";
  const safeAmount = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(safeAmount);
  } catch {
    return `${currency} ${safeAmount.toFixed(2)}`;
  }
};

