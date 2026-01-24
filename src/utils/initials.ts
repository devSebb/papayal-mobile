/**
 * Extracts initials from a name string.
 * - Single word: returns first 2 characters (e.g., "John" → "JO")
 * - Multiple words: returns first letter of first two words (e.g., "John Doe" → "JD")
 * - Empty/null: returns "?"
 */
export const getInitials = (name?: string | null): string => {
  if (!name || !name.trim()) return "?";

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
};
