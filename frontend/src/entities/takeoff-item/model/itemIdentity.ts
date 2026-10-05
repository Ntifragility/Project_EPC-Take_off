import { TakeoffItem } from './types';
import { uid } from '../../../shared/lib/uid';
import { parseTagEnPlano } from '../../bducto/model/expandBducto';

/** Trim + collapse inner whitespace + upper-case. The single tag normalizer. */
export function normalizeTagPlano(tag: string): string {
  return (tag || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

/** Normalized bank identifier for a TAG EN PLANO (e.g. "BD.A.1"). Falls back to the normalized raw tag. */
export function bductoBankId(tagEnPlano: string): string {
  return parseTagEnPlano(tagEnPlano)?.bankId ?? normalizeTagPlano(tagEnPlano);
}

/** Collision key for a bducto tramo: normalized (plano, bank). */
export function bductoTramoKey(plano: string, bankId: string): string {
  return `${normalizeTagPlano(plano)}||||${normalizeTagPlano(bankId)}`;
}

export function instanceUniquenessKey(
  item: Pick<TakeoffItem, 'plano' | 'tagPlano' | 'ruleId'>
): string {
  const tag = normalizeTagPlano(item.tagPlano || '');
  if (!tag) return '';
  const plano = normalizeTagPlano(item.plano || '');
  const ruleId = (item.ruleId || '').trim();
  if (!ruleId) return '';
  return `${plano}||||${tag}||||${ruleId}`;
}

export interface TagCollision {
  tag: string;
  plano: string;
  ruleId: string;
}

function instancesByKey(items: TakeoffItem[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const it of items) {
    const key = instanceUniquenessKey(it);
    if (!key) continue;
    const instanceKey = it.instanceId || it.id;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(instanceKey);
  }
  return map;
}

/** A second implementation of the same rule, same plano, same TAG EN PLANO. */
export function findIntroducedTagCollision(
  previous: TakeoffItem[],
  next: TakeoffItem[]
): TagCollision | null {
  const before = instancesByKey(previous);
  const after = instancesByKey(next);
  for (const [key, ids] of after) {
    const prevCount = before.get(key)?.size || 0;
    if (ids.size > 1 && ids.size > prevCount) {
      const [plano, tag, ruleId] = key.split('||||');
      return { plano, tag, ruleId };
    }
  }
  return null;
}

export function tagCollisionMessage(hit: TagCollision): string {
  const tag = hit.tag || '(vacío)';
  const plano = hit.plano || '(sin plano)';
  return `TAG EN PLANO "${tag}" ya está implementado en ${plano} para esta regla. Cada implementación debe tener un TAG distinto. Cambio rechazado.`;
}

function clusterKey(item: TakeoffItem): string {
  return [
    (item.ruleId || '').trim(),
    (item.pkgId || '').trim(),
    normalizeTagPlano(item.tagPlano || ''),
    normalizeTagPlano(item.plano || '')
  ].join('||||');
}

/** Assign instanceId to legacy rows grouped by the old implicit key. */
export function backfillInstanceIds(items: TakeoffItem[]): TakeoffItem[] {
  const clusters = new Map<string, string>();
  return items.map(it => {
    if (it.instanceId) return it;
    if (!it.ruleId) {
      return { ...it, instanceId: it.id || uid() };
    }
    const key = clusterKey(it);
    let id = clusters.get(key);
    if (!id) {
      id = uid();
      clusters.set(key, id);
    }
    return { ...it, instanceId: id };
  });
}

export function sameInstance(a: TakeoffItem, b: TakeoffItem): boolean {
  if (a.instanceId && b.instanceId) return a.instanceId === b.instanceId;
  return false;
}

export interface TramoCollision {
  plano: string;
  bankId: string;
  tag: string;
}

function tramoCounts(
  sources: Array<{ plano: string; tagEnPlano: string }>
): Map<string, { count: number; plano: string; bankId: string; tag: string }> {
  const map = new Map<string, { count: number; plano: string; bankId: string; tag: string }>();
  for (const source of sources) {
    const bankId = bductoBankId(source.tagEnPlano || '');
    const key = bductoTramoKey(source.plano || '', bankId);
    const entry = map.get(key);
    if (entry) {
      entry.count += 1;
    } else {
      map.set(key, {
        count: 1,
        plano: normalizeTagPlano(source.plano || ''),
        bankId,
        tag: normalizeTagPlano(source.tagEnPlano || '')
      });
    }
  }
  return map;
}

/** A second tramo introducing the same TAG (bank) on the same plano. Mirrors findIntroducedTagCollision. */
export function findIntroducedTramoCollision(
  previous: Array<{ plano: string; tagEnPlano: string }>,
  next: Array<{ plano: string; tagEnPlano: string }>
): TramoCollision | null {
  const before = tramoCounts(previous);
  const after = tramoCounts(next);
  for (const [key, entry] of after) {
    const prevCount = before.get(key)?.count || 0;
    if (entry.count > 1 && entry.count > prevCount) {
      return { plano: entry.plano, bankId: entry.bankId, tag: entry.tag };
    }
  }
  return null;
}

export function tramoCollisionMessage(hit: TramoCollision): string {
  const tag = hit.tag || '(vacío)';
  const plano = hit.plano || '(sin plano)';
  return `TAG EN PLANO "${tag}" ya está cargado en ${plano}. Cada tramo debe tener un TAG distinto por plano. Cambio rechazado.`;
}
