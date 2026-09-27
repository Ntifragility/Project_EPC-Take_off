import { createStore } from '../../../shared/lib/store';
import { TakeoffItem, MaterialType } from '../../../entities/takeoff-item/model/types';
import { SectionType } from '../../../shared/types/common';
import { PartidaRecord } from '../../../entities/partida/model/types';
import { loadStoredItems, saveStoredItems, loadStoredPartidas } from '../../../shared/lib/storage';
import { uid } from '../../../shared/lib/uid';
import { generateTagUnico, assignTagUnicoSuffixes } from '../../../entities/takeoff-item/model/tagGenerator';
import { isPrimaryMaterial } from '../../../entities/takeoff-item/model/materialClassifier';
import { applyDetalleVariant, applyBarraPotDetalleVariant } from '../../../entities/takeoff-rule/model/ruleExpander';
import {
  normalizeDetalle,
  isKnownDetalle,
  SOLDADURA_DETALLE_SPECS,
  applySoldaduraDetalleTransition
} from '../../../entities/takeoff-rule/model/detalleRegistry';
import { useRulesStore } from '../../manage-rules/model/useRulesStore';
import { useUIStore } from '../../filter-takeoff/model/useUIStore';
import { findMatchingPartida, correlateItemsWithPartidas } from '../../../entities/partida/model/partidaMatcher';
import { DEFAULT_PLANO, DEFAULT_REV, DEFAULT_AREA, STORAGE_KEYS } from '../../../shared/config/constants';

export interface ItemsState {
  items: TakeoffItem[];
  customPlano: string;
  customRev: string;
  editingItemId: string | null;
  highlightedTag: string | null;
  undoSnapshot: string | null;
}

export interface ItemsActions {
  loadItems: (section: SectionType, activeArea?: string) => void;
  setCustomPlano: (plano: string) => void;
  setCustomRev: (rev: string) => void;
  setEditingItemId: (id: string | null) => void;
  setHighlightedTag: (tag: string | null) => void;
  addCustomItem: (
    desc: string,
    qty: number,
    unit: string,
    pkgId: string,
    section: SectionType,
    activeArea: string
  ) => void;
  updateItem: (
    id: string,
    updates: Partial<TakeoffItem> & { numSoportes?: number; numJumpers?: number },
    section: SectionType
  ) => boolean;
  batchUpdateField: (
    itemIds: string[],
    field: keyof TakeoffItem,
    value: any,
    section: SectionType
  ) => boolean;
  deleteItem: (id: string, section: SectionType) => void;
  setItems: (items: TakeoffItem[], section: SectionType) => void;
  saveUndoSnapshot: () => void;
  undoLastAction: (section: SectionType) => boolean;
  clearCache: (section: SectionType) => void;
  syncGlobalContext: (section: SectionType) => void;
  correlateAll: (partidas: PartidaRecord[], activeArea: string, section: SectionType) => void;
}

export type ItemsStore = ItemsState & ItemsActions;

const initialSection = (localStorage.getItem(STORAGE_KEYS.ACTIVE_SECTION) as SectionType) || 'pat';
const initialStoredItems = loadStoredItems(initialSection);
const initialPartidas = loadStoredPartidas();
const initialCorrelatedItems = correlateItemsWithPartidas(initialStoredItems, initialPartidas, 'AREA SECA');
const initialPlano = localStorage.getItem(STORAGE_KEYS.PLANO) || DEFAULT_PLANO;
const initialRev = localStorage.getItem(STORAGE_KEYS.REV) || DEFAULT_REV;

let highlightTimer: any = null;

