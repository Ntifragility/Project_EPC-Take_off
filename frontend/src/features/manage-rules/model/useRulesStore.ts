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
import { MasterImportPlan } from './rulesMasterTable';

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
  applyMasterImport: (
    plan: MasterImportPlan,
    section: SectionType
  ) => Promise<{ ok: boolean; remoteSynced: boolean }>;
}

export type RulesStore = RulesState & RulesActions;

const initialSection = (localStorage.getItem('epc-active-section') as SectionType) || 'pat';
const initialRules = loadStoredRules(initialSection);

export function syncRulesToDynamicVariants(rules: TakeoffRule[]) {
  for (const r of rules) {
    if (r.id === 'r2' || r.id === 'r8' || r.id === 'r9') continue;
    const upTrigger = (r.trigger || '').trim().toUpperCase();
    const detCode = r.detalle || r.defaultDetalle;
    if (detCode && (upTrigger.includes('2/0') || upTrigger.includes('BARRA'))) {
      const cat = upTrigger.includes('BARRA INST')
        ? 'BARRA_INST'
        : upTrigger.includes('BARRA')
        ? 'BARRA_POT'
        : 'CABLE_2_0';
      const targetAreas = r.areas && r.areas.length > 0 ? r.areas : ['AREA HUMEDA'];
      const variantItems: DetalleVariantItem[] = r.subitems.map(s => {
        const rawOt = s.formula ? s.formula : (s.qty !== undefined && s.qty !== '') ? s.qty : 1;
        return {
          desc: s.desc,
          qty: s.qty,
          unit: s.unit,
          formula: s.formula,
          material: s.material,
          ot: rawOt
        };
      });
      for (const area of targetAreas) {
        updateSingleDynamicVariant(area, detCode, variantItems, cat);
      }
    }
  }
}

