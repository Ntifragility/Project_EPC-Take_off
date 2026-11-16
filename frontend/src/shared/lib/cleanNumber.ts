/**
 * Removes IEEE-754 binary floating-point representation drift (e.g. 178.99999999999997 -> 179,
 * 179.90000000000003 -> 179.9, 0.1 + 0.2 -> 0.3) while preserving genuine decimal precision.
 */
export function cleanFloat(n: number): number {
  if (n === 0) return 0;
  if (!Number.isFinite(n) || Number.isInteger(n)) return n;
  return Number(n.toPrecision(12));
}

/**
 * Strips IEEE-754 float tails from already-serialized numeric strings (e.g. "17.899999999999" -> "17.9").
 */
export function cleanNumericString(raw: string): string {
  const trimmed = raw.trim();
  if (!/^-?\d+\.\d{9,}$/.test(trimmed)) return raw;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return raw;
  return String(cleanFloat(n));
}
