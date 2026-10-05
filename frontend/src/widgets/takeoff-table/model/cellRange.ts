export const SELECTABLE_COLS = [
  'partida',
  'partidaBalance',
  'material',
  'plano',
  'rev',
  'tagUnico',
  'tagPlano',
  'detalle',
  'desc',
  'metradoOt',
  'unit'
] as const;

export type SelectableCol = (typeof SELECTABLE_COLS)[number];

export interface CellRef {
  itemId: string;
  colKey: string;
}

export function cellKey(itemId: string, colKey: string): string {
  return `${itemId}::${colKey}`;
}

export function cellsInRect<T extends { id: string }>(
  rows: T[],
  a: CellRef,
  b: CellRef
): Set<string> {
  const rowA = rows.findIndex(r => r.id === a.itemId);
  const rowB = rows.findIndex(r => r.id === b.itemId);
  const colA = SELECTABLE_COLS.indexOf(a.colKey as SelectableCol);
  const colB = SELECTABLE_COLS.indexOf(b.colKey as SelectableCol);
  if (rowA < 0 || rowB < 0 || colA < 0 || colB < 0) return new Set();

  const r0 = Math.min(rowA, rowB);
  const r1 = Math.max(rowA, rowB);
  const c0 = Math.min(colA, colB);
  const c1 = Math.max(colA, colB);
  const keys = new Set<string>();
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      keys.add(cellKey(rows[r].id, SELECTABLE_COLS[c]));
    }
  }
  return keys;
}

export function isSingleCell(a: CellRef, b: CellRef | null | undefined): boolean {
  if (!b) return true;
  return a.itemId === b.itemId && a.colKey === b.colKey;
}

export interface RangeEdges {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}

/** Outer edges of a selected rectangle, so CSS can draw one grid outline. */
export function rangeEdgesForCell(
  rows: { id: string }[],
  rangeKeys: Set<string>,
  itemId: string,
  colKey: string
): RangeEdges | null {
  if (!rangeKeys.has(cellKey(itemId, colKey))) return null;
  const rowIdx = rows.findIndex(r => r.id === itemId);
  const colIdx = SELECTABLE_COLS.indexOf(colKey as SelectableCol);
  if (rowIdx < 0 || colIdx < 0) return null;

  const prevRow = rowIdx > 0 ? rows[rowIdx - 1] : null;
  const nextRow = rowIdx < rows.length - 1 ? rows[rowIdx + 1] : null;
  const leftCol = colIdx > 0 ? SELECTABLE_COLS[colIdx - 1] : null;
  const rightCol = colIdx < SELECTABLE_COLS.length - 1 ? SELECTABLE_COLS[colIdx + 1] : null;

  return {
    top: !prevRow || !rangeKeys.has(cellKey(prevRow.id, colKey)),
    bottom: !nextRow || !rangeKeys.has(cellKey(nextRow.id, colKey)),
    left: !leftCol || !rangeKeys.has(cellKey(itemId, leftCol)),
    right: !rightCol || !rangeKeys.has(cellKey(itemId, rightCol))
  };
}

export function rangeEdgesByCol(
  rows: { id: string }[],
  rangeKeys: Set<string>,
  itemId: string
): Record<string, RangeEdges> {
  const out: Record<string, RangeEdges> = {};
  for (const col of SELECTABLE_COLS) {
    const edges = rangeEdgesForCell(rows, rangeKeys, itemId, col);
    if (edges) out[col] = edges;
  }
  return out;
}
