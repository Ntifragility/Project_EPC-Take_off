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

export async function convertSpreadsheetToCsvText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!['xlsx', 'xlsb', 'xls', 'xlsm'].includes(ext)) {
    throw new Error('Formato no permitido. Solo se aceptan archivos Excel (.xlsx, .xlsb, .xls)');
  }
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return '';
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });
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

  // Detect header row by checking for header labels or non-numeric values in length columns
  const firstParts = rows[0].split(delimiter).map(p => p.trim().toUpperCase());
  const hasHeaderLabel = firstParts.some(p => p.includes('PLANO') || p.includes('TAG') || p.includes('LONGITUD') || p.includes('DETALLE'));
  const startIdx = hasHeaderLabel || isNaN(parseFloat(firstParts[1]?.replace(',', '.'))) && isNaN(parseFloat(firstParts[2]?.replace(',', '.'))) ? 1 : 0;

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

    if (!tagRaw) continue;

    const ruleName = getRuleNameByTag(tagRaw);
    const effectivePlano = (planoRow || planoVal || '').toUpperCase();
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
        tagRaw.startsWith('TT') ? '008/4T2' :
        tagRaw.startsWith('T') ? '008/4T1' :
        tagRaw.startsWith('C') ? '167/G1' :
        (tagRaw.startsWith('M') ? (activeArea === 'AREA HUMEDA' ? 'ND' : '151') :
        (tagRaw.startsWith('BP') ? '166' :
        (tagRaw.startsWith('BI') ? '166C' : '')))
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

