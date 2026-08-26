import * as XLSX from 'xlsx';
import { TakeoffItem, TakeoffRule } from '../types/takeoff';
import {
  uid,
  isPrimaryMaterial,
  generateTagUnico,
  applyDetalleVariant,
  applyBarraPotDetalleVariant,
  assignTagUnicoSuffixes
} from './calculations';

export async function convertSpreadsheetToCsvText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (['xlsx', 'xlsb', 'xls', 'xlsm'].includes(ext)) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return '';
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });
  } else {
    return await file.text();
  }
}

export function parseTakeoffCsv(
  csvText: string,
  rules: TakeoffRule[],
  pkgId: string,
  customPlano: string,
  customRev: string,
  existingItems: TakeoffItem[],
  activeArea = 'AREA HUMEDA'
): { newItems: TakeoffItem[]; addedCount: number } {
  const rows = csvText.split(/\r?\n/).filter(r => r.trim());
  if (rows.length < 2) {
    return { newItems: [], addedCount: 0 };
  }

  let itemsResult = [...existingItems];
  let addedCount = 0;
  const planoVal = (customPlano || '').toUpperCase();
  const revVal = (customRev || '').toUpperCase();

  // Detect delimiter from first row: semicolon, tab, or comma
  const firstRow = rows[0];
  let delimiter = ',';
  if (firstRow.includes(';') && (firstRow.split(';').length >= firstRow.split(',').length)) {
    delimiter = ';';
  } else if (firstRow.includes('\t')) {
    delimiter = '\t';
  }

  // Skip header (or detect if first row is header by checking if column 2 is not a number)
  const startIdx = isNaN(parseFloat(rows[0].split(delimiter)[1]?.trim().replace(',', '.'))) ? 1 : 0;

  for (let i = startIdx; i < rows.length; i++) {
    const parts = rows[i].split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
    if (parts.length < 2) continue;

    const tagRaw = parts[0].trim();
    const lengthRaw = parseFloat(parts[1].trim().replace(',', '.'));
    const tuberiaRaw = parts.length > 2 ? parts[2].trim().replace(',', '.') : '';
    const detalleRaw = parts.length > 3 ? parts[3].trim().toUpperCase() : '';
    if (!tagRaw || isNaN(lengthRaw)) continue;

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

    if (!ruleName) continue;
    const rule = rules.find(r => r.trigger === ruleName);
    if (!rule) continue;

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
        itemsResult = applyDetalleVariant(itemsResult, tagRaw, pkgId, rowDetalle.toUpperCase());
      }
    } else if (rule.id === 'r8' || rule.id === 'r9') {
      const rowDetalle = detalleRaw || (rule.id === 'r8' ? '010/17A' : '010/17C');
      if (rowDetalle && (activeArea === 'AREA HUMEDA' || rowDetalle.startsWith('010/17'))) {
        itemsResult = applyBarraPotDetalleVariant(itemsResult, tagRaw, pkgId, rowDetalle.toUpperCase(), 1);
      }
    }

    addedCount += batch.length;
  }

  return { newItems: assignTagUnicoSuffixes(itemsResult), addedCount };
}

