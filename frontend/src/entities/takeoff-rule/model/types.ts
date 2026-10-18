import { AreaType, SectionType } from '../../../shared/types/common';
import { MaterialType } from '../../takeoff-item/model/types';
export type { MaterialType };

export interface DetalleDefinition {
  code: string;
  section: SectionType;
  area: AreaType | string;
  description?: string;
  drawingReference?: string;
}

export interface RuleSubitem {
  id: string;
  desc: string;
  qty: number | string;
  unit: string;
  ot?: number | string;
  otDynamic?: string | boolean;
  material?: MaterialType;
  /** Stored formula or expression. */
  formula?: string;
  optional?: boolean;
  /** Specific detail code override if this subitem points to a distinct detail drawing */
  subitemDetalle?: string;
  ruleId?: string;
  orderIndex?: number;
}

export interface RuleItemOverride {
  id: string;
  ruleItemId: string;
  detalleCode: string;
  overrideDescripcion?: string;
  overrideQty?: string;
  overrideUnit?: string;
  overrideFormula?: string;
}

export interface RuleParameterOption {
  id: string;
  ruleId: string;
  paramKey: string;       // e.g. 'width'
  optionLabel: string;    // e.g. '900 mm'
  optionValue: string;    // e.g. '900'
  multiplierMap: Record<string, number | string>; // item_id -> quantity multiplier or value
}

export interface CableTrayMatrixItem {
  id?: string;
  desc: string;
  unit: string;
  material?: MaterialType;
  w900: string | number;
  w600: string | number;
  w450: string | number;
  w300: string | number;
}

export interface TakeoffRule {
  id: string;
  section?: SectionType | string;
  trigger: string;
  subitems: RuleSubitem[];
  detalle?: string;
  defaultDetalle?: string;
  tagPrefix?: string;
  allowDetalleEdit?: boolean;
  hasDimensionParam?: boolean;
  dimensionParamName?: string;
  cableTrayMatrix?: CableTrayMatrixItem[];
  overrides?: RuleItemOverride[];
  parameterOptions?: RuleParameterOption[];
  areas?: AreaType[];
  areaDetalles?: Record<string, string>;
  orderIndex?: number;
}

export type UnifiedTakeoffRule = TakeoffRule;

export interface DetalleVariantItem {
  desc: string;
  qty: number | string;
  unit: string;
  ot?: number | string;
  otDynamic?: string | boolean;
  material?: MaterialType;
  formula?: string;
}

export interface ApplyRuleContext {
  ruleId: string;
  pkgId?: string;
  plano?: string;
  rev?: string;
  area: AreaType;
  detalleCode: string;     // Universal for every rule
  count: number;
  baseTag?: string;
  selectedDimension?: string; // e.g. '900 mm'
  optionalItemIds?: string[];
  cableLength?: string;
  numSoportes?: number;
  numJumpers?: number;
  incluirTuberia?: boolean;
}
