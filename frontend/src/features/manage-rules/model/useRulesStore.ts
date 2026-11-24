import { createStore } from '../../../shared/lib/store';
import { TakeoffRule, DetalleVariantItem } from '../../../entities/takeoff-rule/model/types';
import { SectionType, SubAreaHumeda } from '../../../shared/types/common';
import { loadStoredRules, saveStoredRules, loadStoredVariants, saveStoredVariants } from '../../../shared/lib/storage';
import {
  saveDetalleVariantToSupabase,
  deleteDetalleVariantFromSupabase,
  fetchDetalleVariantsFromSupabase,
  deleteTakeoffRuleCascade
} from '../../../shared/api/supabase';
import { deleteRuleLines, replaceRuleLines } from '../../sync-cloud/model/publishRuleCatalog';
import { updateDynamicVariants, updateSingleDynamicVariant, deleteSingleDynamicVariant, normalizeVariantSubArea } from '../../../entities/takeoff-rule/model/detalleVariants';
import { variantRowId, familyCategory } from '../../../entities/takeoff-rule/model/ruleFamily';
import { fetchUnifiedRules, saveUnifiedRule, saveVariantAsOverrides, deleteVariantOverrides } from '../../../entities/takeoff-rule/api/ruleRepository';
import { hydrateVariantFromOverrides } from '../../../entities/takeoff-rule/model/detalleVariants';
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
    subArea?: SubAreaHumeda,
    ownerRuleId?: string
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

/** (area × subArea) partitions a rule's inside-section rows occupy. */
export function ruleVariantScopes(rule: TakeoffRule): Array<{ area: string; subArea: SubAreaHumeda }> {
  const areas = rule.areas && rule.areas.length > 0 ? rule.areas : ['AREA SECA', 'AREA HUMEDA'];
  const scopes: Array<{ area: string; subArea: SubAreaHumeda }> = [];
  for (const area of areas) {
    const up = (area || '').toUpperCase();
    const isHumeda = up.includes('HUMED') || up.includes('HUEMD');
    if (!isHumeda) {
      scopes.push({ area, subArea: 'NO_CORROSIVO' });
    } else if (rule.subAreas && rule.subAreas.length > 0) {
      for (const sub of rule.subAreas) scopes.push({ area, subArea: sub });
    } else {
      // Legacy/global rule: canonical partition only. Other partitions keep
      // whatever rows they already have (no cross-partition writes).
      scopes.push({ area, subArea: 'NO_CORROSIVO' });
    }
  }
  return scopes;
}

/**
 * Scoped variant stamp for family-rule saves. Creates/updates the variant row
 * for each partition in the rule's own scope with an ownership link
 * (rule_id), so later deletes are precise. No-ops for anchors/standalone.
 */
async function stampFamilyRuleVariant(
  rule: TakeoffRule,
  saveVariant: RulesActions['saveDetalleVariant']
): Promise<void> {
  if (rule.id === 'r2' || rule.id === 'r8' || rule.id === 'r9') return;
  const cat = familyCategory(rule.trigger);
  if (!cat) return;
  const detCode = (rule.detalle || rule.defaultDetalle || '').trim().toUpperCase();
  if (!detCode) return;
  const variantItems: DetalleVariantItem[] = (rule.subitems || []).map(s => {
    const rawOt = s.formula ? s.formula : s.qty !== undefined && s.qty !== '' ? s.qty : 1;
    return {
      desc: s.desc,
      qty: s.qty,
      unit: s.unit,
      formula: s.formula,
      material: s.material,
      ot: rawOt
    };
  });
  for (const scope of ruleVariantScopes(rule)) {
    try {
      await saveVariant(scope.area, detCode, variantItems, cat, scope.subArea, rule.id);
    } catch (e) {
      console.warn('Scoped variant stamp notice:', e);
    }
  }
}

const initialSection = (localStorage.getItem('epc-active-section') as SectionType) || 'pat';
const initialRules = loadStoredRules(initialSection);


const CATEGORY_ANCHOR: Record<string, string> = { CABLE_2_0: 'r2', BARRA_POT: 'r8', BARRA_INST: 'r9' };

