import { TakeoffItem, MaterialType } from '../../takeoff-item/model/types';
import { TakeoffRule, DetalleVariantItem } from './types';
import { uid } from '../../../shared/lib/uid';
import { generateTagUnico } from '../../takeoff-item/model/tagGenerator';
import { isPrimaryMaterial, getAbsoluteUnit } from '../../takeoff-item/model/materialClassifier';
import {
  DYNAMIC_DETALLE_VARIANTS,
  DYNAMIC_BARRA_POT_VARIANTS,
  DYNAMIC_BARRA_INST_VARIANTS,
  getCalculatedVariantItems,
  shouldAutoManageTuberia
} from './detalleVariants';
import {
  DEFAULT_CABLE_TRAY_MATRIX,
  getCableTrayMatrixValue
} from './cableTrayRules';
import { normalizeDetalle, SOLDADURA_DETALLE_SPECS } from './detalleRegistry';
import { SEED_RULES, SEED_CANALIZADO_RULES } from './seedRules';

export interface RebuildExtras {
  numSoportes?: number;
  numJumpers?: number;
  incluirTuberia?: boolean;
  cableTrayWidth?: string;
  rules?: TakeoffRule[];
}

export interface BomLine {
  desc: string;
  qty: number | string;
  unit: string;
  material?: MaterialType;
  metradoOt?: string;
  ruleId: string;
}

function up(s: string | undefined): string {
  return (s || '').toUpperCase();
}

function has(desc: string, token: string): boolean {
  return up(desc).includes(token.toUpperCase());
}

function allRules(extra: TakeoffRule[] | undefined): TakeoffRule[] {
  return [...(extra || []), ...SEED_RULES, ...SEED_CANALIZADO_RULES];
}

function findRule(ruleId: string, extras?: TakeoffRule[]): TakeoffRule | undefined {
  return allRules(extras).find(r => r.id === ruleId);
}

function findRuleByDetalle(detalle: string, extras?: TakeoffRule[]): TakeoffRule | undefined {
  const norm = normalizeDetalle(detalle);
  if (!norm) return undefined;
  return allRules(extras).find(r => r.detalle && normalizeDetalle(r.detalle) === norm);
}

function isCableTrayRule(rule: TakeoffRule | undefined): boolean {
  if (!rule) return false;
  const upTrigger = up(rule.trigger);
  return (
    Boolean(rule.cableTrayMatrix && rule.cableTrayMatrix.length > 0) ||
    rule.id === 'r-001-2b-x1' ||
    rule.id === 'r-001-2b-x1-can' ||
    upTrigger.includes('001/2B-X1') ||
    (rule.detalle && normalizeDetalle(rule.detalle).includes('001/2B-X1'))
  );
}

function pickOt(newDesc: string, oldRows: TakeoffItem[]): string {
  const needle = up(newDesc);
  const exact = oldRows.find(r => up(r.desc) === needle);
  if (exact?.metradoOt) return exact.metradoOt;

  if (has(newDesc, 'CABLE') && !has(newDesc, 'JUMPER')) {
    const cable = oldRows.find(r => has(r.desc, 'CABLE') && !has(r.desc, 'JUMPER'));
    if (cable?.metradoOt) return cable.metradoOt;
  }
  if (has(newDesc, 'TUBERIA') || has(newDesc, 'TUBERÍA')) {
    const tub = oldRows.find(r => has(r.desc, 'TUBERIA') || has(r.desc, 'TUBERÍA'));
    if (tub?.metradoOt) return tub.metradoOt;
  }

  const roleTokens = ['SOLDADURA', 'CARGA', 'MOLDE', 'CEMENTO', 'CINTA', 'TIERRA', 'RIEL', 'BARRA'];
  for (const token of roleTokens) {
    if (!has(newDesc, token)) continue;
    const hit = oldRows.find(r => has(r.desc, token));
    if (hit?.metradoOt) return hit.metradoOt;
  }
  return '';
}

function cableOtOf(rows: TakeoffItem[]): number {
  const raw = pickOt('CABLE DESNUDO', rows);
  return parseFloat(String(raw).replace(',', '.')) || 0;
}

