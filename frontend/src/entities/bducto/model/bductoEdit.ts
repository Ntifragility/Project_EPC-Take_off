import { BductoRow } from './types';
import { parsePlano } from './expandBducto';

/** Columns the corner drag and the inline editor can change. Description stays fixed. */
export const BDUCTO_EDITABLE_COLUMNS = ['plano', 'rev', 'tagUnico'] as const;

export type BductoEditableColumn = (typeof BDUCTO_EDITABLE_COLUMNS)[number];

export function isBductoEditableColumn(key: string): key is BductoEditableColumn {
  return (BDUCTO_EDITABLE_COLUMNS as readonly string[]).includes(key);
}

export type BductoEditResult = { ok: true; row: BductoRow } | { ok: false; error: string };

/**
 * Applies one cell edit.
 * A new plano rewrites WBS and the tag stem (3300LY028.BD.K.1.1 → 4000LY007.BD.K.1.1).
 * The suffix after the stem stays, so each row keeps its own sequence.
 */
export function applyBductoField(row: BductoRow, key: string, raw: string): BductoEditResult {
  if (key === 'descripcion') {
    return { ok: false, error: 'La descripción no se edita.' };
  }
  if (key === 'plano') return applyPlano(row, raw);
  if (key === 'rev') return { ok: true, row: { ...row, rev: raw.trim().toUpperCase() } };
  if (key === 'tagUnico') return { ok: true, row: { ...row, tagUnico: raw.trim().toUpperCase() } };
  return { ok: false, error: 'Esa columna es de solo lectura.' };
}

/**
 * PLANO and REV belong to the whole tramo. Editing either one updates every row
 * that shares the source, and a new plano rewrites each row's own tag único.
 */
export function applyBductoGroupField(
  allRows: BductoRow[],
  seeds: BductoRow[],
  key: string,
  raw: string
): { ok: true; rows: BductoRow[] } | { ok: false; error: string } {
  const sourceIds = new Set(seeds.map(row => row.sourceId));
  const targets = key === 'plano' || key === 'rev'
    ? allRows.filter(row => sourceIds.has(row.sourceId))
    : seeds;
  const next: BductoRow[] = [];
  for (const row of targets) {
    const result = applyBductoField(row, key, raw);
    if (result.ok === false) return result;
    next.push(result.row);
  }
  return { ok: true, rows: next };
}

function applyPlano(row: BductoRow, raw: string): BductoEditResult {
  const plano = raw.trim().toUpperCase();
  const parsed = parsePlano(plano);
  if (!parsed) {
    return { ok: false, error: 'El plano debe tener la forma P22-DA-3300-07-LY-028.' };
  }
  const previous = parsePlano(row.plano);
  let tagUnico = row.tagUnico;
  if (previous && tagUnico.toUpperCase().startsWith(previous.stem)) {
    tagUnico = `${parsed.stem}${tagUnico.slice(previous.stem.length)}`;
  }
  return { ok: true, row: { ...row, plano, wbs: parsed.wbs, tagUnico } };
}
