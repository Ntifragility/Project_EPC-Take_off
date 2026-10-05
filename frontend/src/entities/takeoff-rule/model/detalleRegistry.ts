import { TakeoffItem } from '../../takeoff-item/model/types';
import { TakeoffRule } from './types';
import {
  DETALLE_VARIANTS,
  DYNAMIC_DETALLE_VARIANTS,
  DYNAMIC_BARRA_POT_VARIANTS,
  DYNAMIC_BARRA_INST_VARIANTS,
  BARRA_POT_VARIANTS_HUMEDA,
  BARRA_INST_VARIANTS_HUMEDA
} from './detalleVariants';
import { SEED_RULES, SEED_CANALIZADO_RULES } from './seedRules';

/**
 * Canonical form for a DETALLE code: uppercase + trimmed,
 * with the legacy '008/5' alias unified to '008/05'.
 */
export function normalizeDetalle(code: string | undefined | null): string {
  const up = String(code || '').toUpperCase().trim();
  if (up === '008/5') return '008/05';
  return up;
}

/**
 * Detalle codes that are offered by fixed rule triggers (soldadura, cable 4/0,
 * barra) and therefore valid even when they have no entry in the
 * detalle-variants tables (those tables only cover cable 2/0 + barra).
 */
const KNOWN_STATIC_DETALLES = new Set<string>([
  '008/3A',
  '008/3B',
  '008/4T1',
  '008/4T2',
  '167/G1',
  '167/X1',
  '167/X2',
  '010/17A',
  '010/17B',
  '010/17C',
  '010/17D',
  '166A',
  '166B',
  '166C',
  '001/2B-X1'
]);

/** Legacy / empty codes kept on old rows. Never rejected. */
const LEGACY_ALLOWED = new Set<string>(['', 'N/D', 'ND', 'NA']);

/**
 * Central registry: does this DETALLE code exist in any rule?
 * Sources: legacy whitelist, fixed trigger options, dynamic + static variant
 * tables (cable 2/0 + barra), and the `detalle` field of the active rules
 * (user rules + seed rules). New codes can only enter the system through
 * DetalleEditorModal, which registers them in the dynamic variants.
 */
export function isKnownDetalle(code: string | undefined | null, rules: TakeoffRule[] = []): boolean {
  const norm = normalizeDetalle(code);
  if (LEGACY_ALLOWED.has(norm)) return true;
  if (KNOWN_STATIC_DETALLES.has(norm)) return true;
  if (DYNAMIC_DETALLE_VARIANTS[norm] || (DETALLE_VARIANTS as Record<string, unknown>)[norm]) return true;
  if (
    DYNAMIC_BARRA_POT_VARIANTS[norm] ||
    DYNAMIC_BARRA_INST_VARIANTS[norm] ||
    (BARRA_POT_VARIANTS_HUMEDA as Record<string, unknown>)[norm] ||
    (BARRA_INST_VARIANTS_HUMEDA as Record<string, unknown>)[norm]
  ) {
    return true;
  }
  const allRules = [...(rules || []), ...SEED_RULES, ...SEED_CANALIZADO_RULES];
  for (const r of allRules) {
    if (r.detalle && normalizeDetalle(r.detalle) === norm) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Soldadura T 4/0 detalle transitions (r5 <-> r6)
// ---------------------------------------------------------------------------

export interface SoldaduraDetalleSpec {
  ruleId: 'r5' | 'r6';
  descs: string[];
}

const SOLDADURA_R5_DESCS = ['SOLDADURA T 4/0', 'CARGA 150', 'MOLDE TAC2Q2Q'];
const SOLDADURA_R6_DESCS = ['SOLDADURA T 4/0 -2/0', 'CARGA 90', 'MOLDE TAC2Q2G'];

export const SOLDADURA_DETALLE_SPECS: Record<string, SoldaduraDetalleSpec> = {
  '008/4T1': { ruleId: 'r5', descs: SOLDADURA_R5_DESCS },
  '167/X1': { ruleId: 'r5', descs: SOLDADURA_R5_DESCS },
  '008/4T2': { ruleId: 'r6', descs: SOLDADURA_R6_DESCS },
  '167/X2': { ruleId: 'r6', descs: SOLDADURA_R6_DESCS }
};

const SOLDADURA_KNOWN_DESCS = new Set<string>([
  ...SOLDADURA_R5_DESCS.map(d => d.toUpperCase()),
  ...SOLDADURA_R6_DESCS.map(d => d.toUpperCase())
]);

function soldaduraIndexOf(desc: string): number {
  const up = (desc || '').trim().toUpperCase();
  let idx = SOLDADURA_R5_DESCS.findIndex(d => d.toUpperCase() === up);
  if (idx !== -1) return idx;
  idx = SOLDADURA_R6_DESCS.findIndex(d => d.toUpperCase() === up);
  return idx;
}

/**
 * Rewrites a soldadura group (same tagPlano + pkgId, ruleId r5/r6) to a new
 * DETALLE: every sibling description is swapped to its counterpart
 * (SOLDADURA/CARGA/MOLDE) and the group migrates to the target ruleId.
 * Returns null when any sibling description cannot be mapped, in which case
 * the caller must reject the whole change without mutating anything.
 */
export function applySoldaduraDetalleTransition(
  items: TakeoffItem[],
  tagPlano: string,
  pkgId: string,
  newDetalle: string,
  instanceId?: string
): TakeoffItem[] | null {
  const spec = SOLDADURA_DETALLE_SPECS[normalizeDetalle(newDetalle)];
  if (!spec) return items;

  const groupIdx: number[] = [];
  items.forEach((it, idx) => {
    const sameGroup = instanceId
      ? it.instanceId === instanceId
      : (it.ruleId === 'r5' || it.ruleId === 'r6') &&
        (it.tagPlano || '').trim() === (tagPlano || '').trim() &&
        it.pkgId === pkgId;
    if (sameGroup) {
      groupIdx.push(idx);
    }
  });
  if (groupIdx.length === 0) return items;

  for (const idx of groupIdx) {
    if (!SOLDADURA_KNOWN_DESCS.has((items[idx].desc || '').trim().toUpperCase())) {
      return null;
    }
  }

  const next = [...items];
  for (const idx of groupIdx) {
    const pos = soldaduraIndexOf(next[idx].desc);
    if (pos === -1) return null;
    next[idx] = {
      ...next[idx],
      desc: spec.descs[pos],
      ruleId: spec.ruleId,
      detalle: normalizeDetalle(newDetalle)
    };
  }
  return next;
}