function inferTrayWidth(rows: TakeoffItem[]): string {
  const riel = rows.find(r => has(r.desc, 'RIEL') || has(r.desc, 'STRUT'));
  const val = parseFloat(String(riel?.metradoOt || riel?.qty || '').replace(',', '.'));
  if (val >= 1.1) return '900 mm';
  if (val >= 0.7) return '600 mm';
  if (val >= 0.55) return '450 mm';
  if (val > 0) return '300 mm';
  return '600 mm';
}

function linesFromSubitems(rule: TakeoffRule, oldRows: TakeoffItem[]): BomLine[] {
  return (rule.subitems || []).map(s => ({
    desc: s.desc,
    qty: s.qty,
    unit: s.unit,
    material: isPrimaryMaterial(s.desc),
    metradoOt: pickOt(s.desc, oldRows) || (s.ot !== undefined ? String(s.ot) : ''),
    ruleId: rule.id
  }));
}

function linesFromVariants(
  variants: DetalleVariantItem[],
  ruleId: string,
  oldRows: TakeoffItem[],
  numSoportes: number,
  numJumpers: number,
  cableVal: number,
  tuberiaOt: string
): BomLine[] {
  return variants
    .filter(v => {
      const isJumper = up(v.unit).includes('JUMPER') || has(v.desc, 'JUMPER');
      const isSoporte = up(v.unit).includes('SOPORTE') || has(v.desc, 'SOPORTE');
      if (isJumper && numJumpers <= 0) return false;
      if (isSoporte && numSoportes <= 0) return false;
      if (typeof v.qty === 'number' && v.qty <= 0) return false;
      return true;
    })
    .map(v => {
      const isJumper = up(v.unit).includes('JUMPER') || has(v.desc, 'JUMPER');
      const isSoporte = up(v.unit).includes('SOPORTE') || has(v.desc, 'SOPORTE');
      let finalQty = v.qty;
      let finalOt = v.ot !== undefined ? String(v.ot) : pickOt(v.desc, oldRows);

      if (isSoporte && typeof v.qty === 'number') {
        finalQty = parseFloat((v.qty * numSoportes).toFixed(4));
        if (typeof v.ot === 'number') finalOt = String(parseFloat((v.ot * numSoportes).toFixed(4)));
      } else if (isJumper && typeof v.qty === 'number') {
        finalQty = parseFloat((v.qty * numJumpers).toFixed(4));
        if (typeof v.ot === 'number') finalOt = String(parseFloat((v.ot * numJumpers).toFixed(4)));
      }

      if (String(finalOt).toUpperCase() === 'VAR.' || v.otDynamic === 'var') {
        if (has(v.desc, 'JUMPER')) finalOt = typeof v.ot === 'number' ? String(v.ot) : '';
        else if (has(v.desc, 'CABLE')) finalOt = cableVal ? String(cableVal) : '';
        else if (has(v.desc, 'TUBERIA') || has(v.desc, 'TUBERÍA')) finalOt = tuberiaOt;
        else finalOt = '';
      }
      if (v.qty === 'Var.') {
        if (has(v.desc, 'CABLE')) finalQty = cableVal || 1;
        else if (has(v.desc, 'TUBERIA') || has(v.desc, 'TUBERÍA')) finalQty = parseFloat(tuberiaOt) || 1;
        else finalQty = 1;
      }
      if (v.otDynamic === '1c/3m') finalOt = Math.ceil(cableVal / 3).toString();
      if (v.otDynamic === 'empty') finalOt = '';

      return {
        desc: v.desc,
        qty: finalQty,
        unit: getAbsoluteUnit(v.unit, v.desc),
        material: v.material || isPrimaryMaterial(v.desc),
        metradoOt: finalOt,
        ruleId
      };
    })
    .filter(v => typeof v.qty !== 'number' || v.qty > 0);
}

