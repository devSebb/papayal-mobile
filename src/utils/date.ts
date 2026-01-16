/**
 * Converts ISO date string (YYYY-MM-DD) to display format (dd/mm/yyyy)
 */
export const toDisplayDate = (value?: string | null) => {
  if (!value) return "";
  const isoParts = value.split("-");
  if (isoParts.length === 3) {
    const [year, month, day] = isoParts;
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  }
  return value;
};

/**
 * Converts display format (dd/mm/yyyy) to ISO date string (YYYY-MM-DD)
 */
export const toIsoDate = (value: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, dayStr, monthStr, yearStr] = match;
  const day = Number(dayStr);
  const month = Number(monthStr);
  const year = Number(yearStr);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  const paddedMonth = monthStr.padStart(2, "0");
  const paddedDay = dayStr.padStart(2, "0");
  return `${yearStr}-${paddedMonth}-${paddedDay}`;
};

/**
 * Formats date input as user types, automatically adding slashes
 * Input: "15051990" -> Output: "15/05/1990"
 * Handles partial input: "15" -> "15", "1505" -> "15/05"
 */
export const formatDateInput = (text: string): string => {
  // Remove all non-numeric characters
  const numbers = text.replace(/\D/g, "");

  // Limit to 8 digits (ddmmyyyy)
  const limited = numbers.slice(0, 8);

  // Format with slashes
  if (limited.length === 0) {
    return "";
  } else if (limited.length <= 2) {
    // Just day: "15"
    return limited;
  } else if (limited.length <= 4) {
    // Day and month: "15/05"
    return `${limited.slice(0, 2)}/${limited.slice(2)}`;
  } else {
    // Full date: "15/05/1990"
    return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
  }
};

