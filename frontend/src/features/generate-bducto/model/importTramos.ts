export interface TramoIdentity {
  desde?: string;
  hasta?: string;
  plano: string;
  tagEnPlano: string;
  quantity: number;
}

export function tramoKey(source: TramoIdentity): string {
  return [source.desde || '', source.hasta || '', source.plano, source.tagEnPlano, source.quantity].join('\u0000');
}

/** Keeps a repeated line inside one file. Skips copies already stored from an earlier upload. */
export function tramosToAdd<T extends TramoIdentity>(existing: T[], incoming: T[]): T[] {
  const stored = new Map<string, number>();
  for (const source of existing) {
    const key = tramoKey(source);
    stored.set(key, (stored.get(key) || 0) + 1);
  }
  const seen = new Map<string, number>();
  const added: T[] = [];
  for (const source of incoming) {
    const key = tramoKey(source);
    const index = seen.get(key) || 0;
    seen.set(key, index + 1);
    if (index < (stored.get(key) || 0)) continue;
    added.push(source);
  }
  return added;
}

/**
 * Drops a second upload of the same list when that copy has no metrado yet.
 * A repeated block must be at least two tramos, so two identical lines in one file stay.
 */
export function withoutRepeatedUpload<T extends TramoIdentity & { id: string }>(
  sources: T[],
  rowSourceIds: ReadonlySet<string>
): T[] {
  let list = sources;
  let removed = true;
  while (removed) {
    removed = false;
    for (let start = 0; start < list.length; start++) {
      const rest = list.length - start;
      if (rest < 4 || rest % 2 !== 0) continue;
      const half = rest / 2;
      const same = list.slice(start, start + half).every((source, index) => tramoKey(source) === tramoKey(list[start + half + index]));
      if (!same) continue;
      const second = list.slice(start + half, start + half * 2);
      if (second.some(source => rowSourceIds.has(source.id))) continue;
      list = [...list.slice(0, start + half), ...list.slice(start + rest)];
      removed = true;
      break;
    }
  }
  return list;
}