function resolveBom(
  currentRuleId: string,
  detalle: string,
  oldRows: TakeoffItem[],
  extras: RebuildExtras
): BomLine[] {
  const norm = normalizeDetalle(detalle);
  const rules = extras.rules;
  const nSop = extras.numSoportes ?? 1;
  const nJmp = extras.numJumpers ?? 1;
  const cableVal = cableOtOf(oldRows);
  const tuberiaOt = pickOt('TUBERIA', oldRows);
  const currentRule = findRule(currentRuleId, rules);
  const detalleRule = findRuleByDetalle(norm, rules);

  const soldadura = SOLDADURA_DETALLE_SPECS[norm];
  if (soldadura) {
    const rule = findRule(soldadura.ruleId, rules);
    if (rule) return linesFromSubitems(rule, oldRows).map(l => ({ ...l, ruleId: soldadura.ruleId }));
    return soldadura.descs.map(desc => ({
      desc,
      qty: has(desc, 'MOLDE') ? 0.0167 : 1,
      unit: 'und',
      material: isPrimaryMaterial(desc),
      metradoOt: pickOt(desc, oldRows) || (has(desc, 'MOLDE') ? '0.0167' : '1'),
      ruleId: soldadura.ruleId
    }));
  }

  const barraVariant =
    DYNAMIC_BARRA_POT_VARIANTS[norm] ||
    DYNAMIC_BARRA_INST_VARIANTS[norm];
  if (barraVariant && barraVariant.length > 0) {
    const ruleId =
      currentRuleId === 'r8' || currentRuleId === 'r9'
        ? currentRuleId
        : norm.startsWith('010/17C') || norm.startsWith('010/17D') || norm === '166C'
          ? 'r9'
          : 'r8';
    return barraVariant.map((v: any) => {
      const isSoporte = up(v.unit).includes('SOPORTE');
      const qty = isSoporte ? (typeof v.qty === 'number' ? v.qty * nSop : v.qty) : v.qty;
      const ot = isSoporte
        ? String(parseFloat(v.metradoOt || '1') * nSop)
        : v.metradoOt || pickOt(v.desc, oldRows);
      return {
        desc: v.desc,
        qty,
        unit: getAbsoluteUnit(v.unit, v.desc),
        material: v.material || isPrimaryMaterial(v.desc),
        metradoOt: ot,
        ruleId
      };
    });
  }

  if (
    isCableTrayRule(currentRule) ||
    isCableTrayRule(detalleRule) ||
    norm.includes('001/2B-X1')
  ) {
    const rule = isCableTrayRule(detalleRule)
      ? detalleRule
      : isCableTrayRule(currentRule)
        ? currentRule
        : findRule('r-001-2b-x1-can', rules) || findRule('r-001-2b-x1', rules);
    const matrix =
      (rule && rule.cableTrayMatrix && rule.cableTrayMatrix.length > 0
        ? rule.cableTrayMatrix
        : DEFAULT_CABLE_TRAY_MATRIX) || DEFAULT_CABLE_TRAY_MATRIX;
    const width = extras.cableTrayWidth || inferTrayWidth(oldRows);
    return matrix.map(it => {
      const val = getCableTrayMatrixValue(it, width);
      return {
        desc: it.desc,
        qty: typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.')) || 0,
        unit: it.unit,
        material: (it.material || isPrimaryMaterial(it.desc)) as MaterialType,
        metradoOt: String(val),
        ruleId: rule?.id || currentRuleId
      };
    });
  }

  const r1Detalles = new Set(['008/3A', '008/3B', '167/G1']);
  if (currentRuleId === 'r1' || r1Detalles.has(norm)) {
    const tierra = String(parseFloat((0.375 * 0.5 * cableVal).toFixed(4)));
    const cemento = String(parseFloat(((cableVal * 11.3) / 2).toFixed(4)));
    const lines: BomLine[] = [
      {
        desc: 'CABLE DESNUDO 4/0 AWG',
        qty: 'Var.',
        unit: 'm',
        material: 'P',
        metradoOt: cableVal ? String(cableVal) : pickOt('CABLE DESNUDO 4/0', oldRows),
        ruleId: 'r1'
      },
      {
        desc: 'CINTA AMARILLA',
        qty: 'Var.',
        unit: 'm',
        material: 'C',
        metradoOt: cableVal ? String(cableVal) : pickOt('CINTA AMARILLA', oldRows),
        ruleId: 'r1'
      },
      {
        desc: 'TIERRA DE CULTIVO',
        qty: 'length x 0.375 x 0.5',
        unit: 'm3',
        material: 'C',
        metradoOt: cableVal ? tierra : pickOt('TIERRA DE CULTIVO', oldRows),
        ruleId: 'r1'
      }
    ];
    if (norm === '008/3B') {
      lines.push({
        desc: 'CEMENTO GEM (11.3 Kg x bls)',
        qty: 'length x 11.3 / 2',
        unit: 'kg',
        material: 'C',
        metradoOt: cableVal ? cemento : pickOt('CEMENTO GEM', oldRows),
        ruleId: 'r1'
      });
    }
    const hadTuberia = oldRows.some(r => has(r.desc, 'TUBERIA') || has(r.desc, 'TUBERÍA'));
    if (norm === '008/3A' && (extras.incluirTuberia || hadTuberia || tuberiaOt)) {
      lines.push({
        desc: 'TUBERIA PVC SCH 80 Ø3/4"',
        qty: 'Var.',
        unit: 'm',
        material: 'P',
        metradoOt: tuberiaOt,
        ruleId: 'r1'
      });
    }
    return lines;
  }

  const cable2Variant =
    DYNAMIC_DETALLE_VARIANTS[norm] ||
    (norm === '008/5' ? DYNAMIC_DETALLE_VARIANTS['008/05'] : undefined) ||
    (norm === 'N/D' ? DYNAMIC_DETALLE_VARIANTS['ND'] : undefined) ||
    (norm.startsWith('020') ? DYNAMIC_DETALLE_VARIANTS['020'] : undefined);

  if (currentRuleId === 'r2' || cable2Variant) {
    const lines: BomLine[] = [
      {
        desc: 'CABLE DESNUDO 2/0 AWG',
        qty: 1,
        unit: 'm',
        material: 'P',
        metradoOt: cableVal ? String(cableVal) : pickOt('CABLE DESNUDO 2/0', oldRows),
        ruleId: 'r2'
      }
    ];
    const dropTuberia = norm === '153' || norm === 'NA';
    const autoTub = shouldAutoManageTuberia(norm);
    const variantHasTub = Boolean(
      cable2Variant && cable2Variant.some(v => has(v.desc, 'TUBERIA') || has(v.desc, 'TUBERÍA'))
    );
    const hadTuberia = oldRows.some(r => has(r.desc, 'TUBERIA') || has(r.desc, 'TUBERÍA'));
    if (!dropTuberia && (variantHasTub || autoTub || hadTuberia || tuberiaOt)) {
      const tubDesc = norm.startsWith('020')
        ? 'TUBERIA RIGIDA DE ACERO GALVANIZADO EN CALIENTE DE WHEATLAND"'
        : 'TUBERIA PVC SCH 80 Ø3/4"';
      lines.push({
        desc: tubDesc,
        qty: 1,
        unit: 'm',
        material: 'P',
        metradoOt: tuberiaOt,
        ruleId: 'r2'
      });
    }
    const accessories = getCalculatedVariantItems(norm, 'AREA HUMEDA', nSop, nJmp);
    const source = accessories.length > 0 ? accessories : cable2Variant || [];
    const extra = linesFromVariants(source, 'r2', oldRows, nSop, nJmp, cableVal, tuberiaOt).filter(
      l => !has(l.desc, 'CABLE DESNUDO') && !has(l.desc, 'TUBERIA') && !has(l.desc, 'TUBERÍA')
    );
    return [...lines, ...extra];
  }

  if (detalleRule) {
    return linesFromSubitems(detalleRule, oldRows);
  }

  if (currentRule) {
    return linesFromSubitems(currentRule, oldRows);
  }

  return oldRows.map(r => ({
    desc: r.desc,
    qty: r.qty,
    unit: r.unit,
    material: r.material,
    metradoOt: r.metradoOt,
    ruleId: currentRuleId
  }));
}

