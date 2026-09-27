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
