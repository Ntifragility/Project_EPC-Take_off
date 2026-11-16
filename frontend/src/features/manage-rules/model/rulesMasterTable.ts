import { AreaType, SubAreaHumeda } from '../../../shared/types/common';
import {
  CableTrayMatrixItem,
  DetalleVariantItem,
  RuleSubitem,
  TakeoffRule
} from '../../../entities/takeoff-rule/model/types';
import {
  DYNAMIC_BARRA_INST_VARIANTS,
  DYNAMIC_BARRA_POT_VARIANTS,
  DYNAMIC_DETALLE_VARIANTS_BY_AREA,
  DYNAMIC_DETALLE_VARIANTS_BY_SUBAREA
} from '../../../entities/takeoff-rule/model/detalleVariants';
import { DEFAULT_CABLE_TRAY_MATRIX } from '../../../entities/takeoff-rule/model/cableTrayRules';
import { getDefaultDetalleByRule } from '../../../entities/takeoff-rule/model/seedRules';
import { inferRuleAreas } from '../../../entities/takeoff-rule/model/areaCatalog';
import { isMetradoExpression, shownFormula, shownVariantFormula } from '../../../entities/takeoff-rule/model/metradoFormula';
import { componentClass } from '../../../entities/takeoff-item/model/materialClassifier';
import { downloadTableXlsx } from '../../../shared/lib/excelTemplates';
import { foldHeaderCell, readSheetMatrix } from '../../../shared/lib/readSheetMatrix';
import { cleanFloat } from '../../../shared/lib/cleanNumber';
import { uid } from '../../../shared/lib/uid';

export type MasterRowOrigen = 'REGLA' | 'CABLE_2_0' | 'BARRA_POT' | 'BARRA_INST' | 'MATRIZ_BANDEJA';

export interface MasterRuleRow {
  id: string;
  area: AreaType;
  subArea: SubAreaHumeda | 'TODAS';
  origen: MasterRowOrigen;
  ruleId?: string;
  ruleTrigger: string;
  tagPrefix: string;
  detalle: string;
  material: 'P' | 'C';
  desc: string;
  formulaMetrado: string;
  unit: string;
  optional: boolean;
}

export interface ParsedVariantPatch {
  area: AreaType;
  subArea?: SubAreaHumeda;
  category: 'CABLE_2_0' | 'BARRA_POT' | 'BARRA_INST';
  detalleCode: string;
  items: DetalleVariantItem[];
}

export interface MasterImportPlan {
  variants: ParsedVariantPatch[];
  updatedRules: TakeoffRule[];
  createdRules: TakeoffRule[];
  rejectedRows: { rowNumber: number; reason: string }[];
  totalRowsRead: number;
}

function isCable20Trigger(trigger: string): boolean {
  const up = (trigger || '').trim().toUpperCase();
  return up === 'CABLE DESNUDO 2/0 AWG' || up === 'CABLE DESNUDO 2/0' || up === 'CABLE 2/0 AWG';
}

function isBarraPotTrigger(trigger: string): boolean {
  const up = (trigger || '').trim().toUpperCase();
  return up === 'BARRA POT' || up === 'BARRA DE POTENCIAL' || up === 'BARRA DE POTENCIAL A TIERRA';
}

function isBarraInstTrigger(trigger: string): boolean {
  const up = (trigger || '').trim().toUpperCase();
  return up === 'BARRA INST' || up === 'BARRA DE INSTRUMENTACIÓN' || up === 'BARRA DE INSTRUMENTACION';
}

function isCableTrayRule(rule: TakeoffRule): boolean {
  return (
    Boolean(rule.cableTrayMatrix && rule.cableTrayMatrix.length > 0) ||
    rule.id === 'r-001-2b-x1' ||
    rule.id === 'r-001-2b-x1-can' ||
    rule.trigger.toUpperCase().includes('001/2B') ||
    Boolean(rule.detalle && rule.detalle.toUpperCase().includes('001/2B-X1'))
  );
}

