import { createStore } from '../../../shared/lib/store';
import { TakeoffItem, MaterialType } from '../../../entities/takeoff-item/model/types';
import { SectionType } from '../../../shared/types/common';
import { PartidaRecord } from '../../../entities/partida/model/types';
import { loadStoredItems, saveStoredItems, loadStoredPartidas } from '../../../shared/lib/storage';
import { uid } from '../../../shared/lib/uid';
import { generateTagUnico, assignTagUnicoSuffixes } from '../../../entities/takeoff-item/model/tagGenerator';
import {
  backfillInstanceIds,
  findIntroducedTagCollision,
  tagCollisionMessage
} from '../../../entities/takeoff-item/model/itemIdentity';
import { isPrimaryMaterial } from '../../../entities/takeoff-item/model/materialClassifier';
import {
  syncInstanceFields,
  instanceIdsForItemIds,
  isDetalleTriggerRow,
  previewInstanceBom,
  applyInstanceDetalleChange,
  type BomLine,
  type RebuildExtras
} from '../../../entities/takeoff-rule/model/instanceRebuild';
import { normalizeDetalle, isKnownDetalle } from '../../../entities/takeoff-rule/model/detalleRegistry';
import { useRulesStore } from '../../manage-rules/model/useRulesStore';
import { useUIStore } from '../../filter-takeoff/model/useUIStore';
import { findMatchingPartida, correlateItemsWithPartidas } from '../../../entities/partida/model/partidaMatcher';
import { DEFAULT_PLANO, DEFAULT_REV, DEFAULT_AREA, STORAGE_KEYS } from '../../../shared/config/constants';

export interface PendingDetalleEdit {
  itemId: string;
  instanceId: string;
  newDetalle: string;
  currentTag: string;
  currentDetalle: string;
  previewLines: BomLine[];
  extras: RebuildExtras;
  applyToItemIds: string[];
}

export interface ItemsState {
  items: TakeoffItem[];
  customPlano: string;
  customRev: string;
  editingItemId: string | null;
  highlightedTag: string | null;
  undoSnapshot: string | null;
  pendingDetalleEdit: PendingDetalleEdit | null;
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
  requestDetalleChange: (
    itemId: string,
    newDetalle: string,
    extras?: RebuildExtras,
    applyToItemIds?: string[]
  ) => boolean;
  confirmDetalleChange: (
    tagPlano: string,
    lines: BomLine[],
    section: SectionType
  ) => boolean;
  cancelDetalleChange: () => void;
  undoLastAction: (section: SectionType) => boolean;
  clearCache: (section: SectionType) => void;
  syncGlobalContext: (section: SectionType) => void;
  syncContextToItemIds: (itemIds: string[], section: SectionType) => boolean;
  correlateAll: (partidas: PartidaRecord[], activeArea: string, section: SectionType) => void;
}

export type ItemsStore = ItemsState & ItemsActions;