export const useRulesStore = createStore<RulesStore>((set, get) => ({
  rules: initialRules,
  collapsedRuleAreas: new Set<string>(['AREA SECA', 'AREA HUEMDA']),
  detalleVariantsVersion: 0,

  loadRules: async (section: SectionType) => {
    // 1. Instant local state
    const cachedRules = loadStoredRules(section);
    set({ rules: cachedRules });
    syncRulesToDynamicVariants(cachedRules);
    set({ detalleVariantsVersion: get().detalleVariantsVersion + 1 });

    // 2. Refresh from Supabase in background
    try {
      const remoteRules = await fetchUnifiedRules(section);
      const activeRules = remoteRules && remoteRules.length > 0 ? remoteRules : cachedRules;
      if (remoteRules && remoteRules.length > 0) {
        set({ rules: remoteRules });
      }

      // Hydrate detalle variants from Supabase FIRST, then overlay custom rules so they aren't wiped
      const { data: cloudVariants, error: varErr } = await fetchDetalleVariantsFromSupabase();
      if (!varErr && cloudVariants && cloudVariants.length > 0) {
        updateDynamicVariants(cloudVariants);
      }

      syncRulesToDynamicVariants(activeRules);
      set({ detalleVariantsVersion: get().detalleVariantsVersion + 1 });
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
    syncRulesToDynamicVariants([rule]);
    set({ rules: nextRules, detalleVariantsVersion: get().detalleVariantsVersion + 1 });

    // Sync with Supabase asynchronously without blocking local state
    try {
      const orderIndex = isNew ? nextRules.length - 1 : Math.max(0, nextRules.findIndex(r => r.id === rule.id));
      await saveUnifiedRule(rule, section, orderIndex);

      // If this rule belongs to Cable 2/0 or Barra, also mirror into detalle_variants table in Supabase
      const upTrigger = rule.trigger.trim().toUpperCase();
      const detCode = rule.detalle || rule.defaultDetalle;
      if (detCode && rule.id !== 'r2' && rule.id !== 'r8' && rule.id !== 'r9' && (upTrigger.includes('2/0') || upTrigger.includes('BARRA'))) {
        const cat = upTrigger.includes('BARRA INST')
          ? 'BARRA_INST'
          : upTrigger.includes('BARRA')
          ? 'BARRA_POT'
          : 'CABLE_2_0';
        const targetAreas = rule.areas && rule.areas.length > 0 ? rule.areas : ['AREA HUMEDA'];
        const variantItems: DetalleVariantItem[] = rule.subitems.map(s => {
          const rawOt = s.formula ? s.formula : (s.qty !== undefined && s.qty !== '') ? s.qty : 1;
          return {
            desc: s.desc,
            qty: s.qty,
            unit: s.unit,
            formula: s.formula,
            material: s.material,
            ot: rawOt
          };
        });
        for (const area of targetAreas) {
          await get().saveDetalleVariant(area, detCode, variantItems, cat);
        }
      }

      useUIStore.getState().showToast('Regla guardada con éxito', 'success');
    } catch (err) {
      console.warn('Supabase sync background notice:', err);
      useUIStore.getState().showToast(
        'Regla guardada localmente (Base de Datos no disponible o bloqueada por cortafuegos)',
        'info'
      );
    }
  },

  deleteRule: async (id: string, section: SectionType) => {
    const nextRules = get().rules.filter(r => r.id !== id);
    saveStoredRules(section, nextRules);
    set({ rules: nextRules });
    try {
      await deleteTakeoffRuleFromSupabase(id);
      await deleteRuleLines(id);
      useUIStore.getState().showToast('Regla eliminada de Base de Datos', 'info');
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
        console.warn('Detalle saved locally. Supabase synchronization notice:', res.error);
        useUIStore.getState().showToast(
          'Detalle guardado localmente (Offline). Base de Datos no disponible o bloqueada por cortafuegos.',
          'info'
        );
        return true;
      }

      useUIStore.getState().showToast('Detalle guardado con éxito', 'success');
      return true;
    } catch (err) {
      console.warn('Error saving detalle variant to Supabase (saved locally):', err);
      useUIStore.getState().showToast(
        'Detalle guardado localmente. Base de Datos no disponible.',
        'info'
      );
      return true;
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
        useUIStore.getState().showToast(`Advertencia al eliminar en Base de Datos: ${res.error}`, 'warn');
      } else {
        useUIStore.getState().showToast('Detalle eliminado de Base de Datos', 'info');
      }
      return true;
    } catch (err) {
      console.error('Error deleting detalle variant:', err);
      return false;
    }
  },

  setRules: (rules: TakeoffRule[], section: SectionType) => {
    saveStoredRules(section, rules);
    syncRulesToDynamicVariants(rules);
    set({ rules });
  },

  incrementVariantsVersion: () => {
    syncRulesToDynamicVariants(get().rules);
    set({ detalleVariantsVersion: get().detalleVariantsVersion + 1 });
  },

  applyMasterImport: async (plan: MasterImportPlan, section: SectionType) => {
    const updatedMap = new Map<string, TakeoffRule>();
    plan.updatedRules.forEach(rule => updatedMap.set(rule.id, rule));

    const currentRules = get().rules;
    const replaced = currentRules.map(r => updatedMap.get(r.id) ?? r);
    const nextRules =
      plan.createdRules.length > 0 ? [...replaced, ...plan.createdRules] : replaced;

    if (plan.updatedRules.length > 0 || plan.createdRules.length > 0) {
      saveStoredRules(section, nextRules);
      syncRulesToDynamicVariants(nextRules);
    }

    plan.variants.forEach(variant => {
      updateSingleDynamicVariant(
        variant.area,
        variant.detalleCode,
        variant.items,
        variant.category,
        variant.subArea
      );
    });

    set({
      rules: nextRules,
      detalleVariantsVersion: get().detalleVariantsVersion + 1
    });

    let remoteSynced = true;

    for (const rule of [...plan.updatedRules, ...plan.createdRules]) {
      try {
        const orderIndex = Math.max(
          0,
          nextRules.findIndex(r => r.id === rule.id)
        );
        await saveUnifiedRule(rule, section, orderIndex);
      } catch (err) {
        remoteSynced = false;
        console.warn('Master import rule sync notice:', err);
      }
    }

    for (const variant of plan.variants) {
      try {
        const areaDb = variant.area.toUpperCase().includes('HUMED') ? 'AREA HUMEDA' : 'AREA SECA';
        const effectiveSubArea =
          areaDb === 'AREA HUMEDA' ? variant.subArea || 'NO_CORROSIVO' : 'NO_CORROSIVO';
        const id = `${areaDb}_${effectiveSubArea}_${variant.category}_${variant.detalleCode}`;
        const res = await saveDetalleVariantToSupabase({
          id,
          area: areaDb,
          sub_area: effectiveSubArea,
          category: variant.category,
          detalle_code: variant.detalleCode,
          items: variant.items
        });
        if (!res.success) {
          remoteSynced = false;
        }
      } catch (err) {
        remoteSynced = false;
        console.warn('Master import variant sync notice:', err);
      }
    }

    return { ok: true, remoteSynced };
  }
}));
