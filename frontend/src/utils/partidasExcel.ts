import * as XLSX from 'xlsx';
import { PartidaRecord } from '../types/takeoff';

/**
 * Generates and downloads the official Excel Template for Partidas.
 */
export function downloadPartidasTemplateXlsx(): void {
  const headers = [
    'ACTIVIDAD',
    'AREA',
    'ITEM',
    'FORECAST DESCRIPTION',
    'DESCRIPCIÓN',
    'UND'
  ];

  const sampleRows = [
    ['PAT', '3300', '01.01.01', 'POZO A TIERRA TIPO VERTICAL CON CAJA DE REGISTRO', 'POZO A TIERRA TIPO VERTICAL CON CAJA DE REGISTRO', 'UND'],
    ['PAT', '3300', '01.01.02', 'CABLE DE COBRE DESNUDO 4/0 AWG', 'SUMINISTRO E INSTALACIÓN DE CONDUCTOR DE COBRE DESNUDO 4/0 AWG', 'M'],
    ['PAT', '3300', '01.01.03', 'SOLDADURA EXOTÉRMICA TIPO T', 'CONEXIÓN EXOTÉRMICA TIPO T', 'UND'],
    ['PAT', '3400', '01.02.01', 'POZO A TIERRA TIPO VERTICAL CON CAJA DE REGISTRO', 'POZO A TIERRA TIPO VERTICAL CON CAJA DE REGISTRO', 'UND'],
    ['PAT', '3400', '01.02.02', 'CABLE DE COBRE DESNUDO 4/0 AWG', 'SUMINISTRO E INSTALACIÓN DE CONDUCTOR DE COBRE DESNUDO 4/0 AWG', 'M'],
    ['INST', '300', '02.01.01', 'CANALIZADO CON TUBO PVC-P 2" D', 'CANALIZACIÓN SUBTERRÁNEA CON TUBERÍA PVC SAP 2"', 'M']
  ];

  const wsData = [headers, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 14 }, // ACTIVIDAD
    { wch: 12 }, // AREA
    { wch: 16 }, // ITEM
    { wch: 45 }, // FORECAST DESCRIPTION
    { wch: 55 }, // DESCRIPCIÓN
    { wch: 10 }  // UND
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Partidas');
  XLSX.writeFile(wb, 'plantilla_partidas_master.xlsx');
}

/**
 * Parses an uploaded Partidas Excel file (.xlsx, .xlsb, .xls) into PartidaRecord[]
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

  for (const row of rawRows) {
    // Normalise keys by removing accents and lowercasing
    const normalizedRow: Record<string, string> = {};
    for (const [key, val] of Object.entries(row)) {
      const cleanKey = key
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      normalizedRow[cleanKey] = String(val !== undefined && val !== null ? val : '').trim();
    }

    const actividad =
      normalizedRow['ACTIVIDAD'] ||
      normalizedRow['ACT'] ||
      'PAT';

    const area =
      normalizedRow['AREA'] ||
      normalizedRow['ZONA'] ||
      '';

    const item =
      normalizedRow['ITEM'] ||
      normalizedRow['PARTIDA'] ||
      normalizedRow['CODIGO'] ||
      normalizedRow['NRO'] ||
      '';

    const forecastDesc =
      normalizedRow['FORECAST DESCRIPTION'] ||
      normalizedRow['FORECAST_DESCRIPTION'] ||
      normalizedRow['FORECAST'] ||
      normalizedRow['DESCRIPCION FORECAST'] ||
      normalizedRow['DESCRIPCION CORTA'] ||
      '';

    const descripcion =
      normalizedRow['DESCRIPCION'] ||
      normalizedRow['DESCRIPCION OFICIAL'] ||
      normalizedRow['DESCRIPTION'] ||
      forecastDesc;

    const und =
      normalizedRow['UND'] ||
      normalizedRow['UNIDAD'] ||
      normalizedRow['UNIT'] ||
      'UND';

    // Only add if it has at least an ITEM code and description or area
    if (item || descripcion || forecastDesc) {
      partidas.push({
        actividad: actividad.toUpperCase(),
        area: String(area).trim(),
        item: String(item).trim(),
        forecastDesc: String(forecastDesc).trim(),
        descripcion: String(descripcion).trim(),
        und: String(und).toUpperCase().trim()
      });
    }
  }

  if (partidas.length === 0) {
    throw new Error('No se encontraron registros de partidas válidos en el archivo Excel.');
  }

  return partidas;
}

