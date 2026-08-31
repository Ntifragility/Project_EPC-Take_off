import * as XLSX from 'xlsx';
import { TakeoffItem, TakeoffRule } from '../types/takeoff';
import { hasJumperItems, hasSoporteItems } from '../data/detalleVariants';
import {
  uid,
  isPrimaryMaterial,
  generateTagUnico,
  applyDetalleVariant,
  applyBarraPotDetalleVariant,
  assignTagUnicoSuffixes,
  getAbsoluteUnit
} from './calculations';

export interface RejectedRowInfo {
  fila: number;
  plano?: string;
  tag: string;
  longitudCable: string;
  longitudTuberia: string;
  detalle: string;
  jumpers: string;
  motivo: string;
}

function getRuleNameByTag(tag: string): string | null {
  if (!tag) return null;
  const tagUp = tag.trim().toUpperCase();
  if (tagUp.startsWith('PS')) return 'POZO SIN CAJA REGISTRO';
  if (tagUp.startsWith('PC')) return 'POZO CON CAJA REGISTRO';
  if (tagUp.startsWith('TT')) return 'SOLDADURA T 4/0 -2/0';
  if (tagUp.startsWith('T')) return 'SOLDADURA T 4/0';
  if (tagUp.startsWith('X')) return 'SOLDADURA X 4/0';
  if (tagUp.startsWith('C')) return 'CABLE DESNUDO 4/0 AWG';
  if (tagUp.startsWith('M')) return 'CABLE DESNUDO 2/0 AWG';
  if (tagUp.startsWith('BP')) return 'BARRA POT';
  if (tagUp.startsWith('BI')) return 'BARRA INST';
  return null;
}

export interface ColumnMapping {
  planoIdx: number;
  tagIdx: number;
  cableIdx: number;
  tuberiaIdx: number;
  detalleIdx: number;
  jumpersIdx: number;
  soportesIdx: number;
}

