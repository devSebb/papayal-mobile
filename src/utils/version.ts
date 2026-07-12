/** Numeric dotted-version comparison ("1.2.10" > "1.2.9"). Non-numeric
 *  segments compare as 0. Returns -1 / 0 / 1. */
export const compareVersions = (a: string, b: string): number => {
  const pa = a.split(".").map((s) => Number.parseInt(s, 10) || 0);
  const pb = b.split(".").map((s) => Number.parseInt(s, 10) || 0);
  const len = Math.max(pa.length, pb.length);

  for (let i = 0; i < len; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
};

/** True when `current` is older than the required `min`. Missing values
 *  never force an update. */
export const isVersionBelow = (
  current?: string | null,
  min?: string | null
): boolean => {
  if (!current?.trim() || !min?.trim()) return false;
  return compareVersions(current.trim(), min.trim()) < 0;
};
