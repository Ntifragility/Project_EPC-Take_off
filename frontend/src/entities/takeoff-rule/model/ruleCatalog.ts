import { componentClass } from '../../takeoff-item/model/materialClassifier';
import { inferRuleAreas } from './areaCatalog';
import { DEFAULT_CABLE_TRAY_MATRIX } from './cableTrayRules';
import {
  BARRA_INST_VARIANTS_HUMEDA,
  BARRA_POT_VARIANTS_HUMEDA,
  DETALLE_VARIANTS_BY_AREA
} from './detalleVariants';
import { SEED_CANALIZADO_RULES, SEED_RULES } from './seedRules';
import { CableTrayMatrixItem, DetalleVariantItem, RuleSubitem, TakeoffRule } from './types';

export type RuleKind = 'items' | 'detalle' | 'cable_tray';

export interface RuleHeaderRecord {
  id: string;
  section: string;
  trigger: string;
  detalle: string | null;
  tag_prefix: string | null;
  areas: string[];
  order_index: number;
  kind: RuleKind;
  subitems: RuleSubitem[];
}

export interface RuleItemRecord {
  id: string;
  rule_id: string;
  order_index: number;
  descripcion: string;
  qty: string;
  unit: string;
  material: 'P' | 'C';
  formula: string;
  optional: boolean;
}

export interface CableTrayRecord {
  id: string;
  rule_id: string;
  order_index: number;
  descripcion: string;
  unit: string;
  material: 'P' | 'C';
  w900: string;
  w600: string;
  w450: string;
  w300: string;
}

export interface DetalleVariantRecord {
  id: string;
  area: string;
  category: 'CABLE_2_0' | 'BARRA_POT' | 'BARRA_INST';
  detalle_code: string;
  items: DetalleVariantItem[];
}

const OPTIONAL_TUBERIA = 'TUBERIA PVC SCH 80 Ø3/4"';

function textQty(qty: number | string | undefined): string {
  if (qty === undefined || qty === null) return '';
  return String(qty);
}

function formulaFor(desc: string, qty: string): string {
  const up = desc.toUpperCase();
  if (up.includes('CINTA AMARILLA')) return 'length';
  if (up.includes('TIERRA DE CULTIVO') && qty.toLowerCase().includes('length')) return qty;
  if (up.includes('CEMENTO GEM') && qty.toLowerCase().includes('length')) return qty;
  if (qty.toLowerCase().includes('length') || qty.toLowerCase().includes('var')) return qty.toLowerCase().includes('length') ? qty : '';
  return '';
}

function ruleKind(rule: TakeoffRule): RuleKind {
  if (rule.cableTrayMatrix && rule.cableTrayMatrix.length > 0) return 'cable_tray';
  if (rule.id === 'r2' || rule.id === 'r8' || rule.id === 'r9') return 'detalle';
  return 'items';
}

export function ruleHeader(rule: TakeoffRule, section: string, orderIndex: number): RuleHeaderRecord {
  return {
    id: rule.id,
    section,
    trigger: rule.trigger,
    detalle: rule.detalle || null,
    tag_prefix: rule.tagPrefix || null,
    areas: inferRuleAreas(rule),
    order_index: orderIndex,
    kind: ruleKind(rule),
    subitems: rule.subitems
  };
}

export function ruleItemRows(rule: TakeoffRule): RuleItemRecord[] {
  const rows = rule.subitems.map((item, index) => {
    const qty = textQty(item.qty);
    const formula = item.formula || formulaFor(item.desc, qty);
    return {
      id: `${rule.id}:${item.id || index}`,
      rule_id: rule.id,
      order_index: index,
      descripcion: item.desc,
      qty,
      unit: item.unit,
      material: item.material || componentClass(item.desc),
      formula,
      optional: Boolean(item.optional)
    };
  });

  const isCable40 = rule.trigger.toUpperCase().includes('CABLE DESNUDO 4/0');
  const hasTuberia = rows.some(row => row.descripcion.toUpperCase().includes('TUBERIA') || row.descripcion.toUpperCase().includes('TUBERÍA'));
  if (isCable40 && !hasTuberia) {
    rows.push({
      id: `${rule.id}:tuberia-opcional`,
      rule_id: rule.id,
      order_index: rows.length,
      descripcion: OPTIONAL_TUBERIA,
      qty: '',
      unit: 'm',
      material: 'P',
      formula: '',
      optional: true
    });
  }
  return rows;
}

export function cableTrayRows(rule: TakeoffRule): CableTrayRecord[] {
  const matrix = rule.cableTrayMatrix && rule.cableTrayMatrix.length > 0 ? rule.cableTrayMatrix : [];
  return matrix.map((item, index) => ({
    id: `${rule.id}:ct:${item.id || index}`,
    rule_id: rule.id,
    order_index: index,
    descripcion: item.desc,
    unit: item.unit,
    material: item.material || componentClass(item.desc),
    w900: textQty(item.w900),
    w600: textQty(item.w600),
    w450: textQty(item.w450),
    w300: textQty(item.w300)
  }));
}

