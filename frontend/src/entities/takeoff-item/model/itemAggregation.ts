import { TakeoffItem } from './types';
import { cleanFloat } from '../../../shared/lib/cleanNumber';

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
        const newQty = cleanFloat(q1 + q2);

        const ot1 = parseFloat(existing.metradoOt || '') || 0;
        const ot2 = parseFloat(it.metradoOt || '') || 0;
        const newOt = String(cleanFloat(ot1 + ot2));

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
 * Consolidates items ONLY within the same TAG on the same PLANO.
 * It NEVER combines different TAGs together and NEVER combines different PLANOs together.
 * Within each (plano, tagPlano), identical materials (same desc, material, unit)
 * have their quantities and metradoOt summed together.
 */
export function consolidateItemsByTagAndPlano(items: TakeoffItem[]): TakeoffItem[] {
  if (!items || items.length === 0) return [];

  interface TagItemEntry {
    sample: TakeoffItem;
    totalQty: number;
    totalOt: number;
    hasNumericOt: boolean;
    count: number;
    notesList: string[];
  }

  const map = new Map<string, TagItemEntry>();
  const order: string[] = [];

  for (const it of items) {
    const cleanPlano = (it.plano || '').trim().toUpperCase();
    const cleanTag = (it.tagPlano || '').trim().toUpperCase();
    const cleanDesc = (it.desc || '').trim().toUpperCase();
    const cleanUnit = (it.unit || '').trim().toUpperCase();
    const mat = it.material || 'C';
    const pkgId = it.pkgId || '';

    // If an item has a tag, group strictly within (pkgId, plano, tag, desc, material, unit).
    // If it has NO tag, keep it separate using its id so un-tagged items don't merge unpredictably.
    const tagKey = cleanTag ? cleanTag : `__NO_TAG_${it.id}__`;
    const key = `${pkgId}____${cleanPlano}____${tagKey}____${cleanDesc}____${mat}____${cleanUnit}`;

    const numQty = typeof it.qty === 'number' ? it.qty : parseFloat(String(it.qty).replace(',', '.')) || 0;
    const rawOt = (it.metradoOt !== undefined && it.metradoOt !== null ? String(it.metradoOt) : '').trim().replace(',', '.');
    const isNumOt = rawOt !== '' && rawOt.toUpperCase() !== 'VAR.' && !isNaN(Number(rawOt));
    const numOt = isNumOt ? Number(rawOt) : 0;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        sample: { ...it },
        totalQty: numQty,
        totalOt: numOt,
        hasNumericOt: isNumOt,
        count: 1,
        notesList: it.notes ? [it.notes] : []
      });
      order.push(key);
    } else {
      existing.count += 1;
      existing.totalQty += numQty;
      if (isNumOt) {
        existing.totalOt += numOt;
        existing.hasNumericOt = true;
      }
      if (it.notes && !existing.notesList.includes(it.notes)) {
        existing.notesList.push(it.notes);
      }
      if (!existing.sample.detalle && it.detalle) {
        existing.sample.detalle = it.detalle;
      }
      if (!existing.sample.partida && it.partida) {
        existing.sample.partida = it.partida;
      }
      if (!existing.sample.partidaBalance && it.partidaBalance) {
        existing.sample.partidaBalance = it.partidaBalance;
      }
    }
  }

  return order.map((key, idx) => {
    const entry = map.get(key)!;
    const sample = entry.sample;

    const finalQty =
      entry.count > 1 || typeof sample.qty === 'number' || !isNaN(Number(sample.qty))
        ? parseFloat(entry.totalQty.toFixed(4))
        : sample.qty;

    let finalOt = sample.metradoOt || '';
    if (entry.hasNumericOt && entry.totalOt > 0) {
      finalOt = String(parseFloat(entry.totalOt.toFixed(4)));
    }

    const combinedNotes = entry.notesList.filter(Boolean).join('; ');

    return {
      ...sample,
      id: entry.count > 1 ? `cons_${sample.id}_${idx}` : sample.id,
      qty: finalQty,
      metradoOt: finalOt,
      notes: combinedNotes || sample.notes || ''
    };
  });
}

/** Alias to ensure backwards compatibility with TakeoffTable callers */
export const mergeItemsByDetalle = consolidateItemsByTagAndPlano;
