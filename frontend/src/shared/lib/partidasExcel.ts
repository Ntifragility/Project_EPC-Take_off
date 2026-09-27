import * as XLSX from 'xlsx';
import { PartidaRecord } from '../../entities/partida/model/types';
import { downloadTableXlsx } from './excelTemplates';

/**
 * Generates and downloads the official Excel Template for Partidas.
 * Master layout (lives in Supabase `partidas_table`):
 * ACTIVIDAD | WBS | PARTIDA SICME | PARTIDA BALANCE | FORECAST DESCRIPTION | DESCRIPCIÓN BM | UND
 */
export async function downloadPartidasTemplateXlsx(): Promise<void> {
  const headers = [
    'ACTIVIDAD',
    'WBS',
    'PARTIDA SICME',
    'PARTIDA BALANCE',
    'FORECAST DESCRIPTION',
    'DESCRIPCIÓN BM',
    'UND'
  ];

  const rows: (string | number)[][] = [
    ['PAT', '3000', '1.2', 'NA', 'ANCLAJE 3/8" TIPO HDI DE ACERO INOXIDABLE', 'NA', 'UND'],
    ['PAT', '3000', '6.3', '2.1.25', 'CABLE DESNUDO 4/0 AWG', 'Malla de Tierra - Cable Cu desnudo # 4/0 AWG', 'M'],
    ['PAT', '3000', '7.9', 'PDN.0.0.1', 'CEMENTO GEM (11.3 kg x bls)', 'Preparación y aplicación CEMENTO GEM (11.3 kg x bls)', 'KG'],
    ['PAT', '3300', '01.01.01', 'NA', 'POZO A TIERRA TIPO VERTICAL CON CAJA DE REGISTRO', 'POZO A TIERRA TIPO VERTICAL CON CAJA DE REGISTRO', 'UND']
  ];

  const widths = [14, 10, 16, 18, 55, 55, 10];

  await downloadTableXlsx({
    sheetName: 'Partidas',
    tableName: 'PARTIDAS',
    headers,
    rows,
    widths,
    fileName: 'plantilla_partidas_master.xlsx'
  });
}

/**
 * Parses an uploaded Partidas Excel file (.xlsx, .xlsb, .xls) into PartidaRecord[].
 * Accepts the 7-column master layout, with fallback to the legacy
 * AREA / ITEM / DESCRIPCIÓN layout.
 */
export async function parsePartidasExcelFile(file: File): Promise<PartidaRecord[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  if (workbook.SheetNames.length === 0) {
    throw new Error('El archivo Excel no contiene hojas de cálculo.');
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to array of objects
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

  if (rawRows.length === 0) {
    throw new Error('La hoja de cálculo está vacía.');
  }

  const partidas: PartidaRecord[] = [];

  const pickByFragment = (row: Record<string, string>, ...fragments: string[]): string => {
    for (const [key, val] of Object.entries(row)) {
      if (val === '') continue;
      const hit = fragments.some(f => key === f || key.includes(f));
      if (hit) return val;
    }
    return '';
  };

  for (const row of rawRows) {
    const normalizedRow: Record<string, string> = {};
    for (const [key, val] of Object.entries(row)) {
      const cleanKey = key
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      normalizedRow[cleanKey] = String(val !== undefined && val !== null ? val : '').trim();
    }

    const actividad =
      normalizedRow['ACTIVIDAD'] ||
      normalizedRow['ACT'] ||
      'PAT';

    const wbs =
      normalizedRow['WBS'] ||
      normalizedRow['AREA'] ||
      normalizedRow['ZONA'] ||
      pickByFragment(normalizedRow, 'WBS') ||
      '';

    // Tolerant: file headers vary (PARTIDA SICME / PARTIDAS SICME / SICME / ITEM...)
    const partidaSicme =
      normalizedRow['PARTIDA SICME'] ||
      normalizedRow['PARTIDAS SICME'] ||
      normalizedRow['PARTIDA SICME '] ||
      normalizedRow['SICME'] ||
      normalizedRow['ITEM'] ||
      normalizedRow['PARTIDA'] ||
      normalizedRow['CODIGO'] ||
      normalizedRow['NRO'] ||
      pickByFragment(normalizedRow, 'SICME') ||
      '';

    const partidaBalance =
      normalizedRow['PARTIDA BALANCE'] ||
      normalizedRow['PARTIDAS BALANCE'] ||
      normalizedRow['BALANCE'] ||
      normalizedRow['PARTIDA BM'] ||
      pickByFragment(normalizedRow, 'BALANCE') ||
      'NA';

    const forecastDesc =
      normalizedRow['FORECAST DESCRIPTION'] ||
      normalizedRow['CAST DESCRIP'] ||
      normalizedRow['FORECAST'] ||
      normalizedRow['DESCRIPCION FORECAST'] ||
      normalizedRow['DESCRIPCION CORTA'] ||
      pickByFragment(normalizedRow, 'FORECAST') ||
      '';

    const descripcionBm =
      normalizedRow['DESCRIPCION BM'] ||
      normalizedRow['DESCRIPCION B'] ||
      normalizedRow['DESCRIPCION OFICIAL'] ||
      normalizedRow['DESCRIPCION'] ||
      normalizedRow['DESCRIPTION'] ||
      pickByFragment(normalizedRow, 'DESCRIPCION BM', 'DESCRIPCION B') ||
      forecastDesc;

    const und =
      normalizedRow['UND'] ||
      normalizedRow['UNIDAD'] ||
      normalizedRow['UNIT'] ||
      'UND';

    if (partidaSicme || partidaBalance !== 'NA' || descripcionBm || forecastDesc) {
      partidas.push({
        actividad: actividad.toUpperCase(),
        wbs: String(wbs).trim(),
        area: String(wbs).trim(),
        partidaSicme: String(partidaSicme).trim(),
        item: String(partidaSicme).trim(),
        partidaBalance: String(partidaBalance || 'NA').trim() || 'NA',
        forecastDesc: String(forecastDesc).trim(),
        descripcionBm: String(descripcionBm).trim(),
        descripcion: String(descripcionBm).trim(),
        und: String(und).toUpperCase().trim()
      });
    }
  }

  if (partidas.length === 0) {
    throw new Error('No se encontraron registros de partidas válidos en el archivo Excel.');
  }

  return partidas;
}