function variantItems(items: Array<DetalleVariantItem & { metradoOt?: string }>): DetalleVariantItem[] {
  return items.map(item => ({
    desc: item.desc,
    qty: item.qty,
    unit: item.unit,
    ot: item.metradoOt ?? item.ot ?? item.qty,
    otDynamic: item.otDynamic,
    formula: item.formula,
    material: item.material || componentClass(item.desc)
  }));
}

export function detalleVariantRows(): DetalleVariantRecord[] {
  const rows: DetalleVariantRecord[] = [];
  for (const [area, byCode] of Object.entries(DETALLE_VARIANTS_BY_AREA)) {
    const storedArea = area.toUpperCase().includes('HUEM') || area.toUpperCase().includes('HUMED') ? 'AREA HUMEDA' : 'AREA SECA';
    for (const [code, items] of Object.entries(byCode)) {
      rows.push({
        id: `${storedArea}_CABLE_2_0_${code}`,
        area: storedArea,
        category: 'CABLE_2_0',
        detalle_code: code,
        items: variantItems(items)
      });
    }
  }
  for (const [code, items] of Object.entries(BARRA_POT_VARIANTS_HUMEDA)) {
    rows.push({
      id: `AREA HUMEDA_BARRA_POT_${code}`,
      area: 'AREA HUMEDA',
      category: 'BARRA_POT',
      detalle_code: code,
      items: variantItems(items)
    });
  }
  for (const [code, items] of Object.entries(BARRA_INST_VARIANTS_HUMEDA)) {
    rows.push({
      id: `AREA HUMEDA_BARRA_INST_${code}`,
      area: 'AREA HUMEDA',
      category: 'BARRA_INST',
      detalle_code: code,
      items: variantItems(items)
    });
  }
  return rows;
}

export function catalogRules(): { section: string; rules: TakeoffRule[] }[] {
  const tray = SEED_CANALIZADO_RULES.find(rule => rule.id === 'r-001-2b-x1-can');
  const canalizado = SEED_CANALIZADO_RULES.map(rule =>
    rule.id === 'r-001-2b-x1-can' && (!rule.cableTrayMatrix || rule.cableTrayMatrix.length === 0)
      ? { ...rule, cableTrayMatrix: DEFAULT_CABLE_TRAY_MATRIX }
      : rule
  );
  return [
    { section: 'pat', rules: SEED_RULES },
    { section: 'canalizado', rules: tray ? canalizado : SEED_CANALIZADO_RULES }
  ];
}

export function hydrateRules(rules: TakeoffRule[], items: RuleItemRecord[], matrix: CableTrayRecord[]): TakeoffRule[] {
  const itemsByRule = new Map<string, RuleItemRecord[]>();
  items.forEach(item => {
    const list = itemsByRule.get(item.rule_id) || [];
    list.push(item);
    itemsByRule.set(item.rule_id, list);
  });
  const matrixByRule = new Map<string, CableTrayRecord[]>();
  matrix.forEach(row => {
    const list = matrixByRule.get(row.rule_id) || [];
    list.push(row);
    matrixByRule.set(row.rule_id, list);
  });

  return rules.map(rule => {
    const lines = (itemsByRule.get(rule.id) || []).sort((a, b) => a.order_index - b.order_index);
    const tray = (matrixByRule.get(rule.id) || []).sort((a, b) => a.order_index - b.order_index);
    const subitems = lines.filter(line => !line.optional).map(line => toSubitem(line));
    const cableTrayMatrix = tray.length > 0 ? tray.map(toMatrixItem) : rule.cableTrayMatrix;
    return {
      ...rule,
      subitems: subitems.length > 0 ? subitems : rule.subitems,
      cableTrayMatrix
    };
  });
}

function toSubitem(line: RuleItemRecord): RuleSubitem {
  const numeric = Number(line.qty);
  const qty = line.qty !== '' && Number.isFinite(numeric) && String(numeric) === line.qty ? numeric : line.qty;
  return {
    id: line.id.split(':').slice(1).join(':') || line.id,
    desc: line.descripcion,
    qty,
    unit: line.unit,
    material: line.material,
    formula: line.formula || undefined,
    optional: line.optional
  };
}

function toMatrixItem(row: CableTrayRecord): CableTrayMatrixItem {
  return {
    id: row.id,
    desc: row.descripcion,
    unit: row.unit,
    material: row.material,
    w900: row.w900,
    w600: row.w600,
    w450: row.w450,
    w300: row.w300
  };
}
