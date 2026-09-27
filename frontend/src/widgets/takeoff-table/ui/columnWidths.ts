export const COL_WIDTHS_STORAGE_KEY = 'epc-col-widths-v3';

export const BASE_COL_WIDTHS: Record<string, number> = {
  partida: 132,
  partidaBalance: 141,
  num: 40,
  mat: 66,
  plano: 140,
  rev: 62,
  tagUnico: 150,
  tagPlano: 130,
  detalle: 110,
  desc: 280,
  metradoOt: 114,
  unit: 75
};

export const TOTAL_BASE_WIDTH = Object.values(BASE_COL_WIDTHS).reduce((sum, w) => sum + w, 0);

export type ScreenCategory = '27' | '22' | '15' | 'small';

export function screenCategory(viewportWidth: number): ScreenCategory {
  if (viewportWidth >= 2000) return '27';
  if (viewportWidth >= 1500) return '22';
  if (viewportWidth >= 1024) return '15';
  return 'small';
}

/** Manual drag limits: shrink to 70%, extend up to 2x the natural width. */
export function minColumnWidth(key: string): number {
  return Math.round((BASE_COL_WIDTHS[key] ?? 80) * 0.7);
}

export function maxColumnWidth(key: string): number {
  return Math.round((BASE_COL_WIDTHS[key] ?? 80) * 2);
}

export function clampColumnWidth(key: string, width: number): number {
  return Math.min(maxColumnWidth(key), Math.max(minColumnWidth(key), Math.round(width)));
}

export function sumWidths(widths: Record<string, number>): number {
  return Object.keys(BASE_COL_WIDTHS).reduce(
    (sum, key) => sum + (widths[key] || BASE_COL_WIDTHS[key]),
    0
  );
}

/**
 * Scale the natural columns so they occupy exactly `paneWidth`.
 * Wide text columns shrink first if the floor mins would overflow.
 * Nothing goes below its 70% floor, so two columns never collapse into each other.
 */
export function fitWidthsToPane(paneWidth: number): Record<string, number> {
  const usable = Math.max(320, Math.floor(paneWidth) - 8);
  const mins: Record<string, number> = {};
  let minSum = 0;
  for (const key of Object.keys(BASE_COL_WIDTHS)) {
    mins[key] = minColumnWidth(key);
    minSum += mins[key];
  }

  if (usable <= minSum) {
    return { ...mins };
  }

  const scale = usable / TOTAL_BASE_WIDTH;
  const entries = Object.entries(BASE_COL_WIDTHS).map(([key, base]) => ({
    key,
    width: Math.max(mins[key], Math.round(base * scale))
  }));

  let overflow = entries.reduce((sum, col) => sum + col.width, 0) - usable;
  const shrinkFirst = ['desc', 'tagUnico', 'plano', 'partidaBalance', 'partida', 'tagPlano', 'detalle'];
  for (const key of shrinkFirst) {
    if (overflow <= 0) break;
    const col = entries.find(entry => entry.key === key);
    if (!col) continue;
    const take = Math.min(overflow, col.width - mins[key]);
    col.width -= take;
    overflow -= take;
  }

  const leftover = usable - entries.reduce((sum, col) => sum + col.width, 0);
  const desc = entries.find(entry => entry.key === 'desc');
  if (desc) desc.width += leftover;

  return Object.fromEntries(entries.map(col => [col.key, col.width]));
}

export function defaultWidths(viewportWidth: number, paneWidth?: number): Record<string, number> {
  if (paneWidth && paneWidth > 0) {
    return fitWidthsToPane(paneWidth);
  }
  return fitWidthsToPane(Math.round(TOTAL_BASE_WIDTH * (viewportWidth >= 2000 ? 1 : viewportWidth >= 1500 ? 0.92 : viewportWidth >= 1024 ? 0.8 : 0.7)));
}
