import { TakeoffItem } from './types';
import { uid } from '../../../shared/lib/uid';

export function instanceUniquenessKey(
  item: Pick<TakeoffItem, 'plano' | 'tagPlano' | 'ruleId'>
): string {
  const tag = (item.tagPlano || '').trim().toUpperCase();
  if (!tag) return '';
  const plano = (item.plano || '').trim().toUpperCase();
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
    (item.tagPlano || '').trim().toUpperCase(),
    (item.plano || '').trim().toUpperCase()
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
