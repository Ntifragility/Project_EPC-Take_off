/**
 * Generates an 8-character unique client-side identifier.
 */
export function uid(): string {
  return Math.random().toString(36).substring(2, 10);
}
