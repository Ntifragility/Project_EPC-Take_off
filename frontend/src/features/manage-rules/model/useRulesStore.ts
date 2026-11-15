import { createStore } from '../../../shared/lib/store';
import { TakeoffRule, DetalleVariantItem } from '../../../entities/takeoff-rule/model/types';
import { SectionType, SubAreaHumeda } from '../../../shared/types/common';
import { loadStoredRules, saveStoredRules } from '../../../shared/lib/storage';
import {
  saveTakeoffRuleToSupabase,
  deleteTakeoffRuleFromSupabase,
  saveDetalleVariantToSupabase,
  deleteDetalleVariantFromSupabase,
  fetchDetalleVariantsFromSupabase
} from '../../../shared/api/supabase';
import { deleteRuleLines, replaceRuleLines } from '../../sync-cloud/model/publishRuleCatalog';
import { updateDynamicVariants, updateSingleDynamicVariant, deleteSingleDynamicVariant } from '../../../entities/takeoff-rule/model/detalleVariants';
import { fetchUnifiedRules, saveUnifiedRule } from '../../../entities/takeoff-rule/api/ruleRepository';
import { useUIStore } from '../../filter-takeoff/model/useUIStore';

export interface RulesState {
  rules: TakeoffRule[];
  collapsedRuleAreas: Set<string>;
  detalleVariantsVersion: number;
}

export interface RulesActions {
  loadRules: (section: SectionType) => void;
  toggleRuleAreaCollapse: (area: string) => void;
  saveRule: (rule: TakeoffRule, isNew: boolean, section: SectionType) => Promise<void>;
  deleteRule: (id: string, section: SectionType) => Promise<void>;
  saveDetalleVariant: (
    area: string,
    detalleCode: string,
    itemsToSave: DetalleVariantItem[],
    category?: 'CABLE_2_0' | 'BARRA_POT' | 'BARRA_INST',
    subArea?: SubAreaHumeda
  ) => Promise<boolean>;
  deleteDetalleVariant: (
    area: string,
    detalleCode: string,
    category?: 'CABLE_2_0' | 'BARRA_POT' | 'BARRA_INST',
    subArea?: SubAreaHumeda
  ) => Promise<boolean>;
  setRules: (rules: TakeoffRule[], section: SectionType) => void;
  incrementVariantsVersion: () => void;
}

export type RulesStore = RulesState & RulesActions;

const initialSection = (localStorage.getItem('epc-active-section') as SectionType) || 'pat';
const initialRules = loadStoredRules(initialSection);

