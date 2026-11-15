import React from 'react';
import { cleanFloat } from '../lib/cleanNumber';

export interface SelectionStats {
  count: number;
  sum: number;
  hasNumbers: boolean;
}

/** Computes Excel status-bar counters: Recuento is non-empty cells, Suma adds numeric values only. */
export function computeSelectionStats<T extends { id: string }>(
  rows: T[],
  keys: Set<string>,
  getCell: (row: T, colKey: string) => string | number
): SelectionStats | null {
  if (keys.size === 0) return null;
  const byId = new Map(rows.map(row => [row.id, row]));
  let count = 0;
  let sum = 0;
  let hasNumbers = false;

  keys.forEach(key => {
    const split = key.indexOf('::');
    if (split === -1) return;
    const row = byId.get(key.slice(0, split));
    if (!row) return;
    const value = getCell(row, key.slice(split + 2));
    if (value === '') return;
    count += 1;
    if (typeof value === 'number' && Number.isFinite(value)) {
      sum += value;
      hasNumbers = true;
    }
  });

  return { count, sum: cleanFloat(sum), hasNumbers };
}

export function formatSelectionStat(value: number, fixedDecimals?: number): string {
  const clean = cleanFloat(value);
  if (fixedDecimals !== undefined) {
    const factor = 10 ** fixedDecimals;
    const rounded = Math.round(clean * factor) / factor;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(fixedDecimals);
  }
  const rounded = parseFloat(clean.toFixed(4));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export interface ExcelStatusBarProps {
  stats: SelectionStats | null;
  /** When set, non-integer sums render with fixed decimals (e.g. 2 for BDUCTOS). Otherwise trims up to 4 decimals. */
  fixedDecimals?: number;
}

export const ExcelStatusBar: React.FC<ExcelStatusBarProps> = ({ stats, fixedDecimals }) => (
  <div className="excel-status-bar" role="status" aria-live="polite">
    {stats && stats.count > 0 && (
      <span>
        Recuento: <strong>{stats.count}</strong>
      </span>
    )}
    {stats && stats.hasNumbers && (
      <span>
        Suma: <strong>{formatSelectionStat(stats.sum, fixedDecimals)}</strong>
      </span>
    )}
  </div>
);
