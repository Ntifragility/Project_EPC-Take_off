import { BductoRow } from '../../../entities/bducto/model/types';
import { downloadTableXlsx } from '../../../shared/lib/excelTemplates';

export const BDUCTO_TEMPLATE_HEADERS = ['DESDE', 'HASTA', 'PLANO', 'TAG EN PLANO', 'Quantity'] as const;

export async function downloadBductoTemplate(): Promise<void> {
  await downloadTableXlsx({
    sheetName: 'BDUCTOS',
    tableName: 'PlantillaBductos',
    headers: [...BDUCTO_TEMPLATE_HEADERS],
    rows: [['400-MH-011', '400-PRL-005', 'P22-DA-3400-07-LY-014', '1 VIA, 3", BD.C.1', 2.2]],
    widths: [18, 18, 28, 32, 14],
    fileName: 'plantilla_bductos.xlsx',
    showRowStripes: false
  });
}

export const BDUCTO_COLUMNS: { key: keyof BductoRow | 'comentario'; label: string; numeric?: boolean; width: number }[] = [
  { key: 'partidaSicme', label: 'PARTIDA SICME', width: 18 },
  { key: 'partida', label: 'PARTIDA', width: 16 },
  { key: 'sector', label: 'SECTOR', width: 12 },
  { key: 'wbs', label: 'WBS', width: 10 },
  { key: 'tagUnico', label: 'TAG UNICO', width: 28 },
  { key: 'plano', label: 'PLANO', width: 26 },
  { key: 'rev', label: 'REV', width: 8 },
  { key: 'seccion', label: 'SECCION', width: 12 },
  { key: 'desde', label: 'DESDE', width: 16 },
  { key: 'hasta', label: 'HASTA', width: 16 },
  { key: 'descripcion', label: 'DESCRIPCION DEL MATERIAL', width: 52 },
  { key: 'diametro', label: 'DIAMETRO / MATERIAL', width: 24 },
  { key: 'longitudM', label: 'LONGITUD TRAMO (m)', numeric: true, width: 18 },
  { key: 'cantXd', label: 'CANT X D', numeric: true, width: 12 },
  { key: 'metrado', label: 'METRADO', numeric: true, width: 12 },
  { key: 'und', label: 'UND', width: 8 },
  { key: 'comentario', label: 'COMENTARIO', width: 16 }
];

export function bductoComment(row: BductoRow): string {
  if (row.comentario) return row.comentario;
  return row.kind === 'elevation' ? 'VERTICAL' : '';
}

export function bductoCell(row: BductoRow, key: string): string | number {
  if (key === 'comentario') return bductoComment(row);
  const value = row[key as keyof BductoRow];
  if (typeof value === 'number' || typeof value === 'string') return value;
  return '';
}

export async function exportBductosExcel(rows: BductoRow[]): Promise<void> {
  if (rows.length === 0) return;
  // #region agent log
  fetch('http://127.0.0.1:7553/ingest/a68ab0cd-10e6-497e-8979-86720b62c569',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b40dbc'},body:JSON.stringify({sessionId:'b40dbc',location:'exportBductosExcel.ts:start',message:'export columns',data:{rowCount:rows.length,headers:BDUCTO_COLUMNS.map(column=>column.label),verticalCount:rows.filter(row=>bductoComment(row)==='VERTICAL').length},timestamp:Date.now(),hypothesisId:'C',runId:'post-fix'})}).catch(()=>{});
  // #endregion

  const dateStr = new Date().toISOString().slice(0, 10);
  const defaultName = `bductos_${dateStr}`;
  const userFileName = window.prompt('Ingresa el nombre del archivo Excel a exportar:', defaultName);
  if (userFileName === null) return;

  let finalFileName = (userFileName && userFileName.trim()) || defaultName;
  if (!finalFileName.toLowerCase().endsWith('.xlsx')) finalFileName += '.xlsx';

  await downloadTableXlsx({
    sheetName: 'BDUCTOS',
    tableName: 'BDUCTOS',
    headers: ['N°', ...BDUCTO_COLUMNS.map(column => column.label)],
    rows: rows.map((row, index) => [index + 1, ...BDUCTO_COLUMNS.map(column => bductoCell(row, column.key))]),
    widths: [6, ...BDUCTO_COLUMNS.map(column => column.width)],
    fileName: finalFileName
  });
}

export async function exportBductosSummaryExcel(rows: BductoRow[]): Promise<void> {
  if (rows.length === 0) return;
  const groups = new Map<string, { descripcion: string; diametro: string; und: string; cant: number; metrado: number }>();
  for (const row of rows) {
    const key = [row.descripcion, row.diametro, row.und].join('\u0000');
    const current = groups.get(key) ?? { descripcion: row.descripcion, diametro: row.diametro, und: row.und, cant: 0, metrado: 0 };
    current.cant = Math.round((current.cant + row.cantXd) * 100) / 100;
    current.metrado = Math.round((current.metrado + row.metrado) * 100) / 100;
    groups.set(key, current);
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const defaultName = `resumen_bductos_${dateStr}`;
  const userFileName = window.prompt('Ingresa el nombre del archivo Excel a exportar:', defaultName);
  if (userFileName === null) return;

  let finalFileName = (userFileName && userFileName.trim()) || defaultName;
  if (!finalFileName.toLowerCase().endsWith('.xlsx')) finalFileName += '.xlsx';

  const summary = [...groups.values()];
  await downloadTableXlsx({
    sheetName: 'Resumen_BDUCTOS',
    tableName: 'RESUMEN_BDUCTOS',
    headers: ['DESCRIPCION DEL MATERIAL', 'DIAMETRO / MATERIAL', 'UND', 'CANT X D', 'METRADO'],
    rows: summary.map(row => [row.descripcion, row.diametro, row.und, row.cant, row.metrado]),
    widths: [52, 24, 8, 12, 12],
    fileName: finalFileName
  });
}
