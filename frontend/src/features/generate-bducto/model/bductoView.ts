import { BductoKind, BductoRow } from '../../../entities/bducto/model/types';

export type BductoDetailView = 'separated' | 'merged';
export type BductoAccessoryView = 'separated' | 'joined';

/** A table row. Merged rows point back at the stored rows they add up. */
export interface BductoDisplayRow extends BductoRow {
  viewMemberIds?: string[];
  /** group: one tramo, plano and rev still edit. locked: several tramos, read-only. */
  viewEdit?: 'group' | 'locked';
}

const ACCESSORY_KINDS = new Set<BductoKind>(['terminal', 'union', 'adaptador', 'cinta']);

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function sharedText(rows: BductoRow[], pick: (row: BductoRow) => string): string {
  const first = pick(rows[0]);
  return rows.every(row => pick(row) === first) ? first : '';
}

function sharedTag(tags: string[]): string {
  const filled = [...new Set(tags.filter(Boolean))];
  if (filled.length === 0) return '';
  if (filled.length === 1) return filled[0];
  const stems = filled.map(tag => tag.replace(/\.\d+$/, ''));
  return new Set(stems).size === 1 ? stems[0] : '';
}

function toDisplay(group: BductoRow[]): BductoDisplayRow {
  if (group.length === 1) return group[0];
  const first = group[0];
  const sourceIds = new Set(group.map(row => row.sourceId));
  return {
    ...first,
    id: `view:${group.map(row => row.id).join('|')}`,
    plano: sharedText(group, row => row.plano),
    rev: sharedText(group, row => row.rev),
    seccion: sharedText(group, row => row.seccion),
    desde: sharedText(group, row => row.desde),
    hasta: sharedText(group, row => row.hasta),
    wbs: sharedText(group, row => row.wbs),
    tagUnico: sharedTag(group.map(row => row.tagUnico)),
    comentario: sharedText(group, row => row.comentario),
    longitudM: round2(group.reduce((sum, row) => sum + row.longitudM, 0)),
    cantXd: round2(group.reduce((sum, row) => sum + row.cantXd, 0)),
    metrado: round2(group.reduce((sum, row) => sum + row.metrado, 0)),
    viewMemberIds: group.map(row => row.id),
    viewEdit: sourceIds.size === 1 ? 'group' : 'locked'
  };
}

/**
 * Separado keeps every generated row.
 * Consolidado folds the measured rows of one tramo that share material.
 * Unidos folds terminal, unión, adaptador and cinta that share material, across tramos.
 */
export function presentBductoRows(
  rows: BductoRow[],
  detail: BductoDetailView,
  accessories: BductoAccessoryView
): BductoDisplayRow[] {
  const buckets = new Map<string, BductoRow[]>();
  const order: string[] = [];
  for (const row of rows) {
    const accessory = ACCESSORY_KINDS.has(row.kind);
    const merge = accessory ? accessories === 'joined' : detail === 'merged';
    const key = !merge
      ? `row\u0000${row.id}`
      : accessory
        ? ['acc', row.kind, row.descripcion, row.diametro, row.und].join('\u0000')
        : ['det', row.sourceId, row.kind, row.descripcion, row.diametro, row.und].join('\u0000');
    const bucket = buckets.get(key);
    if (!bucket) {
      buckets.set(key, [row]);
      order.push(key);
    } else {
      bucket.push(row);
    }
  }
  return order.map(key => toDisplay(buckets.get(key) ?? []));
}