export const useItemsStore = createStore<ItemsStore>((set, get) => ({
  items: initialCorrelatedItems,
  customPlano: initialPlano,
  customRev: initialRev,
  editingItemId: null,
  highlightedTag: null,
  undoSnapshot: null,

  loadItems: (section: SectionType, activeArea = 'AREA SECA') => {
    const raw = loadStoredItems(section);
    const partidas = loadStoredPartidas();
    const correlated = correlateItemsWithPartidas(raw, partidas, activeArea);
    set({ items: correlated, undoSnapshot: null });
  },

  setCustomPlano: (customPlano: string) => {
    localStorage.setItem(STORAGE_KEYS.PLANO, customPlano);
    set({ customPlano });
  },

  setCustomRev: (customRev: string) => {
    localStorage.setItem(STORAGE_KEYS.REV, customRev);
    set({ customRev });
  },

  setEditingItemId: (editingItemId: string | null) => set({ editingItemId }),

  setHighlightedTag: (tag: string | null) => {
    if (highlightTimer) {
      clearTimeout(highlightTimer);
      highlightTimer = null;
    }
    set({ highlightedTag: tag });
    if (tag) {
      highlightTimer = setTimeout(() => {
        set({ highlightedTag: null });
      }, 1800);
    }
  },

  saveUndoSnapshot: () => {
    set({ undoSnapshot: JSON.stringify(get().items) });
  },

  addCustomItem: (
    desc: string,
    qty: number,
    unit: string,
    pkgId: string,
    section: SectionType,
    activeArea: string
  ) => {
    const { customPlano, customRev, items } = get();
    const mat = isPrimaryMaterial(desc);
    const partidas = loadStoredPartidas();

    const newItem: TakeoffItem = {
      id: uid(),
      pkgId: pkgId || 'p1',
      desc,
      qty,
      unit: unit.trim() || 'UND',
      notes: '',
      material: mat as MaterialType,
      plano: customPlano,
      rev: customRev,
      tagUnico: '',
      tagPlano: '',
      detalle: '',
      metradoOt: ''
    };

    const matchedPartida = findMatchingPartida(newItem, partidas, activeArea);
    newItem.partida = matchedPartida?.sicme || 'NA';
    newItem.partidaBalance = matchedPartida?.balance || 'NA';

    const updated = [...items, newItem];
    saveStoredItems(section, updated);
    set({ items: updated });
  },

  updateItem: (
    id: string,
    updates: Partial<TakeoffItem> & { numSoportes?: number; numJumpers?: number },
    section: SectionType
  ) => {
    const { items, setHighlightedTag } = get();
    const oldItem = items.find(i => i.id === id);
    if (!oldItem) return false;

    const showToast = useUIStore.getState().showToast;
    const knownRules = useRulesStore.getState().rules;

    // PARTIDA SICME / PARTIDA BALANCE are read-only: they come from the
    // PARTIDAS master and change only via master re-upload + recorrelate.
    // TAG UNICO is derived and regenerated below.
    if (updates.partida !== undefined || updates.partidaBalance !== undefined) {
      showToast('PARTIDA es de solo lectura: se actualiza desde el maestro PARTIDAS', 'warn');
      return false;
    }
    if (updates.tagUnico !== undefined) {
      showToast('TAG ÚNICO se genera automáticamente', 'warn');
      return false;
    }

    // Normalize + validate DETALLE before touching anything.
    if (updates.detalle !== undefined) {
      updates = { ...updates, detalle: normalizeDetalle(updates.detalle) };
      if (!isKnownDetalle(updates.detalle, knownRules)) {
        showToast(`DETALLE "${updates.detalle}" no existe en ninguna regla: cambio rechazado`, 'warn');
        return false;
      }
      // Soldadura groups (r5/r6) must be fully mappable to the new detalle,
      // otherwise the whole change is rejected without mutating anything.
      if (
        (oldItem.ruleId === 'r5' || oldItem.ruleId === 'r6') &&
        SOLDADURA_DETALLE_SPECS[updates.detalle as string] &&
        (updates.detalle as string) !== (oldItem.detalle || '').trim().toUpperCase() &&
        applySoldaduraDetalleTransition(items, oldItem.tagPlano, oldItem.pkgId, updates.detalle as string) === null
      ) {
        showToast(
          `DETALLE "${updates.detalle}": hay ítems del grupo que no se pueden actualizar, cambio rechazado`,
          'warn'
        );
        return false;
      }
    }

    const oldTagPlano = (oldItem.tagPlano || '').trim();
    const newTagPlano = (updates.tagPlano || '').trim();
    const tagChanged = updates.tagPlano !== undefined && newTagPlano !== oldTagPlano;

    const oldPlano = (oldItem.plano || '').trim();
    const newPlano = (updates.plano || '').trim();
    const planoChanged = updates.plano !== undefined && newPlano !== oldPlano;

    const oldRev = (oldItem.rev || '').trim();
    const newRev = updates.rev !== undefined ? (updates.rev || '').trim() : oldRev;

    const oldDetalle = (oldItem.detalle || '').trim();
    const newDetalle = updates.detalle !== undefined ? (updates.detalle || '').trim() : oldDetalle;
    const detalleChanged = updates.detalle !== undefined && newDetalle !== oldDetalle;

    const isGroupedRule =
      oldItem.ruleId &&
      (oldItem.ruleId === 'r1' ||
        oldItem.ruleId === 'r2' ||
        oldItem.ruleId === 'r5' ||
        oldItem.ruleId === 'r6' ||
        oldItem.ruleId === 'r7' ||
        oldItem.ruleId === 'r8' ||
        oldItem.ruleId === 'r9' ||
        oldItem.ruleId === 'r-001-2b-x1' ||
        oldItem.ruleId === 'r-001-2b-x1-can' ||
        oldItem.ruleId.includes('001-2b') ||
        oldItem.ruleId.includes('001/2b'));

    let updated = items.map(it => {
      if (it.id === id) {
        const appliedTagPlano = updates.tagPlano !== undefined ? updates.tagPlano : it.tagPlano;
        const appliedPlano = updates.plano !== undefined ? updates.plano : it.plano;
        const appliedRev = updates.rev !== undefined ? updates.rev : it.rev;
        const appliedDetalle = updates.detalle !== undefined ? updates.detalle : it.detalle;
        const appliedMaterial = updates.material !== undefined ? updates.material : it.material;
        const appliedMetradoOt = updates.metradoOt !== undefined ? updates.metradoOt : it.metradoOt;
        const appliedTagUnico =
          appliedMaterial === 'P'
            ? generateTagUnico(appliedPlano, appliedTagPlano, 'P')
            : '';

        let finalQty = updates.qty !== undefined ? updates.qty : it.qty;
        // Keep qty in sync with metradoOt if it's a strut or primary material in cable tray
        if (updates.metradoOt !== undefined && (it.desc.toUpperCase().includes('RIEL') || it.desc.toUpperCase().includes('STRUT'))) {
          const parsed = parseFloat(String(appliedMetradoOt).replace(',', '.'));
          if (!isNaN(parsed)) {
            finalQty = parsed;
          }
        }

        return {
          ...it,
          ...updates,
          qty: finalQty,
          metradoOt: appliedMetradoOt,
          tagPlano: appliedTagPlano,
          plano: appliedPlano,
          rev: appliedRev,
          detalle: appliedDetalle,
          tagUnico: appliedTagUnico
        };
      }

      // Synchronize companion items in the same rule group
      if (
        isGroupedRule &&
        it.ruleId === oldItem.ruleId &&
        it.pkgId === oldItem.pkgId &&
        (it.tagPlano || '').trim() === oldTagPlano
      ) {
        const companionTagPlano = tagChanged ? newTagPlano : it.tagPlano;
        const companionPlano = planoChanged ? newPlano : it.plano;
        const companionRev = newRev;
        const companionDetalle = detalleChanged ? newDetalle : it.detalle;
        const companionTagUnico =
          it.material === 'P'
            ? generateTagUnico(companionPlano, companionTagPlano, 'P')
            : '';

        return {
          ...it,
          tagPlano: companionTagPlano,
          plano: companionPlano,
          rev: companionRev,
          detalle: companionDetalle,
          tagUnico: companionTagUnico
        };
      }

      return it;
    });

    const target = updated.find(i => i.id === id);
    if (!target) return false;

    // DETALLE change on a soldadura group (r5 / r6): swap every sibling
    // description to its counterpart (pre-validated above, cannot fail here).
    if (
      updates.detalle !== undefined &&
      (target.ruleId === 'r5' || target.ruleId === 'r6') &&
      SOLDADURA_DETALLE_SPECS[target.detalle]
    ) {
      const transitioned = applySoldaduraDetalleTransition(
        updated,
        target.tagPlano,
        target.pkgId,
        target.detalle
      );
      if (transitioned === null) return false;
      updated = transitioned;
    }

    // Check DETALLE modification on r1 or r2
    if (updates.detalle !== undefined && (target.ruleId === 'r1' || target.ruleId === 'r2')) {
      const nSop = updates.numSoportes || 0;
      const nJmp = updates.numJumpers || 0;
      const sibs = updated.filter(i => i.tagPlano === target.tagPlano && i.pkgId === target.pkgId);
      const tItem = sibs.find(i => i.desc.toUpperCase().includes('TUBERIA') || i.desc.toUpperCase().includes('TUBERÍA'));
      const cItem = sibs.find(i => i.desc.toUpperCase().includes('CABLE') && !i.desc.toUpperCase().includes('JUMPER'));
      const tOt = tItem ? tItem.metradoOt : '';
      const cOt = cItem ? cItem.metradoOt : '';
      updated = applyDetalleVariant(updated, target.tagPlano, target.pkgId, target.detalle, nSop, nJmp, tOt, cOt);

      if (target.ruleId === 'r1') {
        const isDetalle3B = target.detalle.toUpperCase() === '008/3B';
        const siblings = updated.filter(i => i.tagPlano === target.tagPlano && i.pkgId === target.pkgId && i.ruleId === 'r1');
        const cemento = siblings.find(i => i.desc.toUpperCase().includes('CEMENTO GEM'));

        if (isDetalle3B && !cemento) {
          const cable = siblings.find(i => i.desc.toUpperCase().includes('CABLE DESNUDO 4/0 AWG'));
          const cableVal = parseFloat(cable?.metradoOt || '') || 0;
          const ref = cable || target;
          updated.push({
            ...ref,
            id: uid(),
            desc: 'CEMENTO GEM (11.3 Kg x bls)',
            qty: 'length x 11.3 / 2',
            unit: 'kg',
            material: 'C',
            tagUnico: '',
            metradoOt: String(parseFloat((cableVal * 11.3 / 2).toFixed(4)))
          });
        } else if (!isDetalle3B && cemento) {
          updated = updated.filter(i => i.id !== cemento.id);
        }
      }
    }

    // Check CABLE DESNUDO 4/0 AWG changes (update CINTA AMARILLA, TIERRA DE CULTIVO, CEMENTO GEM)
    if (
      target.ruleId === 'r1' &&
      target.desc.toUpperCase().includes('CABLE DESNUDO 4/0 AWG') &&
      updates.metradoOt !== undefined
    ) {
      const cableVal = parseFloat(updates.metradoOt) || 0;
      const tierraVal = String(parseFloat((0.375 * 0.5 * cableVal).toFixed(4)));
      const cementoVal = String(parseFloat((cableVal * 11.3 / 2).toFixed(4)));

      updated = updated.map(sib => {
        if (
          sib.tagPlano === target.tagPlano &&
          sib.pkgId === target.pkgId
        ) {
          if (sib.desc.toUpperCase().includes('CINTA AMARILLA')) {
            return { ...sib, metradoOt: updates.metradoOt! };
          }
          if (sib.desc.toUpperCase().includes('TIERRA DE CULTIVO')) {
            return { ...sib, metradoOt: tierraVal };
          }
          if (sib.desc.toUpperCase().includes('CEMENTO GEM')) {
            return { ...sib, metradoOt: cementoVal };
          }
        }
        return sib;
      });
    }

    // Check CABLE DESNUDO 2/0 AWG changes with DETALLE 153 (update PRENSA PARALELA 1c/3m)
    if (
      target.ruleId === 'r2' &&
      target.desc.toUpperCase().includes('CABLE DESNUDO 2/0 AWG') &&
      target.detalle === '153' &&
      updates.metradoOt !== undefined
    ) {
      const cableVal = parseFloat(updates.metradoOt) || 0;
      const prensaVal = Math.ceil(cableVal / 3).toString();

      updated = updated.map(sib => {
        if (
          sib.ruleId === target.ruleId &&
          sib.tagPlano === target.tagPlano &&
          sib.pkgId === target.pkgId &&
          sib.desc.toUpperCase().includes('PRENSA PARALELA 1 CONDUCTOR')
        ) {
          return { ...sib, metradoOt: prensaVal };
        }
        return sib;
      });
    }

    // Check DETALLE modification on BARRA (r8 / r9 / BARRA)
    if (
      updates.detalle !== undefined &&
      (target.ruleId === 'r8' || target.ruleId === 'r9' || target.desc.toUpperCase().includes('BARRA'))
    ) {
      updated = applyBarraPotDetalleVariant(
        updated,
        target.tagPlano,
        target.pkgId,
        target.detalle,
        updates.numSoportes || 1
      );
    }

    const targetTag = newTagPlano || oldTagPlano;
    if (targetTag) {
      setHighlightedTag(targetTag);
    }

    const result = assignTagUnicoSuffixes(updated);
    saveStoredItems(section, result);
    set({ items: result, editingItemId: null });
    return true;
  },

  batchUpdateField: (
    itemIds: string[],
    field: keyof TakeoffItem,
    value: any,
    section: SectionType
  ) => {
    if (!itemIds || itemIds.length === 0) return false;
    const { items } = get();
    const showToast = useUIStore.getState().showToast;
    const knownRules = useRulesStore.getState().rules;

    // PARTIDA SICME / PARTIDA BALANCE are read-only (master-driven).
    // TAG UNICO is derived (regenerated on every save).
    if (field === 'partida' || field === 'partidaBalance') {
      showToast('PARTIDA es de solo lectura: se actualiza desde el maestro PARTIDAS', 'warn');
      return false;
    }
    if (field === 'tagUnico') {
      showToast('TAG ÚNICO se genera automáticamente', 'warn');
      return false;
    }

    // Normalize + validate DETALLE once, before the undo snapshot and any mutation.
    let normDetalle = '';
    if (field === 'detalle') {
      normDetalle = normalizeDetalle(value);
      if (!isKnownDetalle(normDetalle, knownRules)) {
        showToast(`DETALLE "${normDetalle}" no existe en ninguna regla: cambio rechazado`, 'warn');
        return false;
      }
      // Pre-validate soldadura groups: every sibling must be mappable,
      // otherwise the whole batch is rejected without mutating anything.
      for (const targetId of itemIds) {
        const t = items.find(i => i.id === targetId);
        if (!t) continue;
        if (
          (t.ruleId === 'r5' || t.ruleId === 'r6') &&
          SOLDADURA_DETALLE_SPECS[normDetalle] &&
          normDetalle !== (t.detalle || '').trim().toUpperCase() &&
          applySoldaduraDetalleTransition(items, t.tagPlano, t.pkgId, normDetalle) === null
        ) {
          showToast(
            `DETALLE "${normDetalle}": hay ítems del grupo que no se pueden actualizar, cambio rechazado`,
            'warn'
          );
          return false;
        }
      }
      value = normDetalle;
    }

    // Normalize DESCRIPCION (uppercase, trimmed, non-empty).
    if (field === 'desc') {
      value = String(value).toUpperCase().trim();
      if (!value) {
        showToast('La descripción no puede estar vacía', 'warn');
        return false;
      }
    }

    const { saveUndoSnapshot } = get();
    saveUndoSnapshot();
    const idSet = new Set(itemIds);

    let currentItems = [...items];

    // Process each target item
    for (const targetId of itemIds) {
      const target = currentItems.find(i => i.id === targetId);
      if (!target) continue;

      const oldTagPlano = (target.tagPlano || '').trim();
      const oldPlano = (target.plano || '').trim();
      const oldRev = (target.rev || '').trim();
      const oldDetalle = (target.detalle || '').trim();

      let newPlano = oldPlano;
      let newRev = oldRev;
      let newTagPlano = oldTagPlano;
      let newDetalle = oldDetalle;

      if (field === 'plano') newPlano = String(value).toUpperCase().trim();
      if (field === 'rev') newRev = String(value).toUpperCase().trim();
      if (field === 'tagPlano') newTagPlano = String(value).trim();
      if (field === 'detalle') newDetalle = String(value).toUpperCase().trim();

      const planoChanged = field === 'plano' && newPlano !== oldPlano;
      const tagChanged = field === 'tagPlano' && newTagPlano !== oldTagPlano;
      const detalleChanged = field === 'detalle' && newDetalle !== oldDetalle;

      currentItems = currentItems.map(it => {
        if (it.id === targetId) {
          const upd: any = { ...it, [field]: value };
          if (field === 'plano') upd.plano = newPlano;
          if (field === 'rev') upd.rev = newRev;
          if (field === 'tagPlano') upd.tagPlano = newTagPlano;
          if (field === 'detalle') upd.detalle = newDetalle;
          if (field === 'material') upd.material = value as MaterialType;
          if (field === 'metradoOt') upd.metradoOt = value;

          upd.tagUnico = upd.material === 'P' ? generateTagUnico(upd.plano, upd.tagPlano, 'P') : '';
          return upd;
        }

        // A change on the principal rewrites the shared fields of its components.
        // A direct edit of a consumable (PLANO fill) stays on that row.
        if (
          target.material === 'P' &&
          it.ruleId &&
          it.ruleId === target.ruleId &&
          it.pkgId === target.pkgId &&
          (it.tagPlano || '').trim() === oldTagPlano
        ) {
          const companionPlano = planoChanged ? newPlano : it.plano;
          const companionTagPlano = tagChanged ? newTagPlano : it.tagPlano;
          const companionRev = newRev;
          const companionDetalle = detalleChanged ? newDetalle : it.detalle;
          const companionTagUnico =
            it.material === 'P'
              ? generateTagUnico(companionPlano, companionTagPlano, 'P')
              : '';

          return {
            ...it,
            plano: companionPlano,
            tagPlano: companionTagPlano,
            rev: companionRev,
            detalle: companionDetalle,
            tagUnico: companionTagUnico
          };
        }

        return it;
      });

      // If DETALLE changed on CABLE 2/0 (r1 / r2), expand dynamic variants
      if (field === 'detalle' && (target.ruleId === 'r1' || target.ruleId === 'r2')) {
        const sibs = currentItems.filter(i => i.tagPlano === target.tagPlano && i.pkgId === target.pkgId);
        const tItem = sibs.find(i => i.desc.toUpperCase().includes('TUBERIA') || i.desc.toUpperCase().includes('TUBERÍA'));
        const cItem = sibs.find(i => i.desc.toUpperCase().includes('CABLE') && !i.desc.toUpperCase().includes('JUMPER'));
        const tOt = tItem ? tItem.metradoOt : '';
        const cOt = cItem ? cItem.metradoOt : '';
        currentItems = applyDetalleVariant(
          currentItems,
          target.tagPlano,
          target.pkgId,
          newDetalle,
          (target as any).numSoportes || 1,
          (target as any).numJumpers || 1,
          tOt,
          cOt,
          true
        );

        // CABLE 4/0 (r1): 008/3B carries CEMENTO GEM, any other detalle drops it.
        // TUBERIA rows (optional, 008/3A) are preserved in both directions.
        if (target.ruleId === 'r1') {
          const isDetalle3B = newDetalle.toUpperCase() === '008/3B';
          const siblings = currentItems.filter(
            i => i.tagPlano === target.tagPlano && i.pkgId === target.pkgId && i.ruleId === 'r1'
          );
          const cemento = siblings.find(i => i.desc.toUpperCase().includes('CEMENTO GEM'));
          if (isDetalle3B && !cemento) {
            const cable = siblings.find(i => i.desc.toUpperCase().includes('CABLE DESNUDO 4/0 AWG'));
            const cableVal = parseFloat(cable?.metradoOt || '') || 0;
            const ref = cable || { ...target, tagPlano: target.tagPlano, pkgId: target.pkgId };
            currentItems.push({
              ...ref,
              id: uid(),
              desc: 'CEMENTO GEM (11.3 Kg x bls)',
              qty: 'length x 11.3 / 2',
              unit: 'kg',
              material: 'C',
              tagUnico: '',
              detalle: newDetalle,
              metradoOt: String(parseFloat((cableVal * 11.3 / 2).toFixed(4)))
            });
          } else if (!isDetalle3B && cemento) {
            currentItems = currentItems.filter(i => i.id !== cemento.id);
          }
        }
      }

      // If DETALLE changed on a soldadura group (r5 / r6), swap every sibling
      // description to its counterpart (pre-validated above).
      if (
        field === 'detalle' &&
        (target.ruleId === 'r5' || target.ruleId === 'r6') &&
        SOLDADURA_DETALLE_SPECS[newDetalle]
      ) {
        const transitioned = applySoldaduraDetalleTransition(
          currentItems,
          target.tagPlano,
          target.pkgId,
          newDetalle
        );
        if (transitioned === null) {
          showToast(
            `DETALLE "${newDetalle}": hay ítems del grupo que no se pueden actualizar, cambio rechazado`,
            'warn'
          );
          return false;
        }
        currentItems = transitioned;
      }

      // If DETALLE changed on BARRA, expand dynamic variants
      if (
        field === 'detalle' &&
        (target.ruleId === 'r8' || target.ruleId === 'r9' || target.desc.toUpperCase().includes('BARRA'))
      ) {
        currentItems = applyBarraPotDetalleVariant(
          currentItems,
          target.tagPlano,
          target.pkgId,
          newDetalle,
          (target as any).numSoportes || 1,
          true
        );
      }
    }

    // DESCRIPCION stays local to each edited row (companions keep theirs),
    // but its PARTIDA match must be recorrelated since partidas are read-only.
    if (field === 'desc') {
      const partidas = loadStoredPartidas();
      const area = localStorage.getItem(STORAGE_KEYS.ACTIVE_AREA) || DEFAULT_AREA;
      let firstSicme = 'NA';
      let firstBalance = 'NA';
      let recounted = 0;
      currentItems = currentItems.map(it => {
        if (!idSet.has(it.id)) return it;
        const m = findMatchingPartida(it, partidas, area);
        const sicme = m?.sicme || 'NA';
        const balance = m?.balance || 'NA';
        if (recounted === 0) {
          firstSicme = sicme;
          firstBalance = balance;
        }
        recounted += 1;
        return { ...it, partida: sicme, partidaBalance: balance };
      });
      if (recounted === 1) {
        showToast(
          firstSicme === 'NA' && firstBalance === 'NA'
            ? 'Descripción actualizada — sin match en maestro (NA)'
            : `Descripción actualizada — PARTIDA recorrelacionada: ${firstSicme} / ${firstBalance}`,
          'info'
        );
      } else if (recounted > 1) {
        showToast(`Descripción actualizada en ${recounted} ítems — PARTIDAS recorrelacionadas`, 'info');
      }
    }

    const result = assignTagUnicoSuffixes(currentItems);
    saveStoredItems(section, result);
    set({ items: result });
    return true;
  },

  deleteItem: (id: string, section: SectionType) => {
    const updated = get().items.filter(it => it.id !== id);
    saveStoredItems(section, updated);
    set({ items: updated });
  },

  setItems: (items: TakeoffItem[], section: SectionType) => {
    saveStoredItems(section, items);
    set({ items });
  },

  undoLastAction: (section: SectionType) => {
    const snapshot = get().undoSnapshot;
    if (!snapshot) return false;
    try {
      const restored = JSON.parse(snapshot);
      saveStoredItems(section, restored);
      set({ items: restored, undoSnapshot: null });
      return true;
    } catch (e) {
      console.error('Error restoring undo snapshot:', e);
      return false;
    }
  },

  clearCache: (section: SectionType) => {
    saveStoredItems(section, []);
    set({ items: [], undoSnapshot: null });
  },

  syncGlobalContext: (section: SectionType) => {
    const { customPlano, customRev, items } = get();
    const updated = items.map(it => {
      const newTagUnico =
        it.material === 'P'
          ? generateTagUnico(customPlano, it.tagPlano, 'P')
          : '';
      return {
        ...it,
        plano: customPlano,
        rev: customRev,
        tagUnico: newTagUnico
      };
    });
    const finalItems = assignTagUnicoSuffixes(updated);
    saveStoredItems(section, finalItems);
    set({ items: finalItems });
  },

  correlateAll: (partidas: PartidaRecord[], activeArea: string, section: SectionType) => {
    const current = get().items;
    const correlated = correlateItemsWithPartidas(current, partidas, activeArea);
    saveStoredItems(section, correlated);
    set({ items: correlated });
  }
}));
