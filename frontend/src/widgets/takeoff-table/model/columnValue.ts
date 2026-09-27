import { TakeoffItem } from '../../../entities/takeoff-item/model/types';

export const FILTERABLE_COLUMNS = [
  'partida',
  'partidaBalance',
  'mat',
  'plano',
  'rev',
  'tagUnico',
  'tagPlano',
  'detalle',
  'desc',
  'metradoOt',
  'unit'
] as const;

export type FilterableColumn = (typeof FILTERABLE_COLUMNS)[number];

export const COLUMN_LABELS: Record<string, string> = {
  partida: 'PARTIDAS SICME',
  partidaBalance: 'PARTIDA BALANCE',
  mat: 'MAT',
  plano: 'PLANO',
  rev: 'REV',
  tagUnico: 'TAG UNICO',
  tagPlano: 'TAG EN PLANO',
  detalle: 'DETALLE',
  desc: 'DESCRIPCION',
  metradoOt: 'METRADO OT',
  unit: 'UND'
};

export const BLANK_FILTER_LABEL = '(Vacíos)';

export function columnDisplayValue(item: TakeoffItem, key: string): string {
  switch (key) {
    case 'partida':
      return (item.partida || 'NA').trim() || 'NA';
    case 'partidaBalance':
      return (item.partidaBalance || 'NA').trim() || 'NA';
    case 'mat':
      return item.material || '';
    case 'plano':
      return item.plano || '';
    case 'rev':
      return item.rev || '';
    case 'tagUnico':
      return item.tagUnico || '';
    case 'tagPlano':
      return item.tagPlano || '';
    case 'detalle':
      return item.detalle || '';
    case 'desc':
      return item.desc || '';
    case 'metradoOt':
      return item.metradoOt || '';
    case 'unit':
      return item.unit || '';
    default:
      return '';
  }
}

export function uniqueColumnValues(items: TakeoffItem[], key: string): string[] {
  const values = new Set(items.map(item => columnDisplayValue(item, key)));
  return Array.from(values).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

export function itemMatchesColumnFilters(
  item: TakeoffItem,
  columnFilters: Record<string, string[]>
): boolean {
  for (const [key, allowed] of Object.entries(columnFilters)) {
    if (!allowed) continue;
    if (!allowed.includes(columnDisplayValue(item, key))) return false;
  }
  return true;
}