export const useRulesStore = createStore<RulesStore>((set, get) => ({
  rules: initialRules,
  collapsedRuleAreas: new Set<string>(['AREA SECA', 'AREA HUEMDA']),
  detalleVariantsVersion: 0,

  loadRules: async (section: SectionType) => {
    // 1. Instant local state
    const cachedRules = loadStoredRules(section);
    set({ rules: cachedRules });

    // 2. Refresh from Supabase in background
    try {
      const remoteRules = await fetchUnifiedRules(section);
      if (remoteRules && remoteRules.length > 0) {
        set({ rules: remoteRules });
      }

      // Also hydrate detalle variants from Supabase as single source of truth
      const { data: cloudVariants, error: varErr } = await fetchDetalleVariantsFromSupabase();
      if (!varErr && cloudVariants && cloudVariants.length > 0) {
        updateDynamicVariants(cloudVariants);
        set({ detalleVariantsVersion: get().detalleVariantsVersion + 1 });
      }
    } catch (e) {
      console.warn('Background rule fetch failed:', e);
    }
  },

  toggleRuleAreaCollapse: (area: string) => {
    const current = new Set(get().collapsedRuleAreas);
    if (current.has(area)) {
      current.delete(area);
    } else {
      current.add(area);
    }
    set({ collapsedRuleAreas: current });
  },

  saveRule: async (rule: TakeoffRule, isNew: boolean, section: SectionType) => {
    if (!rule.trigger.trim()) {
      throw new Error('El nombre de la regla / trigger es requerido.');
    }
    if (rule.subitems.length === 0) {
      throw new Error('La regla debe tener al menos un sub-ítem.');
    }

    let nextRules: TakeoffRule[];
    if (isNew) {
      nextRules = [...get().rules, rule];
    } else {
      nextRules = get().rules.map(r => (r.id === rule.id ? rule : r));
    }

    saveStoredRules(section, nextRules);
    set({ rules: nextRules });

    // Sync with Supabase asynchronously without blocking local state
    try {
      const orderIndex = isNew ? nextRules.length - 1 : Math.max(0, nextRules.findIndex(r => r.id === rule.id));
      await saveUnifiedRule(rule, section, orderIndex);
      await replaceRuleLines(rule);
      useUIStore.getState().showToast('Regla guardada en Supabase con éxito', 'success');
    } catch (err) {
      console.warn('Supabase sync background notice:', err);
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      useUIStore.getState().showToast(`Regla guardada localmente, pero falló la sincronización con Supabase: ${msg}`, 'warn');
    }
  },

  deleteRule: async (id: string, section: SectionType) => {
    const nextRules = get().rules.filter(r => r.id !== id);
    saveStoredRules(section, nextRules);
    set({ rules: nextRules });
    try {
      await deleteTakeoffRuleFromSupabase(id);
      await deleteRuleLines(id);
      useUIStore.getState().showToast('Regla eliminada de Supabase', 'info');
    } catch (err) {
      console.warn('Supabase delete background notice:', err);
    }
  },

  saveDetalleVariant: async (
    area: string,
    detalleCode: string,
    itemsToSave: DetalleVariantItem[],
    category: 'CABLE_2_0' | 'BARRA_POT' | 'BARRA_INST' = 'CABLE_2_0',
    subArea?: SubAreaHumeda
  ) => {
    try {
      updateSingleDynamicVariant(area, detalleCode, itemsToSave, category, subArea);
      set({ detalleVariantsVersion: get().detalleVariantsVersion + 1 });

      const areaDb = area.toUpperCase().includes('HUMED') ? 'AREA HUMEDA' : 'AREA SECA';
      const effectiveSubArea = areaDb === 'AREA HUMEDA' ? (subArea || 'NO_CORROSIVO') : 'NO_CORROSIVO';
      const id = `${areaDb}_${effectiveSubArea}_${category}_${detalleCode}`;
      const res = await saveDetalleVariantToSupabase({
        id,
        area: areaDb,
        sub_area: effectiveSubArea,
        category,
        detalle_code: detalleCode,
        items: itemsToSave
      });

      if (!res.success) {
        console.error('Failed to save detalle variant to Supabase:', res.error);
        useUIStore.getState().showToast(`Error al guardar en Supabase: ${res.error}`, 'warn');
        return false;
      }

      useUIStore.getState().showToast('Detalle guardado en Supabase con éxito', 'success');
      return true;
    } catch (err) {
      console.error('Error saving detalle variant:', err);
      const msg = err instanceof Error ? err.message : 'Error desconocido al guardar';
      useUIStore.getState().showToast(`Error al guardar detalle: ${msg}`, 'warn');
      return false;
    }
  },

  deleteDetalleVariant: async (
    area: string,
    detalleCode: string,
    category: 'CABLE_2_0' | 'BARRA_POT' | 'BARRA_INST' = 'CABLE_2_0',
    subArea?: SubAreaHumeda
  ) => {
    try {
      deleteSingleDynamicVariant(area, detalleCode, category, subArea);
      set({ detalleVariantsVersion: get().detalleVariantsVersion + 1 });

      const areaDb = area.toUpperCase().includes('HUMED') ? 'AREA HUMEDA' : 'AREA SECA';
      const effectiveSubArea = areaDb === 'AREA HUMEDA' ? (subArea || 'NO_CORROSIVO') : 'NO_CORROSIVO';
      const id = `${areaDb}_${effectiveSubArea}_${category}_${detalleCode}`;
      const res = await deleteDetalleVariantFromSupabase(id, {
        area: areaDb,
        category,
        detalle_code: detalleCode,
        sub_area: effectiveSubArea
      });

      if (!res.success) {
        console.warn('Supabase delete detalle notice:', res.error);
        useUIStore.getState().showToast(`Advertencia al eliminar en Supabase: ${res.error}`, 'warn');
      } else {
        useUIStore.getState().showToast('Detalle eliminado de Supabase', 'info');
      }
      return true;
    } catch (err) {
      console.error('Error deleting detalle variant:', err);
      return false;
    }
  },

  setRules: (rules: TakeoffRule[], section: SectionType) => {
    saveStoredRules(section, rules);
    set({ rules });
  },

  incrementVariantsVersion: () => {
    set({ detalleVariantsVersion: get().detalleVariantsVersion + 1 });
  }
}));
