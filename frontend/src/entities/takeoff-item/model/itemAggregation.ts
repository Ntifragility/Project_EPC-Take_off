import { TakeoffItem } from './types';

/**
 * Consolidates consumable accessories sharing the same pkgId, plano, rev, tagPlano, and description.
 */
export function consolidateAccessories(items: TakeoffItem[]): TakeoffItem[] {
  const result: TakeoffItem[] = [];
  const primaryItems: TakeoffItem[] = [];
  const consumableMap = new Map<string, TakeoffItem>();

  for (const it of items) {
    if (it.material === 'P') {
      primaryItems.push(it);
    } else {
      const key = `${it.pkgId}____${it.plano}____${it.rev}____${(it.tagPlano || '').trim()}____${it.desc.trim().toUpperCase()}____${it.unit.trim().toUpperCase()}`;
      const existing = consumableMap.get(key);
      if (!existing) {
        consumableMap.set(key, { ...it });
      } else {
        const q1 = typeof existing.qty === 'number' ? existing.qty : parseFloat(existing.qty as string) || 0;
        const q2 = typeof it.qty === 'number' ? it.qty : parseFloat(it.qty as string) || 0;
        const newQty = q1 + q2;

        const ot1 = parseFloat(existing.metradoOt || '') || 0;
        const ot2 = parseFloat(it.metradoOt || '') || 0;
        const newOt = (ot1 + ot2).toString();

        const combinedNotes = [existing.notes, it.notes].filter(Boolean).join('; ');

        consumableMap.set(key, {
          ...existing,
          qty: newQty,
          metradoOt: newOt,
          notes: combinedNotes
        });
      }
    }
  }

  // Preserve relative order: primary items followed by consolidated consumables
  result.push(...primaryItems, ...Array.from(consumableMap.values()));
  return result;
}

/**
 * In-place consolidation of duplicate items for a single tag.
 */
export function consolidateTagItems(
  items: TakeoffItem[],
  tagPlano: string,
  pkgId: string
): TakeoffItem[] {
  const targetTag = (tagPlano || '').trim().toUpperCase();
  const otherItems = items.filter(
    i => i.pkgId !== pkgId || (i.tagPlano || '').trim().toUpperCase() !== targetTag
  );
  const tagItems = items.filter(
    i => i.pkgId === pkgId && (i.tagPlano || '').trim().toUpperCase() === targetTag
  );

  const consolidated = consolidateAccessories(tagItems);
  return [...otherItems, ...consolidated];
}

export interface MergedDetalleGroup {
  detalle: string;
  desc: string;
  material: string;
  unit: string;
  totalQty: number;
  totalOt: number;
  tags: Set<string>;
  planos: Set<string>;
  sampleItem: TakeoffItem;
}

/**
 * Pure aggregation function for TakeoffTable Merged View.
 * Groups items by detalle + desc + material + unit and calculates totals and tag summaries.
 */
export function mergeItemsByDetalle(items: TakeoffItem[]): TakeoffItem[] {
  const map = new Map<string, MergedDetalleGroup>();

  for (const item of items) {
    const key = `${item.detalle || 'SIN DETALLE'}____${item.desc.trim().toUpperCase()}____${item.material}____${item.unit.trim().toUpperCase()}`;
    const qtyVal = typeof item.qty === 'number' ? item.qty : parseFloat(String(item.qty)) || 0;
    const otVal = parseFloat(item.metradoOt || '') || 0;

    const existing = map.get(key);
    if (!existing) {
      const tags = new Set<string>();
      if (item.tagPlano) tags.add(item.tagPlano.trim());
      const planos = new Set<string>();
      if (item.plano) planos.add(item.plano.trim());

      map.set(key, {
        detalle: item.detalle || '',
        desc: item.desc,
        material: item.material,
        unit: item.unit,
        totalQty: qtyVal,
        totalOt: otVal,
        tags,
        planos,
        sampleItem: item
      });
    } else {
      existing.totalQty += qtyVal;
      existing.totalOt += otVal;
      if (item.tagPlano) existing.tags.add(item.tagPlano.trim());
      if (item.plano) existing.planos.add(item.plano.trim());
    }
  }

  return Array.from(map.entries()).map(([key, group], idx) => {
    const sortedTags = Array.from(group.tags).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );

    let tagDisplay = '';
    if (sortedTags.length === 0) {
      tagDisplay = '—';
    } else if (sortedTags.length <= 4) {
      tagDisplay = sortedTags.join(', ');
    } else {
      tagDisplay = `${sortedTags.slice(0, 3).join(', ')} ... (+${sortedTags.length - 3})`;
    }

    const planosList = Array.from(group.planos);
    const planoDisplay = planosList.length === 1 ? planosList[0] : planosList.length > 1 ? `${planosList[0]} (+${planosList.length - 1})` : '—';

    return {
      ...group.sampleItem,
      id: `merged_${idx}_${key}`,
      tagPlano: tagDisplay,
      plano: planoDisplay,
      tagUnico: group.material === 'P' ? `${sortedTags.length} TAG(s)` : '',
      qty: parseFloat(group.totalQty.toFixed(4)),
      metradoOt: group.totalOt > 0 ? String(parseFloat(group.totalOt.toFixed(4))) : group.sampleItem.metradoOt,
      notes: `Consolidado de ${group.tags.size} ubicación(es)`
    };
  });
}
