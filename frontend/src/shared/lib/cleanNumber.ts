/**
 * Removes IEEE-754 binary floating-point representation drift (e.g. 178.99999999999997 -> 179,
 * 179.90000000000003 -> 179.9, 0.1 + 0.2 -> 0.3) while preserving genuine decimal precision.
 */
export function cleanFloat(n: number): number {
  if (n === 0) return 0;
  if (!Number.isFinite(n) || Number.isInteger(n)) return n;
  return Number(n.toPrecision(12));
}