export function cleanHeader(cell: any): string {
  if (cell === null || cell === undefined) return '';
  return String(cell)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function detectColumnMapping(headerRow: any[]): ColumnMapping | null {
  if (!Array.isArray(headerRow) || headerRow.length === 0) return null;

  const mapping: ColumnMapping = {
    planoIdx: -1,
    tagIdx: -1,
    cableIdx: -1,
    tuberiaIdx: -1,
    detalleIdx: -1,
    jumpersIdx: -1,
    soportesIdx: -1
  };

  headerRow.forEach((cell, idx) => {
    const h = cleanHeader(cell);
    if (!h) return;

    if (h === 'PLANO' || h === 'CODIGO_PLANO' || h === 'PLAN' || h === 'DWG' || h === 'DRAWING' || h === 'PLANO_BASE') {
      if (mapping.planoIdx === -1) mapping.planoIdx = idx;
    } else if (h === 'TAG' || h === 'TAG_PLANO' || h === 'TAGS' || h === 'ETIQUETA' || h === 'CODIGO_TAG') {
      if (mapping.tagIdx === -1) mapping.tagIdx = idx;
    } else if (
      h === 'LONGITUD_TUBERIA' ||
      h === 'TUBERIA' ||
      h === 'TUBERIA_PVC' ||
      h === 'CONDUIT' ||
      h === 'PIPE' ||
      h === 'LONG_TUBERIA' ||
      h === 'M_TUBERIA'
    ) {
      if (mapping.tuberiaIdx === -1) mapping.tuberiaIdx = idx;
    } else if (
      h === 'LONGITUD_CABLE' ||
      h === 'LONGITUD' ||
      h === 'CANTIDAD' ||
      h === 'CANTIDAD_O_LONGITUD' ||
      h === 'METRADO' ||
      h === 'QTY' ||
      h === 'CANT' ||
      h === 'LONG' ||
      h === 'LONG_CABLE' ||
      h === 'M_CABLE' ||
      h === 'CABLE'
    ) {
      if (mapping.cableIdx === -1) mapping.cableIdx = idx;
    } else if (
      h === 'DETALLE' ||
      h === 'DET' ||
      h === 'DETALLE_CONSTRUCTIVO' ||
      h === 'CODIGO_DETALLE' ||
      h === 'DETALLES'
    ) {
      if (mapping.detalleIdx === -1) mapping.detalleIdx = idx;
    } else if (h === 'JUMPERS' || h === 'JUMPER' || h === 'CANT_JUMPERS' || h === 'NUM_JUMPERS') {
      if (mapping.jumpersIdx === -1) mapping.jumpersIdx = idx;
    } else if (h === 'SOPORTES' || h === 'SOPORTE' || h === 'CANT_SOPORTES' || h === 'NUM_SOPORTES') {
      if (mapping.soportesIdx === -1) mapping.soportesIdx = idx;
    }
  });

  // A valid column mapping MUST have at least the TAG column
  if (mapping.tagIdx !== -1) {
    return mapping;
  }
  return null;
}

export async function convertSpreadsheetToCsvText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!['xlsx', 'xlsb', 'xls', 'xlsm'].includes(ext)) {
    throw new Error('Formato no permitido. Solo se aceptan archivos Excel (.xlsx, .xlsb, .xls)');
  }
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) return '';

  const normalizedRows: string[] = [
    'PLANO;TAG;LONGITUD_CABLE;LONGITUD_TUBERIA;DETALLE;JUMPERS;SOPORTES'
  ];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
    if (!rawData || rawData.length === 0) continue;

    // Search the first 15 rows for a recognized header row
    let headerRowIdx = -1;
    let mapping: ColumnMapping | null = null;

    for (let r = 0; r < Math.min(15, rawData.length); r++) {
      const row = rawData[r];
      if (Array.isArray(row) && row.length > 0) {
        const m = detectColumnMapping(row);
        if (m) {
          headerRowIdx = r;
          mapping = m;
          break;
        }
      }
    }

    if (mapping && headerRowIdx !== -1) {
      for (let r = headerRowIdx + 1; r < rawData.length; r++) {
        const row = rawData[r];
        if (!row || !Array.isArray(row) || row.length === 0) continue;

        const tag = mapping.tagIdx !== -1 && row[mapping.tagIdx] !== undefined ? String(row[mapping.tagIdx]).trim() : '';
        if (!tag) continue;

        const plano = mapping.planoIdx !== -1 && row[mapping.planoIdx] !== undefined ? String(row[mapping.planoIdx]).trim() : '';
        const cable = mapping.cableIdx !== -1 && row[mapping.cableIdx] !== undefined ? String(row[mapping.cableIdx]).trim() : '';
        const tuberia = mapping.tuberiaIdx !== -1 && row[mapping.tuberiaIdx] !== undefined ? String(row[mapping.tuberiaIdx]).trim() : '';
        const detalle = mapping.detalleIdx !== -1 && row[mapping.detalleIdx] !== undefined ? String(row[mapping.detalleIdx]).trim() : '';
        const jumpers = mapping.jumpersIdx !== -1 && row[mapping.jumpersIdx] !== undefined ? String(row[mapping.jumpersIdx]).trim() : '';
        const soportes = mapping.soportesIdx !== -1 && row[mapping.soportesIdx] !== undefined ? String(row[mapping.soportesIdx]).trim() : '';

        let effCable = cable;
        const ruleName = getRuleNameByTag(tag);
        if (!effCable && ruleName && (ruleName.includes('SOLDADURA') || ruleName.includes('POZO') || ruleName.startsWith('BARRA'))) {
          effCable = '1';
        }

        normalizedRows.push(
          `${plano};${tag};${effCable};${tuberia};${detalle};${jumpers};${soportes}`
        );
      }
    } else {
      // Positional fallback for sheets without explicit headers
      for (let r = 0; r < rawData.length; r++) {
        const row = rawData[r];
        if (!row || !Array.isArray(row) || row.length === 0) continue;

        const col0 = String(row[0] || '').trim();
        const col1 = String(row[1] || '').trim();
        const ruleFromCol1 = getRuleNameByTag(col1);
        const ruleFromCol0 = getRuleNameByTag(col0);

        if (ruleFromCol1) {
          const plano = col0;
          const tag = col1;
          const cable = String(row[2] || '').trim();
          const tuberia = String(row[3] || '').trim();
          const detalle = String(row[4] || '').trim();
          const jumpers = String(row[5] || '').trim();
          const soportes = String(row[6] || '').trim();
          normalizedRows.push(`${plano};${tag};${cable};${tuberia};${detalle};${jumpers};${soportes}`);
        } else if (ruleFromCol0) {
          const plano = '';
          const tag = col0;
          const cable = String(row[1] || '').trim();
          const tuberia = String(row[2] || '').trim();
          const detalle = String(row[3] || '').trim();
          const jumpers = String(row[4] || '').trim();
          const soportes = String(row[5] || '').trim();
          normalizedRows.push(`${plano};${tag};${cable};${tuberia};${detalle};${jumpers};${soportes}`);
        }
      }
    }
  }

  return normalizedRows.length > 1 ? normalizedRows.join('\n') : '';
}

