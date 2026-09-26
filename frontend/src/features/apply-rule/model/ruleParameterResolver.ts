import { TakeoffRule } from '../../../entities/takeoff-rule/model/types';
import { AreaType } from '../../../shared/types/common';
import { getDefaultTagPrefixByRule, getDefaultDetalleByRule } from '../../../entities/takeoff-rule/model/seedRules';
import { getDetallesForArea, hasSoporteItems, hasJumperItems } from '../../../entities/takeoff-rule/model/detalleVariants';

export interface RulePromptRequirements {
  isCableTray: boolean;
  isSoldadura40_20: boolean;
  isSoldadura40: boolean;
  isCable40: boolean;
  isCable20: boolean;
  isBarraPot: boolean;
  isBarraInst: boolean;
  defaultTagPrefix: string;
  defaultDetalle: string;
  availableDetalles: string[];
  requiresSoportes: boolean;
  requiresJumpers: boolean;
}

export function resolveRuleRequirements(rule: TakeoffRule, activeArea: AreaType): RulePromptRequirements {
  const triggerUp = rule.trigger.toUpperCase().trim();
  const ruleId = rule.id || '';

  const isCableTray =
    Boolean(rule.cableTrayMatrix && rule.cableTrayMatrix.length > 0) ||
    ruleId.includes('001-2b-x1') ||
    triggerUp.includes('001/2B-X1') ||
    triggerUp.includes('001/2B') ||
    Boolean(rule.detalle && rule.detalle.toUpperCase().includes('001/2B-X1'));
  const isSoldadura40_20 = triggerUp.includes('SOLDADURA T 4/0 -2/0') || triggerUp.includes('SOLDADURA T 4/0-2/0') || triggerUp.includes('SOLDADURA T 4/0  - 2/0');
  const isSoldadura40 = !isSoldadura40_20 && (triggerUp === 'SOLDADURA T 4/0' || triggerUp.startsWith('SOLDADURA T 4/0'));
  const isCable40 = triggerUp.includes('CABLE DESNUDO 4/0');
  const isCable20 = triggerUp.includes('CABLE DESNUDO 2/0');
  const isBarraPot = triggerUp.includes('BARRA POT');
  const isBarraInst = triggerUp.includes('BARRA INST');

  const defaultTagPrefix = rule.tagPrefix || getDefaultTagPrefixByRule(rule.trigger) || 'M';
  const defaultDetalle = rule.detalle || getDefaultDetalleByRule(rule.trigger, activeArea) || '';

  const areaDetalleEntries = getDetallesForArea(activeArea);
  const availableDetalles = areaDetalleEntries.map(([code]) => code);

  let requiresSoportes = false;
  let requiresJumpers = false;

  if (isCable20) {
    requiresSoportes = hasSoporteItems(defaultDetalle, activeArea);
    requiresJumpers = hasJumperItems(defaultDetalle, activeArea);
  } else if (isBarraPot || isBarraInst) {
    requiresSoportes = activeArea === 'AREA HUMEDA';
  }

  return {
    isCableTray,
    isSoldadura40_20,
    isSoldadura40,
    isCable40,
    isCable20,
    isBarraPot,
    isBarraInst,
    defaultTagPrefix,
    defaultDetalle,
    availableDetalles,
    requiresSoportes,
    requiresJumpers
  };
}
