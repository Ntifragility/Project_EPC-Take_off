import { TakeoffItem, MaterialType } from './types';
import { getPItemPriority } from './materialClassifier';

export function generateTagUnico(
  plano: string,
  tagPlano: string,
  material: MaterialType
): string {
  if (material === 'C') return '';
  if (!plano || !tagPlano) return '';

  const cleanPlano = plano.trim().toUpperCase();
  const cleanTag = tagPlano.trim();

  // Standard regex matching pattern: e.g. P22-DA-2151-07-GL-001 -> 2151GL001.tag
  const parts = cleanPlano.split('-');
  if (parts.length >= 6) {
    const area = parts[2] || '';
    const discipline = parts[4] || '';
    const seq = parts[5] || '';
    return `${area}${discipline}${seq}.${cleanTag}`;
  }

  return `${cleanPlano}.${cleanTag}`;
}

export function getSequentialTag(baseTag: string, index: number): string {
  const match = baseTag.match(/^(.*?)(\d+)$/);
  if (!match) {
    return index === 0 ? baseTag : `${baseTag}_${index + 1}`;
  }
  const prefix = match[1];
  const numStr = match[2];
  const num = parseInt(numStr, 10) + index;
  return `${prefix}${String(num).padStart(numStr.length, '0')}`;
}

export function getSequentialTagsExample(baseTag: string, count: number): string {
  if (count <= 1) return baseTag;
  if (count <= 4) {
    const tags = Array.from({ length: count }, (_, i) => getSequentialTag(baseTag, i));
    return tags.join(', ');
  }
  const first = getSequentialTag(baseTag, 0);
  const second = getSequentialTag(baseTag, 1);
  const last = getSequentialTag(baseTag, count - 1);
  return `${first}, ${second}, ..., ${last}`;
}

export function assignTagUnicoSuffixes(items: TakeoffItem[]): TakeoffItem[] {
  // Group primary items by Plano + TagPlano
  const groups = new Map<string, TakeoffItem[]>();

  for (const item of items) {
    if (item.material === 'P' && item.plano && item.tagPlano) {
      const key = `${item.plano.toUpperCase()}____${item.tagPlano.trim().toUpperCase()}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    }
  }

  const result: TakeoffItem[] = [];

  for (const item of items) {
    if (item.material === 'C') {
      result.push({ ...item, tagUnico: '' });
      continue;
    }

    const key = `${(item.plano || '').toUpperCase()}____${(item.tagPlano || '').trim().toUpperCase()}`;
    const group = groups.get(key);

    if (!group || group.length <= 1) {
      const baseTag = generateTagUnico(item.plano, item.tagPlano, 'P');
      result.push({ ...item, tagUnico: baseTag });
    } else {
      // Sort items in the group by priority
      const sorted = [...group].sort((a, b) => {
        return getPItemPriority(a.desc) - getPItemPriority(b.desc);
      });

      const idx = sorted.findIndex(it => it.id === item.id);
      const baseTag = generateTagUnico(item.plano, item.tagPlano, 'P');
      const suffix = String(idx + 1).padStart(2, '0');
      result.push({ ...item, tagUnico: `${baseTag}.${suffix}` });
    }
  }

  return result;
}
