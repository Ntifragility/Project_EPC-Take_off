import { AreaType } from '../../../shared/types/common';
import { TakeoffRule } from './types';
import { DYNAMIC_DETALLE_VARIANTS_BY_AREA } from './detalleVariants';

export const ALL_AREAS: AreaType[] = ['AREA SECA', 'AREA HUMEDA'];

export function isHumedaArea(area: string | undefined | null): boolean {
  const up = String(area || '').toUpperCase();
  return up.includes('HUMED') || up.includes('HUEMD');
}

export function normalizeArea(area: string | undefined | null): AreaType {
  return isHumedaArea(area) ? 'AREA HUMEDA' : 'AREA SECA';
}

function normalizeDetalleCode(code: string): string {
  const up = String(code || '').toUpperCase().trim();
  if (up === '008/5') return '008/05';
  if (up === 'N/D') return 'ND';
  return up;
}

/**
 * Detalle codes that are not in the cable-2/0 area tables but still belong
 * to one environment (soldadura, cable 4/0, barra).
 */
const STATIC_DETALLE_AREAS: Record<string, AreaType[]> = {
  '167/G1': ['AREA SECA'],
  '167/X1': ['AREA SECA'],
  '167/X2': ['AREA SECA'],
  '166A': ['AREA SECA'],
  '166B': ['AREA SECA'],
  '166C': ['AREA SECA'],
  '008/3A': ['AREA HUMEDA'],
  '008/3B': ['AREA HUMEDA'],
  '008/4T1': ['AREA HUMEDA'],
  '008/4T2': ['AREA HUMEDA'],
  '010/17A': ['AREA HUMEDA'],
  '010/17B': ['AREA HUMEDA'],
  '010/17C': ['AREA HUMEDA'],
  '010/17D': ['AREA HUMEDA'],
  '001/2B-X1': ALL_AREAS,
  ND: ALL_AREAS,
  NA: ALL_AREAS
};

export function getDetalleAreas(code: string): AreaType[] {
  const norm = normalizeDetalleCode(code);
  if (!norm) return ALL_AREAS;
  if (STATIC_DETALLE_AREAS[norm]) return STATIC_DETALLE_AREAS[norm];

  const found: AreaType[] = [];
  for (const [rawArea, variants] of Object.entries(DYNAMIC_DETALLE_VARIANTS_BY_AREA)) {
    if (!variants[norm] && !(norm === '008/05' && variants['008/5'])) continue;
    found.push(normalizeArea(rawArea));
  }
  if (found.length === 0) return ALL_AREAS;
  return Array.from(new Set(found));
}

export function detalleBelongsToArea(code: string, area: string): boolean {
  return getDetalleAreas(code).includes(normalizeArea(area));
}

function triggerLooksHumeda(trigger: string): boolean {
  const up = (trigger || '').toUpperCase();
  return up.includes('ALTA CORROSIVA') || up.includes('AREA HUMEDA') || up.includes('ÁREA HÚMEDA');
}

function triggerLooksSeca(trigger: string): boolean {
  const up = (trigger || '').toUpperCase();
  return up.includes('AREA EXTERIOR') || up.includes('AREA SECA') || up.includes('ÁREA SECA');
}

/** Infer catalog membership when a stored rule has no `areas` field. */
export function inferRuleAreas(rule: TakeoffRule): AreaType[] {
  if (rule.areas && rule.areas.length > 0) return rule.areas;
  if (triggerLooksHumeda(rule.trigger) && !triggerLooksSeca(rule.trigger)) return ['AREA HUMEDA'];
  if (triggerLooksSeca(rule.trigger) && !triggerLooksHumeda(rule.trigger)) return ['AREA SECA'];
  return ALL_AREAS;
}

export function ruleBelongsToArea(rule: TakeoffRule, area: string): boolean {
  return inferRuleAreas(rule).includes(normalizeArea(area));
}

/** Public catalog API: rules the user may add or edit in this area. */
export function getCatalogForArea(rules: TakeoffRule[], area: string): TakeoffRule[] {
  return rules.filter(rule => ruleBelongsToArea(rule, area));
}

/** Stamp seed `areas` onto stored/cloud rules that predate the field. */
export function attachCatalogAreas(rule: TakeoffRule, seedRules: TakeoffRule[]): TakeoffRule {
  if (rule.areas && rule.areas.length > 0) return rule;
  const seed = seedRules.find(s => s.id === rule.id);
  if (seed?.areas && seed.areas.length > 0) return { ...rule, areas: seed.areas };
  return rule;
}

function matchSoldaduraT4020(trigger: string): boolean {
  const up = (trigger || '').toUpperCase().trim();
  return (
    up.includes('SOLDADURA T 4/0 -2/0') ||
    up.includes('SOLDADURA T 4/0-2/0') ||
    up.includes('SOLDADURA T 4/0  - 2/0') ||
    up.includes('SOLDADURA T 4/0 - 2/0')
  );
}

function matchSoldaduraT40(trigger: string): boolean {
  const up = (trigger || '').toUpperCase().trim();
  return !matchSoldaduraT4020(trigger) && (up === 'SOLDADURA T 4/0' || up.startsWith('SOLDADURA T 4/0'));
}

/**
 * Detalle codes offered when applying/editing a rule in the active area.
 * Never mixes húmeda and seca options in the same picker.
 */
export function getRuleDetallesForArea(
  trigger: string,
  area: string,
  fallbackDetalle = ''
): string[] {
  const a = normalizeArea(area);
  const up = (trigger || '').toUpperCase().trim();

  if (matchSoldaduraT4020(trigger)) {
    return a === 'AREA HUMEDA' ? ['008/4T2'] : ['167/X2'];
  }
  if (matchSoldaduraT40(trigger)) {
    return a === 'AREA HUMEDA' ? ['008/4T1'] : ['167/X1'];
  }
  if (up.includes('CABLE DESNUDO 4/0')) {
    return a === 'AREA HUMEDA' ? ['008/3A', '008/3B'] : ['167/G1'];
  }
  if (up.includes('BARRA POT')) {
    return a === 'AREA HUMEDA' ? ['010/17A', '010/17B'] : ['166A'];
  }
  if (up.includes('BARRA INST')) {
    return a === 'AREA HUMEDA' ? ['010/17C', '010/17D'] : ['166C'];
  }
  if (up.includes('001/2B-X1') || up.includes('001/2B')) {
    return ['001/2B-X1'];
  }

  const fallback = (fallbackDetalle || '').trim();
  if (fallback && detalleBelongsToArea(fallback, a)) return [fallback];
  if (fallback && !detalleBelongsToArea(fallback, a)) return [];
  return [];
}

export function filterDetalleCodesForArea(codes: string[], area: string): string[] {
  return codes.filter(code => detalleBelongsToArea(code, area));
}
