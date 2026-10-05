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
  b: CellRef,
  columns: readonly string[] = SELECTABLE_COLS
): Set<string> {
  const rowA = rows.findIndex(r => r.id === a.itemId);
  const rowB = rows.findIndex(r => r.id === b.itemId);
  const colA = columns.indexOf(a.colKey);
  const colB = columns.indexOf(b.colKey);
  if (rowA < 0 || rowB < 0 || colA < 0 || colB < 0) return new Set();

  const r0 = Math.min(rowA, rowB);
  const r1 = Math.max(rowA, rowB);
  const c0 = Math.min(colA, colB);
  const c1 = Math.max(colA, colB);
  const keys = new Set<string>();
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      keys.add(cellKey(rows[r].id, columns[c]));
    }
  }
  return keys;
}

export function isSingleCell(a: CellRef, b: CellRef | null | undefined): boolean {
  if (!b) return true;
  return a.itemId === b.itemId && a.colKey === b.colKey;
}

const ARROW_STEP: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1]
};

/** Moves the far corner of a selection by one cell. The anchor stays put. */
export function extendSelection(
  rows: { id: string }[],
  columns: readonly string[],
  anchor: CellRef,
  focus: CellRef | null,
  key: string
): CellRef | null {
  const step = ARROW_STEP[key];
  if (!step) return null;
  const current = focus ?? anchor;
  const rowIdx = rows.findIndex(row => row.id === current.itemId);
  const colIdx = columns.indexOf(current.colKey);
  if (rowIdx < 0 || colIdx < 0) return null;
  const nextRow = Math.min(rows.length - 1, Math.max(0, rowIdx + step[0]));
  const nextCol = Math.min(columns.length - 1, Math.max(0, colIdx + step[1]));
  return { itemId: rows[nextRow].id, colKey: columns[nextCol] };
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
  colKey: string,
  columns: readonly string[] = SELECTABLE_COLS
): RangeEdges | null {
  if (!rangeKeys.has(cellKey(itemId, colKey))) return null;
  const rowIdx = rows.findIndex(r => r.id === itemId);
  const colIdx = columns.indexOf(colKey);
  if (rowIdx < 0 || colIdx < 0) return null;

  const prevRow = rowIdx > 0 ? rows[rowIdx - 1] : null;
  const nextRow = rowIdx < rows.length - 1 ? rows[rowIdx + 1] : null;
  const leftCol = colIdx > 0 ? columns[colIdx - 1] : null;
  const rightCol = colIdx < columns.length - 1 ? columns[colIdx + 1] : null;

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
  itemId: string,
  columns: readonly string[] = SELECTABLE_COLS
): Record<string, RangeEdges> {
  const out: Record<string, RangeEdges> = {};
  for (const col of columns) {
    const edges = rangeEdgesForCell(rows, rangeKeys, itemId, col, columns);
    if (edges) out[col] = edges;
  }
  return out;
}
