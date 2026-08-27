import * as XLSX from 'xlsx';
import { TakeoffItem, TakeoffRule } from '../types/takeoff';
import { hasJumperItems, hasSoporteItems } from '../data/detalleVariants';
import {
  uid,
  isPrimaryMaterial,
  generateTagUnico,
  applyDetalleVariant,
  applyBarraPotDetalleVariant,
  assignTagUnicoSuffixes
} from './calculations';

export interface RejectedRowInfo {
  fila: number;
  tag: string;
  longitudCable: string;
  longitudTuberia: string;
  detalle: string;
  jumpers: string;
  motivo: string;
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

  // Skip header (or detect if first row is header by checking if column 2 is not a number)
  const startIdx = isNaN(parseFloat(rows[0].split(delimiter)[1]?.trim().replace(',', '.'))) ? 1 : 0;

  // Cache user responses during batch import (keyed by detalle code)
  const jumperPromptCache: Record<string, number> = {};
  const soportesPromptCache: Record<string, number> = {};

  for (let i = startIdx; i < rows.length; i++) {
    const rawLine = rows[i];
    if (!rawLine || !rawLine.trim()) continue;
    const parts = rawLine.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
    if (parts.length < 2) continue;

    const tagRaw = parts[0].trim();
    const lengthRawStr = parts[1]?.trim() || '';
    const lengthRaw = parseFloat(lengthRawStr.replace(',', '.'));
    const tuberiaRaw = parts.length > 2 ? parts[2].trim().replace(',', '.') : '';
    const detalleRaw = parts.length > 3 ? parts[3].trim().toUpperCase() : '';
    const jumpersRaw = parts.length > 4 ? parts[4].trim() : '';
    const soportesRaw = parts.length > 5 ? parts[5].trim() : '';

    if (!tagRaw) continue;

    let ruleName: string | null = null;
    const tagUp = tagRaw.toUpperCase();

    if (tagUp.startsWith('PS')) ruleName = 'POZO SIN CAJA REGISTRO';
    else if (tagUp.startsWith('PC')) ruleName = 'POZO CON CAJA REGISTRO';
    else if (tagUp.startsWith('TT')) ruleName = 'SOLDADURA T 4/0 - 2/0';
    else if (tagUp.startsWith('T')) ruleName = 'SOLDADURA T 4/0';
    else if (tagUp.startsWith('X')) ruleName = 'SOLDADURA X 4/0';
    else if (tagUp.startsWith('C')) ruleName = 'CABLE DESNUDO 4/0 AWG';
    else if (tagUp.startsWith('M')) ruleName = 'CABLE DESNUDO 2/0 AWG';
    else if (tagUp.startsWith('BP')) ruleName = 'BARRA POT';
    else if (tagUp.startsWith('BI')) ruleName = 'BARRA INST';

    if (!ruleName) {
      rejectedRows.push({
        fila: i + 1,
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
      } else if (ruleName === 'CABLE DESNUDO 2/0 AWG' && descUp.includes('TUBERIA')) {
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
        unit: s.unit,
        notes: '',
        ruleId: rule.id,
        material: mat,
        plano: planoVal,
        rev: revVal,
        tagUnico: generateTagUnico(planoVal, tagRaw, mat),
        tagPlano: tagRaw,
        detalle: rowDetalle,
        metradoOt
      };
    });

    itemsResult.push(...batch);

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
        itemsResult = applyDetalleVariant(itemsResult, tagRaw, pkgId, rowDetalle.toUpperCase(), numSoportes, numJumpers);
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
        itemsResult = applyBarraPotDetalleVariant(itemsResult, tagRaw, pkgId, rowDetalle.toUpperCase(), numSoportes);
      }
    }

    addedCount += batch.length;
  }

  return { newItems: assignTagUnicoSuffixes(itemsResult), addedCount, rejectedRows };
}