export const useRulesStore = createStore<RulesStore>((set, get) => ({
  rules: initialRules,
  collapsedRuleAreas: new Set<string>(['AREA SECA', 'AREA HUEMDA']),
  detalleVariantsVersion: 0,

  loadRules: async (section: SectionType) => {
    // Supabase-first: instant offline cache paint, then authoritative refresh.
    // localStorage is ONLY an offline cache of what Supabase returned — no seeds.
    const cachedRules = loadStoredRules(section);
    const cachedVariants = loadStoredVariants();
    set({ rules: cachedRules });
    if (cachedVariants.length > 0) {
      updateDynamicVariants(cachedVariants);
    }
    set({ detalleVariantsVersion: get().detalleVariantsVersion + 1 });

    // 2. Refresh from Supabase in background
    try {
      const remoteRules = await fetchUnifiedRules(section);
      if (remoteRules && remoteRules.length > 0) {
        set({ rules: remoteRules });
      }

      // Hydrate detalle variants from Supabase FIRST (MERGE semantics —
      // updateDynamicVariants never wipes partitions it didn't receive),
      // then persist the authoritative snapshot to the offline cache.
      const { data: cloudVariants, error: varErr } = await fetchDetalleVariantsFromSupabase();
      if (!varErr && cloudVariants && cloudVariants.length > 0) {
        updateDynamicVariants(cloudVariants);
        saveStoredVariants(cloudVariants);
      }
      // Post-07 path: hydrate the variant cache from rule_item_overrides so
      // the catalog survives the detalle_variants drop. No-op pre-07 dupes
      // merge into the same in-memory maps.
      try {
        for (const r of remoteRules || []) {
          if (r.overrides && r.overrides.length > 0) hydrateVariantFromOverrides(r.overrides as any);
        }
      } catch { /* best-effort secondary source */ }

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
    set({ rules: nextRules, detalleVariantsVersion: get().detalleVariantsVersion + 1 });

    // Sync with Supabase asynchronously without blocking local state
    try {
      const orderIndex = isNew ? nextRules.length - 1 : Math.max(0, nextRules.findIndex(r => r.id === rule.id));
      await saveUnifiedRule(rule, section, orderIndex);

      // Scoped variant stamp for non-anchor family rules: a clone saved from
      // an inside-section row backs EXACTLY the (area × subArea) partitions in
      // its own scope — never a substring-matched mirror. Anchors (r2/r8/r9)
      // and standalone rules never touch variant rows here.
      await stampFamilyRuleVariant(rule, get().saveDetalleVariant);

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
    const doomed = get().rules.find(r => r.id === id);
    const nextRules = get().rules.filter(r => r.id !== id);
    saveStoredRules(section, nextRules);
    // Family-clone delete removes the rule AND its scoped variant rows
    // (same canonical ids the stamp created). Plain variant rows under a
    // different code, other partitions, and standalone rules are untouched.
    // Anchors (r2/r8/r9) never trigger variant cleanup.
    if (doomed && doomed.id !== 'r2' && doomed.id !== 'r8' && doomed.id !== 'r9') {
      const cat = familyCategory(doomed.trigger);
      const detCode = (doomed.detalle || doomed.defaultDetalle || '').trim().toUpperCase();
      if (cat && detCode) {
        for (const scope of ruleVariantScopes(doomed)) {
          try {
            await get().deleteDetalleVariant(scope.area, detCode, cat, scope.subArea);
          } catch (e) {
            console.warn('Scoped variant cleanup notice:', e);
          }
        }
      } else if (doomed.originRuleId) {
        // Legacy ownership link fallback.
        try {
          const variants = loadStoredVariants();
          const owned = variants.find(
            v => v.id === doomed.originRuleId || (v as any).rule_id === doomed.id
          );
          if (owned) {
            await get().deleteDetalleVariant(
              owned.area,
              owned.detalle_code || detCode,
              (owned.category as 'CABLE_2_0' | 'BARRA_POT' | 'BARRA_INST') || 'CABLE_2_0',
              (owned.sub_area as SubAreaHumeda) || undefined
            );
          }
        } catch (e) {
          console.warn('Owned variant cleanup notice:', e);
        }
      }
    }
    set({ rules: nextRules });
    try {
      await deleteTakeoffRuleCascade(id);
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
    subArea?: SubAreaHumeda,
    ownerRuleId?: string
  ) => {
    try {
      const effectiveSubArea = normalizeVariantSubArea(area, subArea);
      updateSingleDynamicVariant(area, detalleCode, itemsToSave, category, effectiveSubArea);
      set({ detalleVariantsVersion: get().detalleVariantsVersion + 1 });

      const id = variantRowId(area, effectiveSubArea, category, detalleCode);
      const areaDb = (area || '').toUpperCase().includes('HUMED') || (area || '').toUpperCase().includes('HUEMD')
        ? 'AREA HUMEDA'
        : 'AREA SECA';
      const res = await saveDetalleVariantToSupabase({
        id,
        area: areaDb,
        sub_area: effectiveSubArea,
        category,
        detalle_code: detalleCode,
        items: itemsToSave,
        ...(ownerRuleId ? { rule_id: ownerRuleId } : {})
      });
      // Dual-write: mirror into rule_item_overrides (post-07 source of truth).
      try {
        await saveVariantAsOverrides(CATEGORY_ANCHOR[category] || 'r2', detalleCode, itemsToSave as any);
      } catch { /* best-effort mirror */ }

      if (res.success) {
        // Keep the offline variant cache in sync with the authoritative write.
        try {
          const { data } = await fetchDetalleVariantsFromSupabase();
          if (data) saveStoredVariants(data as any);
        } catch {}
      }

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
      const effectiveSubArea = normalizeVariantSubArea(area, subArea);
      // Scoped delete: ONLY the (area, subArea, category, code) partition row,
      // by canonical id. Never a business-key sweep across sub-areas.
      deleteSingleDynamicVariant(area, detalleCode, category, effectiveSubArea);
      set({ detalleVariantsVersion: get().detalleVariantsVersion + 1 });

      const id = variantRowId(area, effectiveSubArea, category, detalleCode);
      const res = await deleteDetalleVariantFromSupabase(id);
      try {
        await deleteVariantOverrides(CATEGORY_ANCHOR[category] || 'r2', detalleCode);
      } catch { /* best-effort mirror */ }

      if (res.success) {
        try {
          const { data } = await fetchDetalleVariantsFromSupabase();
          if (data) saveStoredVariants(data as any);
        } catch {}
      }

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
    set({ rules });
  },

  incrementVariantsVersion: () => {
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
    }

    plan.variants.forEach(variant => {
      updateSingleDynamicVariant(
        variant.area,
        variant.detalleCode,
        variant.items,
        variant.category,
        normalizeVariantSubArea(variant.area, variant.subArea)
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
          const effectiveSubArea = normalizeVariantSubArea(variant.area, variant.subArea);
        const areaDb = (variant.area || '').toUpperCase().includes('HUMED') || (variant.area || '').toUpperCase().includes('HUEMD')
          ? 'AREA HUMEDA'
          : 'AREA SECA';
        const id = variantRowId(variant.area, effectiveSubArea, variant.category, variant.detalleCode);
        const res = await saveDetalleVariantToSupabase({
          id,
          area: areaDb,
          sub_area: effectiveSubArea,
          category: variant.category,
          detalle_code: variant.detalleCode,
          items: variant.items
        });
        try {
          await saveVariantAsOverrides(CATEGORY_ANCHOR[variant.category] || 'r2', variant.detalleCode, variant.items as any);
        } catch { /* best-effort mirror */ }
        if (!res.success) {
          remoteSynced = false;
        }
      } catch (err) {
        remoteSynced = false;
        console.warn('Master import variant sync notice:', err);
      }
    }

    try {
      const { data } = await fetchDetalleVariantsFromSupabase();
      if (data) saveStoredVariants(data as any);
    } catch {}

    return { ok: true, remoteSynced };
  }
}));