/**
 * Replace every row of one rule instance with the catalog BOM for the new DETALLE.
 * Descriptions are rewritten; plano / tag / rev / instanceId / cable-tubería OT stay.
 */
export function rebuildInstanceFromDetalle(
  items: TakeoffItem[],
  instanceId: string,
  newDetalle: string,
  extras: RebuildExtras = {}
): TakeoffItem[] {
  if (!instanceId) return items;
  const norm = normalizeDetalle(newDetalle);
  const oldRows = items.filter(it => it.instanceId === instanceId);
  if (oldRows.length === 0) return items;

  const firstIdx = items.findIndex(it => it.instanceId === instanceId);
  const ref = oldRows[0];
  const bom = resolveBom(ref.ruleId || '', norm, oldRows, extras);

  const nextRows: TakeoffItem[] = bom.map(line => {
    const material = (line.material || isPrimaryMaterial(line.desc)) as MaterialType;
    return {
      id: uid(),
      pkgId: ref.pkgId,
      desc: line.desc,
      qty: line.qty,
      unit: getAbsoluteUnit(line.unit, line.desc),
      notes: '',
      ruleId: line.ruleId || ref.ruleId,
      instanceId,
      material,
      plano: ref.plano,
      rev: ref.rev,
      tagPlano: ref.tagPlano,
      tagUnico: material === 'P' ? generateTagUnico(ref.plano, ref.tagPlano, 'P') : '',
      detalle: norm,
      metradoOt: line.metradoOt || ''
    };
  });

  const without = items.filter(it => it.instanceId !== instanceId);
  without.splice(firstIdx, 0, ...nextRows);
  return without;
}

