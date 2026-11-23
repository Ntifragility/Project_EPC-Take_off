import { SubAreaHumeda } from '../../../shared/types/common';
import { TakeoffRule } from './types';

/** Canonical variant categories — single physical `detalle_variants` table, partitioned by (area, sub_area, category). */
export type DetalleCategory = 'CABLE_2_0' | 'BARRA_POT' | 'BARRA_INST';

export const ANCHOR_RULE_IDS = ['r2', 'r8', 'r9'] as const;

function norm(trigger: string | undefined | null): string {
  return (trigger || '').trim().toUpperCase();
}

/** "CABLE DESNUDO 2/0 AWG", "CABLE DESNUDO 2/0 AWG - DET. X (COPIA)", "CABLE 2/0 AWG ..." — anchor + clones. */
export function isCable20Family(trigger: string | undefined | null): boolean {
  const up = norm(trigger);
  return (
    up === 'CABLE DESNUDO 2/0 AWG' ||
    up === 'CABLE DESNUDO 2/0' ||
    up === 'CABLE 2/0 AWG' ||
    up.startsWith('CABLE DESNUDO 2/0')
  );
}

/** Exact anchor only (r2 identity for display, never for clones). */
export function isCable20Anchor(trigger: string | undefined | null): boolean {
  const up = norm(trigger);
  return up === 'CABLE DESNUDO 2/0 AWG' || up === 'CABLE DESNUDO 2/0' || up === 'CABLE 2/0 AWG';
}

/** "BARRA POT", "BARRA DE POTENCIAL ...", "BARRA DE POTENCIAL - DET. X (COPIA)". */
export function isBarraPotFamily(trigger: string | undefined | null): boolean {
  const up = norm(trigger);
  return up === 'BARRA POT' || up.startsWith('BARRA POT') || up.startsWith('BARRA DE POTENCIAL');
}

/** "BARRA INST", "BARRA DE INSTRUMENTACIÓN ...", "BARRA DE INSTRUMENTACION ...", + clones. */
export function isBarraInstFamily(trigger: string | undefined | null): boolean {
  const up = norm(trigger);
  return (
    up === 'BARRA INST' ||
    up.startsWith('BARRA INST') ||
    up.startsWith('BARRA DE INSTRUMENTACI')
  );
}

export function isBarraFamily(trigger: string | undefined | null): boolean {
  return isBarraPotFamily(trigger) || isBarraInstFamily(trigger);
}

export function familyCategory(trigger: string | undefined | null): DetalleCategory | null {
  if (isCable20Family(trigger)) return 'CABLE_2_0';
  if (isBarraPotFamily(trigger)) return 'BARRA_POT';
  if (isBarraInstFamily(trigger)) return 'BARRA_INST';
  return null;
}

/** Rules rendered as standalone cards outside section tables.
 *  Generic rules — including generic "(COPIA)" duplicates — stay outside.
 *  Family members (anchors + clones) never get a standalone card. */
export function isStandaloneRule(rule: TakeoffRule): boolean {
  if (rule.id === 'r2' || rule.id === 'r8' || rule.id === 'r9') return false;
  return !isCable20Family(rule.trigger) && !isBarraFamily(rule.trigger);
}

/** Canonical variant-row id: AREA_SUBAREA_CATEGORY_CODE — single SSOT scheme. */
export function variantRowId(
  area: string,
  subArea: SubAreaHumeda | undefined,
  category: DetalleCategory,
  detalleCode: string
): string {
  const up = (area || '').toUpperCase();
  const areaDb = up.includes('HUMED') || up.includes('HUEMD') ? 'AREA HUMEDA' : 'AREA SECA';
  const effective: SubAreaHumeda =
    areaDb === 'AREA HUMEDA' ? subArea || 'NO_CORROSIVO' : 'NO_CORROSIVO';
  return `${areaDb}_${effective}_${category}_${detalleCode}`;
}

export function normalizeSubArea(
  area: string,
  subArea: SubAreaHumeda | undefined
): SubAreaHumeda {
  const up = (area || '').toUpperCase();
  const isHumeda = up.includes('HUMED') || up.includes('HUEMD');
  return isHumeda ? subArea || 'NO_CORROSIVO' : 'NO_CORROSIVO';
}