const initialSection = (localStorage.getItem(STORAGE_KEYS.ACTIVE_SECTION) as SectionType) || 'pat';
const initialStoredItems = loadStoredItems(initialSection);
const initialPartidas = loadStoredPartidas();
const initialCorrelatedItems = correlateItemsWithPartidas(
  backfillInstanceIds(initialStoredItems),
  initialPartidas,
  'AREA SECA'
);
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
  pendingDetalleEdit: null,

  loadItems: (section: SectionType, activeArea = 'AREA SECA') => {
    const raw = backfillInstanceIds(loadStoredItems(section));
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
    const { customPlano, customRev, items, saveUndoSnapshot } = get();
    saveUndoSnapshot();
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
      metradoOt: '',
      instanceId: uid()
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
    const { items: rawItems, setHighlightedTag } = get();
    const items = backfillInstanceIds(rawItems);
    const oldItem = items.find(i => i.id === id);
    if (!oldItem) return false;

    const showToast = useUIStore.getState().showToast;
    const knownRules = useRulesStore.getState().rules;

    if (updates.partida !== undefined || updates.partidaBalance !== undefined) {
      showToast('PARTIDA es de solo lectura: se actualiza desde el maestro PARTIDAS', 'warn');
      return false;
    }
    if (updates.tagUnico !== undefined) {
      showToast('TAG ÚNICO se genera automáticamente', 'warn');
      return false;
    }
    if (oldItem.material === 'C') {
      showToast('Solo se editan ítems principales (P). Los consumibles se actualizan desde el P.', 'warn');
      return false;
    }

    if (updates.detalle !== undefined) {
      updates = { ...updates, detalle: normalizeDetalle(updates.detalle) };
      if (!isKnownDetalle(updates.detalle, knownRules)) {
        showToast(`DETALLE "${updates.detalle}" no existe en ninguna regla: cambio rechazado`, 'warn');
        return false;
      }
    }

    const oldTagPlano = (oldItem.tagPlano || '').trim();
    const newTagPlano = updates.tagPlano !== undefined ? (updates.tagPlano || '').trim() : oldTagPlano;
    const newPlano = updates.plano !== undefined ? (updates.plano || '').trim() : (oldItem.plano || '').trim();
    const newRev = updates.rev !== undefined ? (updates.rev || '').trim() : (oldItem.rev || '').trim();
    const newDetalle = updates.detalle !== undefined ? (updates.detalle || '').trim() : (oldItem.detalle || '').trim();
    const detalleChanged = updates.detalle !== undefined && newDetalle !== (oldItem.detalle || '').trim();
    const instanceId = oldItem.instanceId;
    const detalleExtras = detalleChanged
      ? {
          numSoportes: updates.numSoportes,
          numJumpers: updates.numJumpers,
          rules: knownRules
        }
      : null;
    if (detalleChanged) {
      if (!isDetalleTriggerRow(oldItem, items)) {
        showToast('Solo el ítem principal puede cambiar DETALLE y generar filas', 'warn');
        return false;
      }
      const { detalle: _detalle, ...rest } = updates;
      updates = rest;
    }

    let updated = items.map(it => {
      if (it.id !== id) return it;
      const appliedTagPlano = updates.tagPlano !== undefined ? updates.tagPlano : it.tagPlano;
      const appliedPlano = updates.plano !== undefined ? updates.plano : it.plano;
      const appliedRev = updates.rev !== undefined ? updates.rev : it.rev;
      const appliedMaterial = updates.material !== undefined ? updates.material : it.material;
      const appliedMetradoOt = updates.metradoOt !== undefined ? updates.metradoOt : it.metradoOt;
      let finalQty = updates.qty !== undefined ? updates.qty : it.qty;
      if (
        updates.metradoOt !== undefined &&
        (it.desc.toUpperCase().includes('RIEL') || it.desc.toUpperCase().includes('STRUT'))
      ) {
        const parsed = parseFloat(String(appliedMetradoOt).replace(',', '.'));
        if (!isNaN(parsed)) finalQty = parsed;
      }
      return {
        ...it,
        ...updates,
        qty: finalQty,
        metradoOt: appliedMetradoOt,
        tagPlano: appliedTagPlano,
        plano: appliedPlano,
        rev: appliedRev,
        tagUnico: appliedMaterial === 'P' ? generateTagUnico(appliedPlano, appliedTagPlano, 'P') : ''
      };
    });

    if (instanceId) {
      updated = syncInstanceFields(updated, instanceId, {
        tagPlano: newTagPlano,
        plano: newPlano,
        rev: newRev
      });
    }

    if (detalleChanged && detalleExtras) {
      const result = assignTagUnicoSuffixes(updated);
      saveStoredItems(section, result);
      set({ items: result, editingItemId: null });
      return get().requestDetalleChange(id, newDetalle, detalleExtras);
    }

    const target =
      updated.find(i => i.id === id) ||
      (instanceId ? updated.find(i => i.instanceId === instanceId) : undefined);
    if (!target) return false;

    if (updates.metradoOt !== undefined && instanceId) {
      const descUp = (oldItem.desc || '').toUpperCase();
      if (oldItem.ruleId === 'r1' && descUp.includes('CABLE DESNUDO 4/0 AWG')) {
        const cableVal = parseFloat(String(updates.metradoOt)) || 0;
        const tierraVal = String(parseFloat((0.375 * 0.5 * cableVal).toFixed(4)));
        const cementoVal = String(parseFloat(((cableVal * 11.3) / 2).toFixed(4)));
        updated = updated.map(sib => {
          if (sib.instanceId !== instanceId) return sib;
          if (sib.desc.toUpperCase().includes('CINTA AMARILLA')) return { ...sib, metradoOt: String(updates.metradoOt) };
          if (sib.desc.toUpperCase().includes('TIERRA DE CULTIVO')) return { ...sib, metradoOt: tierraVal };
          if (sib.desc.toUpperCase().includes('CEMENTO GEM')) return { ...sib, metradoOt: cementoVal };
          return sib;
        });
      }
      if (
        oldItem.ruleId === 'r2' &&
        descUp.includes('CABLE DESNUDO 2/0 AWG') &&
        (target.detalle || oldItem.detalle) === '153'
      ) {
        const cableVal = parseFloat(String(updates.metradoOt)) || 0;
        const prensaVal = Math.ceil(cableVal / 3).toString();
        updated = updated.map(sib => {
          if (
            sib.instanceId === instanceId &&
            sib.desc.toUpperCase().includes('PRENSA PARALELA 1 CONDUCTOR')
          ) {
            return { ...sib, metradoOt: prensaVal };
          }
          return sib;
        });
      }
    }

    const collision = findIntroducedTagCollision(items, updated);
    if (collision) {
      showToast(tagCollisionMessage(collision), 'warn');
      return false;
    }

    const targetTag = newTagPlano || oldTagPlano;
    if (targetTag) setHighlightedTag(targetTag);

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
    const items = backfillInstanceIds(get().items);
    const showToast = useUIStore.getState().showToast;
    const knownRules = useRulesStore.getState().rules;

    if (field === 'partida' || field === 'partidaBalance') {
      showToast('PARTIDA es de solo lectura: se actualiza desde el maestro PARTIDAS', 'warn');
      return false;
    }
    if (field === 'tagUnico') {
      showToast('TAG ÚNICO se genera automáticamente', 'warn');
      return false;
    }

    if (field === 'detalle') {
      value = normalizeDetalle(value);
      if (!isKnownDetalle(value, knownRules)) {
        showToast(`DETALLE "${value}" no existe en ninguna regla: cambio rechazado`, 'warn');
        return false;
      }
    }

    if (field === 'desc') {
      value = String(value).toUpperCase().trim();
      if (!value) {
        showToast('La descripción no puede estar vacía', 'warn');
        return false;
      }
    }

    const principalIds = itemIds.filter(id => items.find(it => it.id === id)?.material === 'P');
    if (principalIds.length === 0) {
      showToast('Solo se editan ítems principales (P). Los consumibles se actualizan desde el P.', 'warn');
      return false;
    }

    const { saveUndoSnapshot } = get();
    saveUndoSnapshot();
    const idSet = new Set(principalIds);
    let currentItems = [...items];
    const instanceIds = instanceIdsForItemIds(currentItems, principalIds);

    if (field === 'detalle') {
      const triggerIds = principalIds.filter(id => {
        const row = currentItems.find(it => it.id === id);
        return row ? isDetalleTriggerRow(row, currentItems) : false;
      });
      if (triggerIds.length === 0) {
        showToast('Solo el ítem principal puede cambiar DETALLE y generar filas', 'warn');
        return false;
      }
      return get().requestDetalleChange(triggerIds[0], value, { rules: knownRules }, triggerIds);
    } else if (field === 'tagPlano' || field === 'plano' || field === 'rev') {
      const nextVal =
        field === 'tagPlano' ? String(value).trim() : String(value).toUpperCase().trim();
      for (const instanceId of instanceIds) {
        const sample = currentItems.find(it => (it.instanceId || it.id) === instanceId);
        if (!sample) continue;
        if (sample.instanceId) {
          currentItems = syncInstanceFields(currentItems, sample.instanceId, { [field]: nextVal });
        } else {
          currentItems = currentItems.map(it =>
            it.id === instanceId
              ? {
                  ...it,
                  [field]: nextVal,
                  tagUnico:
                    it.material === 'P'
                      ? generateTagUnico(
                          field === 'plano' ? nextVal : it.plano,
                          field === 'tagPlano' ? nextVal : it.tagPlano,
                          'P'
                        )
                      : ''
                }
              : it
          );
        }
      }
    } else {
      currentItems = currentItems.map(it => {
        if (!idSet.has(it.id)) return it;
        const upd: TakeoffItem = { ...it, [field]: value };
        if (field === 'material') upd.material = value as MaterialType;
        if (field === 'metradoOt') upd.metradoOt = value;
        upd.tagUnico = upd.material === 'P' ? generateTagUnico(upd.plano, upd.tagPlano, 'P') : '';
        return upd;
      });
    }

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

    if (field === 'detalle') {
      const partidas = loadStoredPartidas();
      const area = localStorage.getItem(STORAGE_KEYS.ACTIVE_AREA) || DEFAULT_AREA;
      currentItems = correlateItemsWithPartidas(currentItems, partidas, area);
    }

    const collision = findIntroducedTagCollision(items, currentItems);
    if (collision) {
      showToast(tagCollisionMessage(collision), 'warn');
      return false;
    }

    const result = assignTagUnicoSuffixes(currentItems);
    saveStoredItems(section, result);
    set({ items: result });
    return true;
  },

  requestDetalleChange: (
    itemId: string,
    newDetalle: string,
    extras: RebuildExtras = {},
    applyToItemIds?: string[]
  ) => {
    const items = backfillInstanceIds(get().items);
    const item = items.find(it => it.id === itemId);
    const showToast = useUIStore.getState().showToast;
    const knownRules = extras.rules || useRulesStore.getState().rules;
    if (!item) return false;
    if (!isDetalleTriggerRow(item, items)) {
      showToast('Solo el ítem principal puede cambiar DETALLE y generar filas', 'warn');
      return false;
    }
    const norm = normalizeDetalle(newDetalle);
    if (!isKnownDetalle(norm, knownRules)) {
      showToast(`DETALLE "${norm}" no existe en ninguna regla: cambio rechazado`, 'warn');
      return false;
    }
    const targetIds = Array.from(new Set([itemId, ...(applyToItemIds || [])]));
    const targets = targetIds
      .map(id => items.find(it => it.id === id))
      .filter((row): row is TakeoffItem => Boolean(row && isDetalleTriggerRow(row, items)));
    const anyChange = targets.some(row => normalizeDetalle(row.detalle || '') !== norm);
    if (!anyChange) {
      showToast('DETALLE no cambió', 'info');
      return false;
    }
    const instanceId = item.instanceId || item.id;
    const previewLines = previewInstanceBom(items, instanceId, norm, {
      ...extras,
      rules: knownRules
    });
    if (previewLines.length === 0) {
      showToast('No hay filas de catálogo para este DETALLE', 'warn');
      return false;
    }
    set({
      pendingDetalleEdit: {
        itemId,
        instanceId,
        newDetalle: norm,
        currentTag: item.tagPlano || '',
        currentDetalle: item.detalle || '',
        previewLines,
        extras: { ...extras, rules: knownRules },
        applyToItemIds: targets.map(row => row.id)
      },
      editingItemId: null
    });
    return true;
  },

  confirmDetalleChange: (tagPlano: string, lines: BomLine[], section: SectionType) => {
    const pending = get().pendingDetalleEdit;
    if (!pending) return false;
    const showToast = useUIStore.getState().showToast;
    get().saveUndoSnapshot();
    let items = backfillInstanceIds(get().items).map(it =>
      it.id === pending.itemId && !it.instanceId ? { ...it, instanceId: pending.instanceId } : it
    );
    const nextTag = (tagPlano || '').trim();
    const anchors = pending.applyToItemIds.length > 0 ? pending.applyToItemIds : [pending.itemId];
    for (const anchorId of anchors) {
      const anchor = items.find(it => it.id === anchorId);
      if (!anchor) continue;
      const instanceId = anchor.instanceId || anchor.id;
      items = items.map(it =>
        it.id === anchorId && !it.instanceId ? { ...it, instanceId } : it
      );
      items = applyInstanceDetalleChange(items, {
        instanceId,
        anchorItemId: anchorId,
        newDetalle: pending.newDetalle,
        tagPlano: anchorId === pending.itemId ? nextTag : (anchor.tagPlano || '').trim(),
        lines
      });
    }
    const partidas = loadStoredPartidas();
    const area = localStorage.getItem(STORAGE_KEYS.ACTIVE_AREA) || DEFAULT_AREA;
    const correlated = correlateItemsWithPartidas(items, partidas, area);
    const result = assignTagUnicoSuffixes(correlated);
    saveStoredItems(section, result);
    if (nextTag) get().setHighlightedTag(nextTag);
    set({ items: result, pendingDetalleEdit: null, editingItemId: null });
    showToast(`DETALLE ${pending.newDetalle} aplicado — ${anchors.length} implementación(es)`, 'success');
    return true;
  },

  cancelDetalleChange: () => {
    set({ pendingDetalleEdit: null });
  },

  deleteItem: (id: string, section: SectionType) => {
    const updated = get().items.filter(it => it.id !== id);
    saveStoredItems(section, updated);
    set({ items: updated });
  },

  setItems: (items: TakeoffItem[], section: SectionType) => {
    const next = backfillInstanceIds(items);
    saveStoredItems(section, next);
    set({ items: next });
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
    const { customPlano, customRev, items, saveUndoSnapshot } = get();
    saveUndoSnapshot();
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

  syncContextToItemIds: (itemIds: string[], section: SectionType) => {
    if (!itemIds || itemIds.length === 0) return false;
    const { customPlano, customRev, items, saveUndoSnapshot } = get();
    saveUndoSnapshot();
    const instanceIds = instanceIdsForItemIds(items, itemIds);
    let updated = items;
    for (const instanceId of instanceIds) {
      const sample = updated.find(it => (it.instanceId || it.id) === instanceId);
      if (!sample) continue;
      if (sample.instanceId) {
        updated = syncInstanceFields(updated, sample.instanceId, {
          plano: customPlano,
          rev: customRev
        });
      } else {
        updated = updated.map(it =>
          it.id === instanceId
            ? {
                ...it,
                plano: customPlano,
                rev: customRev,
                tagUnico:
                  it.material === 'P' ? generateTagUnico(customPlano, it.tagPlano, 'P') : ''
              }
            : it
        );
      }
    }
    const finalItems = assignTagUnicoSuffixes(updated);
    saveStoredItems(section, finalItems);
    set({ items: finalItems });
    return true;
  },

  correlateAll: (partidas: PartidaRecord[], activeArea: string, section: SectionType) => {
    const current = get().items;
    const correlated = correlateItemsWithPartidas(current, partidas, activeArea);
    saveStoredItems(section, correlated);
    set({ items: correlated });
  }
}));
