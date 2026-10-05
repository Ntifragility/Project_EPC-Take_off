import * as XLSX from 'xlsx';

export interface ReadSheetsOptions {
  /** When true, return one matrix per sheet; otherwise only the first sheet. */
  allSheets?: boolean;
}

/**
 * Shared header folding (NFD/underscore): 'TAG EN PLANO' and 'tag-en-plano'
 * both fold to 'TAG_EN_PLANO'. Per-domain synonym tables stay with their owners.
 */
export function foldHeaderCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Pick the most frequent cell separator on the first line (;, tab or comma). */
export function sniffCsvSeparator(firstLine: string): string {
  const counts: Array<[string, number]> = [
    [';', firstLine.split(';').length - 1],
    ['\t', firstLine.split('\t').length - 1],
    [',', firstLine.split(',').length - 1]
  ];
  let best = ';';
  let bestCount = 0;
  for (const [sep, count] of counts) {
    if (count > bestCount) {
      best = sep;
      bestCount = count;
    }
  }
  return best;
}

function decodeCsvText(buffer: ArrayBuffer): string {
  return new TextDecoder('utf-8').decode(buffer).replace(/^\uFEFF/, '');
}

async function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  if (file.name.toLowerCase().endsWith('.csv')) {
    const text = decodeCsvText(await file.arrayBuffer());
    const separator = sniffCsvSeparator(text.split(/\r?\n/, 1)[0] ?? '');
    return XLSX.read(text, { type: 'string', FS: separator });
  }
  return XLSX.read(await file.arrayBuffer(), { type: 'array' });
}

function sheetMatrixOf(sheet: XLSX.WorkSheet | undefined): unknown[][] {
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true }) as unknown[][];
}

/** Raw header:1 matrices, one per sheet (or first sheet only by default). */
export async function readSheetMatrices(file: File, opts?: ReadSheetsOptions): Promise<unknown[][][]> {
  const workbook = await readWorkbook(file);
  const names = workbook.SheetNames ?? [];
  if (names.length === 0) return [];
  const picked = opts?.allSheets ? names : names.slice(0, 1);
  return picked.map(name => sheetMatrixOf(workbook.Sheets[name]));
}

/** First-sheet header:1 matrix (Excel workbook or sniffed-delimiter CSV). */
export async function readSheetMatrix(file: File): Promise<unknown[][]> {
  const matrices = await readSheetMatrices(file);
  return matrices[0] ?? [];
}