export function isDetalleTriggerRow(item: TakeoffItem, items: TakeoffItem[]): boolean {
  if (item.material === 'P') return true;
  if (!item.instanceId) return false;
  const head = items.find(it => it.instanceId === item.instanceId);
  return Boolean(head && head.id === item.id);
}

export function previewInstanceBom(
  items: TakeoffItem[],
  instanceId: string,
  newDetalle: string,
  extras: RebuildExtras = {}
): BomLine[] {
  if (!instanceId) return [];
  const norm = normalizeDetalle(newDetalle);
  const oldRows = items.filter(it => (it.instanceId || it.id) === instanceId);
  if (oldRows.length === 0) return [];
  return resolveBom(oldRows[0].ruleId || '', norm, oldRows, extras);
}

export function applyInstanceDetalleChange(
  items: TakeoffItem[],
  opts: {
    instanceId: string;
    anchorItemId: string;
    newDetalle: string;
    tagPlano: string;
    lines: BomLine[];
  }
): TakeoffItem[] {
  const { instanceId, anchorItemId, tagPlano, lines } = opts;
  if (!instanceId || lines.length === 0) return items;

  const norm = normalizeDetalle(opts.newDetalle);
  const oldRows = items.filter(it => (it.instanceId || it.id) === instanceId);
  const ref = oldRows.find(r => r.id === anchorItemId) || oldRows[0];
  if (!ref) return items;

  const nextRows: TakeoffItem[] = lines.map((line, index) => {
    const material = (line.material || isPrimaryMaterial(line.desc)) as MaterialType;
    return {
      id: index === 0 ? anchorItemId : uid(),
      pkgId: ref.pkgId,
      desc: line.desc,
      qty: line.qty,
      unit: getAbsoluteUnit(line.unit, line.desc),
      notes: index === 0 ? ref.notes || '' : '',
      ruleId: line.ruleId || ref.ruleId,
      instanceId,
      material,
      plano: ref.plano,
      rev: ref.rev,
      tagPlano,
      tagUnico: material === 'P' ? generateTagUnico(ref.plano, tagPlano, 'P') : '',
      detalle: norm,
      metradoOt: line.metradoOt || ''
    };
  });

  const anchorIdx = items.findIndex(it => it.id === anchorItemId);
  const without = items.filter(it => (it.instanceId || it.id) !== instanceId);
  const removedBefore = items
    .slice(0, Math.max(0, anchorIdx))
    .filter(it => (it.instanceId || it.id) === instanceId).length;
  const insertAt = Math.max(0, (anchorIdx < 0 ? without.length : anchorIdx) - removedBefore);
  without.splice(insertAt, 0, ...nextRows);
  return without;
}

export function syncInstanceFields(
  items: TakeoffItem[],
  instanceId: string,
  fields: Partial<Pick<TakeoffItem, 'tagPlano' | 'plano' | 'rev'>>
): TakeoffItem[] {
  if (!instanceId) return items;
  return items.map(it => {
    if (it.instanceId !== instanceId) return it;
    const plano = fields.plano !== undefined ? fields.plano : it.plano;
    const tagPlano = fields.tagPlano !== undefined ? fields.tagPlano : it.tagPlano;
    const rev = fields.rev !== undefined ? fields.rev : it.rev;
    return {
      ...it,
      plano,
      tagPlano,
      rev,
      tagUnico: it.material === 'P' ? generateTagUnico(plano, tagPlano, 'P') : ''
    };
  });
}

export function instanceIdsForItemIds(items: TakeoffItem[], itemIds: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of itemIds) {
    const it = items.find(row => row.id === id);
    if (!it) continue;
    const key = it.instanceId || it.id;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }
  return result;
}