export function parseTakeoffCsv(
  csvText: string,
  rules: TakeoffRule[],
  pkgId: string,
  planoVal: string,
  revVal: string,
  existingItems: TakeoffItem[] = [],
  activeArea: 'AREA SECA' | 'AREA HUMEDA' = 'AREA SECA'
): { newItems: TakeoffItem[]; addedCount: number; rejectedRows: RejectedRowInfo[] } {
  const rejectedRows: RejectedRowInfo[] = [];
  let itemsResult: TakeoffItem[] = [...existingItems];
  let addedCount = 0;

  const rows = csvText.split(/\r?\n/).filter(r => r.trim().length > 0);
  if (rows.length === 0) return { newItems: itemsResult, addedCount: 0, rejectedRows };

  // Detect delimiter
  let delimiter = ';';
  const firstRow = rows[0];
  if (firstRow.includes(';') && !firstRow.includes('\t')) {
    delimiter = ';';
  } else if (firstRow.includes('\t')) {
    delimiter = '\t';
  } else if (firstRow.includes(',') && !firstRow.includes(';')) {
    delimiter = ',';
  }

  // Detect header row and column mapping
  const firstParts = rows[0].split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
  const headerMapping = detectColumnMapping(firstParts);
  const startIdx = headerMapping
    ? 1
    : firstParts.some(p => {
        const up = p.toUpperCase();
        return up.includes('PLANO') || up.includes('TAG') || up.includes('LONGITUD') || up.includes('CANTIDAD') || up.includes('DETALLE');
      }) ||
      (isNaN(parseFloat(firstParts[1]?.replace(',', '.'))) && isNaN(parseFloat(firstParts[2]?.replace(',', '.'))))
    ? 1
    : 0;

  // Cache user responses during batch import (keyed by detalle code)
  const jumperPromptCache: Record<string, number> = {};
  const soportesPromptCache: Record<string, number> = {};

  for (let i = startIdx; i < rows.length; i++) {
    const rawLine = rows[i];
    if (!rawLine || !rawLine.trim()) continue;
    const parts = rawLine.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
    if (parts.length < 2) continue;

    let planoRow = '';
    let tagRaw = '';
    let lengthRawStr = '';
    let tuberiaRaw = '';
    let detalleRaw = '';
    let jumpersRaw = '';
    let soportesRaw = '';

    if (headerMapping) {
      planoRow = headerMapping.planoIdx !== -1 && parts[headerMapping.planoIdx] !== undefined ? parts[headerMapping.planoIdx].trim() : '';
      tagRaw = headerMapping.tagIdx !== -1 && parts[headerMapping.tagIdx] !== undefined ? parts[headerMapping.tagIdx].trim() : '';
      lengthRawStr = headerMapping.cableIdx !== -1 && parts[headerMapping.cableIdx] !== undefined ? parts[headerMapping.cableIdx].trim() : '';
      tuberiaRaw = headerMapping.tuberiaIdx !== -1 && parts[headerMapping.tuberiaIdx] !== undefined ? parts[headerMapping.tuberiaIdx].trim().replace(',', '.') : '';
      detalleRaw = headerMapping.detalleIdx !== -1 && parts[headerMapping.detalleIdx] !== undefined ? parts[headerMapping.detalleIdx].trim().toUpperCase() : '';
      jumpersRaw = headerMapping.jumpersIdx !== -1 && parts[headerMapping.jumpersIdx] !== undefined ? parts[headerMapping.jumpersIdx].trim() : '';
      soportesRaw = headerMapping.soportesIdx !== -1 && parts[headerMapping.soportesIdx] !== undefined ? parts[headerMapping.soportesIdx].trim() : '';
    } else {
      const ruleFromCol1 = parts.length > 1 ? getRuleNameByTag(parts[1]) : null;
      const ruleFromCol0 = parts.length > 0 ? getRuleNameByTag(parts[0]) : null;

      if (ruleFromCol1) {
        // 7-column layout: [PLANO, TAG, LONGITUD_CABLE, LONGITUD_TUBERIA, DETALLE, JUMPERS, SOPORTES]
        planoRow = parts[0].trim();
        tagRaw = parts[1].trim();
        lengthRawStr = parts[2]?.trim() || '';
        tuberiaRaw = parts.length > 3 ? parts[3].trim().replace(',', '.') : '';
        detalleRaw = parts.length > 4 ? parts[4].trim().toUpperCase() : '';
        jumpersRaw = parts.length > 5 ? parts[5].trim() : '';
        soportesRaw = parts.length > 6 ? parts[6].trim() : '';
      } else if (ruleFromCol0) {
        // 6-column layout: [TAG, LONGITUD_CABLE, LONGITUD_TUBERIA, DETALLE, JUMPERS, SOPORTES]
        planoRow = '';
        tagRaw = parts[0].trim();
        lengthRawStr = parts[1]?.trim() || '';
        tuberiaRaw = parts.length > 2 ? parts[2].trim().replace(',', '.') : '';
        detalleRaw = parts.length > 3 ? parts[3].trim().toUpperCase() : '';
        jumpersRaw = parts.length > 4 ? parts[4].trim() : '';
        soportesRaw = parts.length > 5 ? parts[5].trim() : '';
      } else {
        // Fallback
        planoRow = parts[0].trim();
        tagRaw = parts[1]?.trim() || parts[0].trim();
        lengthRawStr = parts[2]?.trim() || parts[1]?.trim() || '';
        tuberiaRaw = parts.length > 3 ? parts[3].trim().replace(',', '.') : '';
        detalleRaw = parts.length > 4 ? parts[4].trim().toUpperCase() : '';
        jumpersRaw = parts.length > 5 ? parts[5].trim() : '';
        soportesRaw = parts.length > 6 ? parts[6].trim() : '';
      }
    }

    if (!tagRaw) continue;

    const ruleName = getRuleNameByTag(tagRaw);
    const effectivePlano = (planoRow || planoVal || '').toUpperCase();

    // Default quantity 1 for items measured in units (soldaduras, pozos, barras) if column is empty
    if (
      (!lengthRawStr || isNaN(parseFloat(lengthRawStr.replace(',', '.')))) &&
      ruleName &&
      (ruleName.includes('SOLDADURA') || ruleName.includes('POZO') || ruleName.startsWith('BARRA'))
    ) {
      lengthRawStr = '1';
    }

    const lengthRaw = parseFloat(lengthRawStr.replace(',', '.'));

    if (!ruleName) {
      rejectedRows.push({
        fila: i + 1,
        plano: planoRow,
        tag: tagRaw,
        longitudCable: lengthRawStr,
        longitudTuberia: tuberiaRaw,
        detalle: detalleRaw,
        jumpers: jumpersRaw,
        motivo: `Prefijo no reconocido (debe comenzar con M, C, BP, BI, T, TT, X, PC o PS)`
      });
      continue;
    }

    if (isNaN(lengthRaw)) {
      rejectedRows.push({
        fila: i + 1,
        plano: planoRow,
        tag: tagRaw,
        longitudCable: lengthRawStr,
        longitudTuberia: tuberiaRaw,
        detalle: detalleRaw,
        jumpers: jumpersRaw,
        motivo: 'Valor no numérico en columna LONGITUD_CABLE'
      });
      continue;
    }

    const rule = rules.find(r => r.trigger === ruleName);
    if (!rule) {
      rejectedRows.push({
        fila: i + 1,
        plano: planoRow,
        tag: tagRaw,
        longitudCable: lengthRawStr,
        longitudTuberia: tuberiaRaw,
        detalle: detalleRaw,
        jumpers: jumpersRaw,
        motivo: `Regla de metrado "${ruleName}" no encontrada en la configuración actual`
      });
      continue;
    }

    const batch: TakeoffItem[] = rule.subitems.map(s => {
      const mat = isPrimaryMaterial(s.desc) ? 'P' : 'C';
      let metradoOt = '';
      const descUp = s.desc.toUpperCase();
      const isPozoRule = ruleName && ruleName.toUpperCase().includes('POZO');

      if (isPozoRule && descUp.includes('TIERRA DE CULTIVO')) {
        metradoOt = '4.71';
      } else if (isPozoRule && descUp.includes('CEMENTO GEM')) {
        metradoOt = '22.6';
      } else if (descUp.includes('TIERRA DE CULTIVO')) {
        metradoOt = String(Math.ceil(0.375 * 0.5 * lengthRaw * 10) / 10);
      } else if (descUp.includes('MOLDE')) {
        metradoOt = '0.0167';
      } else if (descUp.includes('TUBERIA') || descUp.includes('TUBERÍA')) {
        metradoOt = (tuberiaRaw !== '' && !isNaN(parseFloat(tuberiaRaw))) ? String(parseFloat(tuberiaRaw)) : '';
      } else if (
        ruleName === 'CABLE DESNUDO 2/0 AWG' &&
        (descUp.includes('TERMINAL') || descUp.includes('PERNO') || descUp.includes('SOLDADURA') || descUp.includes('CARGA'))
      ) {
        metradoOt = '1';
      } else if (ruleName && (ruleName.toUpperCase().includes('SOLDADURA') || isPozoRule || ruleName.startsWith('BARRA'))) {
        metradoOt = '1';
      } else {
        metradoOt = String(lengthRaw);
      }

      const rowDetalle = detalleRaw || (
        tagRaw.startsWith('TT') ? (activeArea === 'AREA HUMEDA' ? '008/4T2' : '167/X2') :
        tagRaw.startsWith('T') ? (activeArea === 'AREA HUMEDA' ? '008/4T1' : '167/X1') :
        tagRaw.startsWith('C') ? (activeArea === 'AREA HUMEDA' ? '008/3A' : '167/G1') :
        (tagRaw.startsWith('M') ? 'ND' :
        (tagRaw.startsWith('BP') ? (activeArea === 'AREA HUMEDA' ? '010/17A' : '166A') :
        (tagRaw.startsWith('BI') ? (activeArea === 'AREA HUMEDA' ? '010/17C' : '166C') : '')))
      );

      return {
        id: uid(),
        pkgId,
        desc: s.desc,
        qty: s.qty,
        unit: getAbsoluteUnit(s.unit, s.desc),
        notes: '',
        ruleId: rule.id,
        material: mat,
        plano: effectivePlano,
        rev: revVal,
        tagUnico: mat === 'P' ? generateTagUnico(effectivePlano, tagRaw, 'P') : '',
        tagPlano: tagRaw,
        detalle: rowDetalle,
        metradoOt
      };
    });

    let processedBatch: TakeoffItem[] = batch;

    if (rule.id === 'r1' || rule.id === 'r2') {
      const rowDetalle = detalleRaw || (
        tagRaw.startsWith('C') ? '167/G1' :
        (tagRaw.startsWith('M') ? (activeArea === 'AREA HUMEDA' ? 'ND' : '151') : '')
      );
      if (rowDetalle) {
        let numSoportes = 0;
        if (soportesRaw && !isNaN(parseInt(soportesRaw, 10)) && parseInt(soportesRaw, 10) > 0) {
          numSoportes = parseInt(soportesRaw, 10);
        }

        let numJumpers = 0;
        if (jumpersRaw && !isNaN(parseInt(jumpersRaw, 10)) && parseInt(jumpersRaw, 10) > 0) {
          numJumpers = parseInt(jumpersRaw, 10);
        }
        processedBatch = applyDetalleVariant(batch, tagRaw, pkgId, rowDetalle.toUpperCase(), numSoportes, numJumpers, tuberiaRaw, lengthRawStr, true);
      }
    } else if (rule.id === 'r8' || rule.id === 'r9') {
      const rowDetalle = detalleRaw || (rule.id === 'r8' ? '010/17A' : '010/17C');
      if (rowDetalle && (activeArea === 'AREA HUMEDA' || rowDetalle.startsWith('010/17'))) {
        let numSoportes = 1;
        if (soportesRaw && !isNaN(parseInt(soportesRaw, 10)) && parseInt(soportesRaw, 10) > 0) {
          numSoportes = parseInt(soportesRaw, 10);
        } else {
          // Barra details always have support items in Area Humeda
          if (soportesPromptCache[rowDetalle] !== undefined) {
            numSoportes = soportesPromptCache[rowDetalle];
          } else {
            const resp = window.prompt(
              `DETALLE ${rowDetalle}: Incluye materiales con SOPORTE y la columna 6 (SOPORTES) está vacía.\n\n¿Cuántos soportes se requieren por mecha?`,
              '1'
            );
            const val = resp !== null && !isNaN(parseInt(resp, 10)) && parseInt(resp, 10) > 0 ? parseInt(resp, 10) : 1;
            soportesPromptCache[rowDetalle] = val;
            numSoportes = val;
          }
        }
        processedBatch = applyBarraPotDetalleVariant(batch, tagRaw, pkgId, rowDetalle.toUpperCase(), numSoportes, true);
      }
    }

    itemsResult.push(...processedBatch);
    addedCount += processedBatch.length;
  }

  return { newItems: assignTagUnicoSuffixes(itemsResult), addedCount, rejectedRows };
}

