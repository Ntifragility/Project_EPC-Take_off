/** Blank stays blank while typing. "0" and "0.4" both parse. Invalid text becomes 0. */
export function parsePromptNumber(raw: string): number {
  const text = raw.trim().replace(',', '.');
  if (text === '' || text === '.' || text === '-' || text === '-.') return 0;
  const value = Number(text);
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

/** Counts: whole numbers only. A decimal is cut off, so "2.5" stays "2". */
export function sanitizeIntegerInput(raw: string): string {
  const trimmed = raw.trim().replace(',', '.');
  if (trimmed === '') return '';
  const whole = trimmed.split('.')[0] ?? '';
  return whole.replace(/\D/g, '');
}

/** Lengths: at most two digits after the decimal point. */
export function sanitizeLengthInput(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === '') return '';
  const text = trimmed.replace(',', '.');
  const cleaned = text.replace(/[^\d.]/g, '');
  const dot = cleaned.indexOf('.');
  if (dot < 0) return cleaned.replace(/\D/g, '');
  const whole = cleaned.slice(0, dot).replace(/\D/g, '');
  const fraction = cleaned.slice(dot + 1).replace(/\D/g, '').slice(0, 2);
  if (fraction.length === 0) return `${whole || '0'}.`;
  return `${whole || '0'}.${fraction}`;
}

export function parseIntegerInput(raw: string): number {
  return Math.trunc(parsePromptNumber(sanitizeIntegerInput(raw)));
}

export function parseLengthInput(raw: string): number {
  return Math.round(parsePromptNumber(sanitizeLengthInput(raw)) * 100) / 100;
}