function variantFormulaText(it: DetalleVariantItem): string {
  const f = shownVariantFormula(it);
  if (f) return f;
  if (it.ot !== undefined && String(it.ot).trim() !== '') return String(it.ot);
  if (it.qty !== undefined && String(it.qty).trim() !== '') return String(it.qty);
  return '';
}

function shouldSkipAliasDetalle(code: string, dict: Record<string, unknown>): boolean {
  if (code === '008/5' && dict['008/05']) return true;
  if (code === 'N/D' && dict['ND']) return true;
  return false;
}

function sortDetalleEntries<T>(entries: [string, T][]): [string, T][] {
  return entries.sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

export function buildMasterRuleRows(rules: TakeoffRule[]): MasterRuleRow[] {
  const rows: MasterRuleRow[] = [];

  // 1. Standard & Custom Rules (excluding specialized dynamic card anchors handled below, except custom subrules)
  for (const rule of rules) {
    const areas = inferRuleAreas(rule);

    if (isCableTrayRule(rule)) {
      const matrix = rule.cableTrayMatrix && rule.cableTrayMatrix.length > 0 ? rule.cableTrayMatrix : DEFAULT_CABLE_TRAY_MATRIX;
      const detalle = (rule.detalle || '001/2B-X1').trim();
      for (const area of areas) {
        matrix.forEach((m, idx) => {
          rows.push({
            id: `tray::${rule.id}::${area}::${idx}`,
            area,
            subArea: 'TODAS',
            origen: 'MATRIZ_BANDEJA',
            ruleId: rule.id,
            ruleTrigger: rule.trigger,
            tagPrefix: rule.tagPrefix || 'M',
            detalle,
            material: componentClass(m.desc, m.material),
            desc: m.desc,
            formulaMetrado: `W900:${m.w900} | W600:${m.w600} | W450:${m.w450} | W300:${m.w300}`,
            unit: m.unit || 'und',
            optional: false
          });
        });
      }
      continue;
    }

    // Dynamic variant anchors (r2, r8, r9) are flattened directly from the live variant registries below
    if (rule.id === 'r2' || rule.id === 'r8' || rule.id === 'r9') {
      continue;
    }

    for (const area of areas) {
      const detalle =
        (rule.areaDetalles?.[area] || rule.defaultDetalle || rule.detalle || getDefaultDetalleByRule(rule.trigger, area) || '').trim();
      const subitems = rule.subitems || [];
      subitems.forEach((sub, idx) => {
        const formula = shownFormula(sub, rule.trigger) || String(sub.qty ?? '');
        rows.push({
          id: `rule::${rule.id}::${area}::${idx}`,
          area,
          subArea: 'TODAS',
          origen: 'REGLA',
          ruleId: rule.id,
          ruleTrigger: rule.trigger,
          tagPrefix: rule.tagPrefix || 'M',
          detalle: sub.subitemDetalle || detalle,
          material: componentClass(sub.desc, sub.material),
          desc: sub.desc,
          formulaMetrado: formula,
          unit: sub.unit || 'und',
          optional: Boolean(sub.optional)
        });
      });
    }
  }

  // 2. CABLE DESNUDO 2/0 AWG variants (AREA SECA)
  const secaVariants = DYNAMIC_DETALLE_VARIANTS_BY_AREA['AREA SECA'] || {};
  for (const [code, items] of sortDetalleEntries(Object.entries(secaVariants))) {
    if (shouldSkipAliasDetalle(code, secaVariants)) continue;
    (items || []).forEach((it, idx) => {
      rows.push({
        id: `c20::SECA::${code}::${idx}`,
        area: 'AREA SECA',
        subArea: 'TODAS',
        origen: 'CABLE_2_0',
        ruleId: 'r2',
        ruleTrigger: 'CABLE DESNUDO 2/0 AWG',
        tagPrefix: 'M',
        detalle: code,
        material: componentClass(it.desc, it.material),
        desc: it.desc,
        formulaMetrado: variantFormulaText(it),
        unit: it.unit || 'und',
        optional: false
      });
    });
  }

  // 3. CABLE DESNUDO 2/0 AWG variants (AREA HUMEDA - NO_CORROSIVO & CORROSIVO)
  (['NO_CORROSIVO', 'CORROSIVO'] as SubAreaHumeda[]).forEach(subArea => {
    const dict = DYNAMIC_DETALLE_VARIANTS_BY_SUBAREA[subArea] || {};
    for (const [code, items] of sortDetalleEntries(Object.entries(dict))) {
      if (shouldSkipAliasDetalle(code, dict)) continue;
      (items || []).forEach((it, idx) => {
        rows.push({
          id: `c20::HUMEDA::${subArea}::${code}::${idx}`,
          area: 'AREA HUMEDA',
          subArea,
          origen: 'CABLE_2_0',
          ruleId: 'r2',
          ruleTrigger: 'CABLE DESNUDO 2/0 AWG',
          tagPrefix: 'M',
          detalle: code,
          material: componentClass(it.desc, it.material),
          desc: it.desc,
          formulaMetrado: variantFormulaText(it),
          unit: it.unit || 'und',
          optional: false
        });
      });
    }
  });

  // 4. BARRA POT variants (AREA HUMEDA)
  for (const [code, items] of sortDetalleEntries(Object.entries(DYNAMIC_BARRA_POT_VARIANTS))) {
    (items || []).forEach((it, idx) => {
      rows.push({
        id: `bpot::${code}::${idx}`,
        area: 'AREA HUMEDA',
        subArea: 'TODAS',
        origen: 'BARRA_POT',
        ruleId: 'r8',
        ruleTrigger: 'BARRA POT',
        tagPrefix: 'BP',
        detalle: code,
        material: componentClass(it.desc, it.material),
        desc: it.desc,
        formulaMetrado: it.formula || String(it.metradoOt ?? it.qty ?? ''),
        unit: it.unit || 'und',
        optional: false
      });
    });
  }

  // 5. BARRA INST variants (AREA HUMEDA)
  for (const [code, items] of sortDetalleEntries(Object.entries(DYNAMIC_BARRA_INST_VARIANTS))) {
    (items || []).forEach((it, idx) => {
      rows.push({
        id: `binst::${code}::${idx}`,
        area: 'AREA HUMEDA',
        subArea: 'TODAS',
        origen: 'BARRA_INST',
        ruleId: 'r9',
        ruleTrigger: 'BARRA INST',
        tagPrefix: 'BI',
        detalle: code,
        material: componentClass(it.desc, it.material),
        desc: it.desc,
        formulaMetrado: it.formula || String(it.metradoOt ?? it.qty ?? ''),
        unit: it.unit || 'und',
        optional: false
      });
    });
  }

  return rows;
}

export async function exportMasterRulesExcel(rows: MasterRuleRow[]): Promise<void> {
  if (rows.length === 0) return;

  const headers = [
    'N°',
    'AREA',
    'SUBAREA',
    'ORIGEN',
    'REGLA',
    'PREFIJO_TAG',
    'DETALLE',
    'MAT',
    'DESCRIPCION',
    'FORMULA_METRADO',
    'UNIDAD',
    'OPCIONAL'
  ];

  const body = rows.map((row, index) => [
    index + 1,
    row.area,
    row.subArea,
    row.origen,
    row.ruleTrigger,
    row.tagPrefix,
    row.detalle,
    row.material,
    row.desc,
    row.formulaMetrado,
    row.unit,
    row.optional ? 'SI' : 'NO'
  ]);

  const dateStr = new Date().toISOString().slice(0, 10);
  await downloadTableXlsx({
    sheetName: 'Reglas_y_Detalles',
    tableName: 'REGLAS_DETALLES',
    headers,
    rows: body,
    widths: [6, 15, 16, 16, 28, 12, 14, 7, 54, 24, 12, 10],
    fileName: `reglas_detalles_maestro_${dateStr}.xlsx`,
    showRowStripes: false,
    rowFills: rows.map(r => (r.material === 'C' ? 'FFF0F8F4' : 'FFFFFFFF'))
  });
}

function normalizeImportedArea(raw: string): AreaType {
  const up = raw.trim().toUpperCase();
  return up.includes('HUMED') || up.includes('HUEMD') ? 'AREA HUMEDA' : 'AREA SECA';
}

function normalizeImportedSubArea(raw: string, area: AreaType): SubAreaHumeda | undefined {
  if (area !== 'AREA HUMEDA') return undefined;
  const up = raw.trim().toUpperCase();
  if (up === 'CORROSIVO' || up === 'CORROSIVA') return 'CORROSIVO';
  if (up === 'NO_CORROSIVO' || up === 'NO CORROSIVO') return 'NO_CORROSIVO';
  return undefined;
}

function normalizeOrigen(raw: string, trigger: string, detalle: string, formula: string): MasterRowOrigen {
  const up = raw.trim().toUpperCase();
  if (up === 'CABLE_2_0' || up === 'BARRA_POT' || up === 'BARRA_INST' || up === 'MATRIZ_BANDEJA' || up === 'REGLA') {
    return up;
  }
  if (/W900\s*:.*W600\s*:/i.test(formula) || detalle.toUpperCase().includes('001/2B')) {
    return 'MATRIZ_BANDEJA';
  }
  if (isCable20Trigger(trigger) && detalle) return 'CABLE_2_0';
  if (isBarraPotTrigger(trigger) && detalle) return 'BARRA_POT';
  if (isBarraInstTrigger(trigger) && detalle) return 'BARRA_INST';
  return 'REGLA';
}

function parseFormulaValue(formulaRaw: string): { qty: number | string; formula: string; otDynamic?: string } {
  const trimmed = formulaRaw.trim();
  if (!trimmed || /^var\.?$/i.test(trimmed)) {
    return { qty: 'Var.', formula: '', otDynamic: 'empty' };
  }
  const normalizedNum = trimmed.replace(',', '.');
  if (/^-?\d+(\.\d+)?$/.test(normalizedNum)) {
    const n = cleanFloat(Number(normalizedNum));
    return { qty: n, formula: String(n) };
  }
  if (/ceil\s*\(/i.test(trimmed)) {
    return { qty: 1, formula: trimmed, otDynamic: '1c/3m' };
  }
  return {
    qty: isMetradoExpression(trimmed) ? trimmed : 1,
    formula: trimmed
  };
}

function parseCableTrayMatrixFormula(formula: string): Pick<CableTrayMatrixItem, 'w900' | 'w600' | 'w450' | 'w300'> {
  const grab = (key: string) => {
    const m = new RegExp(`${key}\\s*:\\s*([^|]+)`, 'i').exec(formula);
    const val = m ? m[1].trim() : '';
    const num = Number(val.replace(',', '.'));
    return val !== '' && !isNaN(num) ? cleanFloat(num) : val;
  };
  return {
    w900: grab('W900'),
    w600: grab('W600'),
    w450: grab('W450'),
    w300: grab('W300')
  };
}

export async function parseMasterRulesExcel(
  file: File,
  existingRules: TakeoffRule[]
): Promise<MasterImportPlan> {
  const matrix = await readSheetMatrix(file);
  const rejectedRows: { rowNumber: number; reason: string }[] = [];

  if (matrix.length < 2) {
    return {
      variants: [],
      updatedRules: [],
      createdRules: [],
      rejectedRows: [{ rowNumber: 1, reason: 'La hoja está vacía o no contiene filas de datos' }],
      totalRowsRead: 0
    };
  }

  let headerRowIdx = -1;
  const colIdx = {
    area: -1,
    subArea: -1,
    origen: -1,
    regla: -1,
    prefix: -1,
    detalle: -1,
    mat: -1,
    desc: -1,
    formula: -1,
    unit: -1,
    optional: -1
  };

  for (let r = 0; r < Math.min(10, matrix.length); r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;
    const candidate = { ...colIdx };
    row.forEach((cell, idx) => {
      const h = foldHeaderCell(cell);
      if (!h) return;
      if (h === 'AREA' && candidate.area === -1) candidate.area = idx;
      else if ((h === 'SUBAREA' || h === 'SUB_AREA') && candidate.subArea === -1) candidate.subArea = idx;
      else if ((h === 'ORIGEN' || h === 'CATEGORIA') && candidate.origen === -1) candidate.origen = idx;
      else if ((h === 'REGLA' || h === 'DISPARADOR' || h === 'TRIGGER') && candidate.regla === -1) candidate.regla = idx;
      else if ((h === 'PREFIJO_TAG' || h === 'PREFIJO' || h === 'TAG_PREFIX') && candidate.prefix === -1) candidate.prefix = idx;
      else if ((h === 'DETALLE' || h === 'CODIGO_DETALLE') && candidate.detalle === -1) candidate.detalle = idx;
      else if ((h === 'MAT' || h === 'MATERIAL') && candidate.mat === -1) candidate.mat = idx;
      else if ((h === 'DESCRIPCION' || h === 'INSUMO' || h === 'DESCRIPCION_MATERIAL') && candidate.desc === -1) candidate.desc = idx;
      else if (
        (h === 'FORMULA_METRADO' || h === 'FORMULA' || h === 'METRADO' || h === 'CANTIDAD' || h === 'QTY') &&
        candidate.formula === -1
      ) {
        candidate.formula = idx;
      } else if ((h === 'UNIDAD' || h === 'UND' || h === 'UNIT') && candidate.unit === -1) candidate.unit = idx;
      else if ((h === 'OPCIONAL' || h === 'OPTIONAL') && candidate.optional === -1) candidate.optional = idx;
    });
    if (candidate.regla !== -1 && candidate.desc !== -1) {
      headerRowIdx = r;
      Object.assign(colIdx, candidate);
      break;
    }
  }

  if (headerRowIdx === -1) {
    return {
      variants: [],
      updatedRules: [],
      createdRules: [],
      rejectedRows: [{ rowNumber: 1, reason: 'No se encontraron las columnas obligatorias REGLA y DESCRIPCION' }],
      totalRowsRead: 0
    };
  }

  const variantGroups = new Map<string, ParsedVariantPatch>();
  const ruleGroups = new Map<
    string,
    {
      trigger: string;
      area: AreaType;
      origen: 'REGLA' | 'MATRIZ_BANDEJA';
      tagPrefix: string;
      detalle: string;
      subitems: RuleSubitem[];
      trayItems: CableTrayMatrixItem[];
    }
  >();

  let totalRowsRead = 0;

  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const raw = matrix[r];
    if (!Array.isArray(raw) || raw.every(c => String(c ?? '').trim() === '')) continue;
    totalRowsRead += 1;

    const get = (idx: number) => (idx !== -1 && raw[idx] !== undefined ? String(raw[idx]).trim() : '');

    const area = normalizeImportedArea(get(colIdx.area) || 'AREA SECA');
    const subArea = normalizeImportedSubArea(get(colIdx.subArea), area);
    const trigger = get(colIdx.regla);
    const desc = get(colIdx.desc);
    const detalle = get(colIdx.detalle).toUpperCase();
    const formula = get(colIdx.formula);
    const unit = get(colIdx.unit) || 'und';
    const tagPrefix = (get(colIdx.prefix) || 'M').toUpperCase();
    const matRaw = get(colIdx.mat).toUpperCase();
    const material: 'P' | 'C' = matRaw.startsWith('P') ? 'P' : matRaw.startsWith('C') ? 'C' : componentClass(desc);
    const optional = /^(SI|S|YES|TRUE|1)$/i.test(get(colIdx.optional));

    if (!trigger) {
      rejectedRows.push({ rowNumber: r + 1, reason: 'Columna REGLA vacía' });
      continue;
    }
    if (!desc) {
      rejectedRows.push({ rowNumber: r + 1, reason: `Falta DESCRIPCION en regla "${trigger}"` });
      continue;
    }

    const origen = normalizeOrigen(get(colIdx.origen), trigger, detalle, formula);

    if (origen === 'CABLE_2_0' || origen === 'BARRA_POT' || origen === 'BARRA_INST') {
      if (!detalle) {
        rejectedRows.push({ rowNumber: r + 1, reason: `Variante ${origen} requiere código DETALLE` });
        continue;
      }
      const key = `${area}::${subArea || 'ALL'}::${origen}::${detalle}`;
      const existing = variantGroups.get(key) || {
        area,
        subArea,
        category: origen,
        detalleCode: detalle,
        items: []
      };
      const parsedFormula = parseFormulaValue(formula);
      existing.items.push({
        desc,
        qty: parsedFormula.qty,
        unit,
        ot: typeof parsedFormula.qty === 'number' ? parsedFormula.qty : parsedFormula.formula || 'Var.',
        otDynamic: parsedFormula.otDynamic,
        formula: parsedFormula.formula || undefined,
        material
      });
      variantGroups.set(key, existing);
      continue;
    }

    const ruleKey = `${trigger.trim().toUpperCase()}::${origen}`;
    const existingRuleGroup = ruleGroups.get(ruleKey) || {
      trigger: trigger.trim(),
      area,
      origen: origen === 'MATRIZ_BANDEJA' ? 'MATRIZ_BANDEJA' : 'REGLA',
      tagPrefix,
      detalle,
      subitems: [],
      trayItems: []
    };

    if (origen === 'MATRIZ_BANDEJA') {
      const widths = parseCableTrayMatrixFormula(formula);
      existingRuleGroup.trayItems.push({
        id: uid(),
        desc,
        unit,
        material,
        ...widths
      });
    } else {
      const parsedFormula = parseFormulaValue(formula);
      existingRuleGroup.subitems.push({
        id: uid(),
        desc,
        qty: parsedFormula.qty,
        unit,
        formula: parsedFormula.formula || undefined,
        material,
        optional
      });
    }

    if (!existingRuleGroup.detalle && detalle) existingRuleGroup.detalle = detalle;
    ruleGroups.set(ruleKey, existingRuleGroup);
  }

  const updatedRules: TakeoffRule[] = [];
  const createdRules: TakeoffRule[] = [];

  for (const grp of ruleGroups.values()) {
    const match = existingRules.find(
      r => r.trigger.trim().toUpperCase() === grp.trigger.toUpperCase()
    );
    if (match) {
      if (grp.origen === 'MATRIZ_BANDEJA') {
        updatedRules.push({
          ...match,
          detalle: grp.detalle || match.detalle,
          cableTrayMatrix: grp.trayItems
        });
      } else {
        const nextAreaDetalles = { ...(match.areaDetalles || {}) };
        if (grp.detalle) nextAreaDetalles[grp.area] = grp.detalle;
        updatedRules.push({
          ...match,
          tagPrefix: grp.tagPrefix || match.tagPrefix,
          detalle: grp.detalle || match.detalle,
          areaDetalles: nextAreaDetalles,
          subitems: grp.subitems
        });
      }
    } else {
      const derivedSubitems: RuleSubitem[] =
        grp.subitems.length > 0
          ? grp.subitems
          : grp.trayItems.map(t => ({
              id: t.id || uid(),
              desc: t.desc,
              qty: 1,
              unit: t.unit,
              material: t.material || 'C'
            }));
      createdRules.push({
        id: uid(),
        trigger: grp.trigger,
        tagPrefix: grp.tagPrefix || 'M',
        detalle: grp.detalle || '',
        defaultDetalle: grp.detalle || '',
        allowDetalleEdit: true,
        areas: [grp.area],
        areaDetalles: grp.detalle ? { [grp.area]: grp.detalle } : {},
        subitems: derivedSubitems,
        cableTrayMatrix: grp.origen === 'MATRIZ_BANDEJA' ? grp.trayItems : undefined
      });
    }
  }

  return {
    variants: Array.from(variantGroups.values()),
    updatedRules,
    createdRules,
    rejectedRows,
    totalRowsRead
  };
}
