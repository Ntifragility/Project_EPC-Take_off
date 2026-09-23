import { createStore } from '../../../shared/lib/store';
import { TakeoffRule, DetalleVariantItem } from '../../../entities/takeoff-rule/model/types';
import { SectionType } from '../../../shared/types/common';
import { loadStoredRules, saveStoredRules } from '../../../shared/lib/storage';
import {
  saveTakeoffRuleToSupabase,
  deleteTakeoffRuleFromSupabase,
  saveDetalleVariantToSupabase
} from '../../../shared/api/supabase';
import { updateSingleDynamicVariant } from '../../../entities/takeoff-rule/model/detalleVariants';

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
    category?: 'CABLE_2_0' | 'BARRA_POT' | 'BARRA_INST'
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

  loadRules: (section: SectionType) => {
    const rules = loadStoredRules(section);
    set({ rules });
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

    const orderIndex = isNew ? get().rules.length : (get().rules.findIndex(r => r.id === rule.id) !== -1 ? get().rules.findIndex(r => r.id === rule.id) : 0);
    await saveTakeoffRuleToSupabase(rule, section, orderIndex);

    let nextRules: TakeoffRule[];
    if (isNew) {
      nextRules = [...get().rules, rule];
    } else {
      nextRules = get().rules.map(r => (r.id === rule.id ? rule : r));
    }

    saveStoredRules(section, nextRules);
    set({ rules: nextRules });
  },

  deleteRule: async (id: string, section: SectionType) => {
    await deleteTakeoffRuleFromSupabase(id);
    const nextRules = get().rules.filter(r => r.id !== id);
    saveStoredRules(section, nextRules);
    set({ rules: nextRules });
  },

  saveDetalleVariant: async (
    area: string,
    detalleCode: string,
    itemsToSave: DetalleVariantItem[],
    category: 'CABLE_2_0' | 'BARRA_POT' | 'BARRA_INST' = 'CABLE_2_0'
  ) => {
    try {
      updateSingleDynamicVariant(area, detalleCode, itemsToSave, category);
      set({ detalleVariantsVersion: get().detalleVariantsVersion + 1 });

      const areaDb = area.toUpperCase().includes('HUMED') ? 'AREA HUMEDA' : 'AREA SECA';
      await saveDetalleVariantToSupabase({
        id: `${areaDb}_${category}_${detalleCode}`,
        area: areaDb,
        category,
        detalle_code: detalleCode,
        items: itemsToSave
      });
      return true;
    } catch (err) {
      console.error('Error saving detalle variant:', err);
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
