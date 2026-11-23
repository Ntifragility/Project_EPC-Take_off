import { createStore } from '../../../shared/lib/store';
import { supabase } from '../../../shared/api/supabase';
import {
  RejectionRule,
  RejectionRuleScope,
  defaultRejectionRules,
  renderRuleMessage
} from './rejectionRules';

const CACHE_KEY = 'epc-rejection-rules-cache';
const TABLE = 'rejection_rules';

export interface RejectionRulesState {
  rules: RejectionRule[];
  loaded: boolean;
  showModal: boolean;
  syncing: boolean;
}

export interface RejectionRulesActions {
  loadRules: () => Promise<void>;
  saveRule: (rule: RejectionRule) => Promise<boolean>;
  resetRule: (id: string) => Promise<boolean>;
  resetAll: () => Promise<boolean>;
  setShowModal: (show: boolean) => void;
  getRule: (id: string) => RejectionRule | undefined;
  isEnabled: (id: string) => boolean;
  message: (id: string, vars?: Record<string, string | number>) => string;
  paramText: (id: string, key: string, fallback?: string) => string;
  paramBool: (id: string, key: string, fallback?: boolean) => boolean;
  paramNum: (id: string, key: string, fallback?: number) => number;
}

export type RejectionRulesStore = RejectionRulesState & RejectionRulesActions;

function loadCache(): RejectionRule[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as RejectionRule[];
  } catch (err) {
    console.warn('Rejection rules cache read failed:', err);
  }
  return null;
}

function saveCache(rules: RejectionRule[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(rules));
  } catch (err) {
    console.warn('Rejection rules cache write failed:', err);
  }
}

function rowToRule(row: any): RejectionRule {
  const fallback = defaultRejectionRules().find(d => d.id === row.id);
  return {
    id: row.id,
    scope: (row.scope as RejectionRuleScope) || fallback?.scope || 'metrado',
    name: row.name ?? fallback?.name ?? row.id,
    description: row.description ?? fallback?.description ?? '',
    enabled: row.enabled ?? true,
    message: row.message ?? fallback?.message ?? '',
    params: (row.params && typeof row.params === 'object' ? row.params : fallback?.params) || {},
    paramDefs: fallback?.paramDefs || [],
    updatedAt: row.updated_at
  };
}

function ruleToRow(rule: RejectionRule): Record<string, any> {
  return {
    id: rule.id,
    scope: rule.scope,
    name: rule.name,
    description: rule.description,
    enabled: rule.enabled,
    message: rule.message,
    params: rule.params,
    updated_at: new Date().toISOString()
  };
}

async function fetchRemote(): Promise<RejectionRule[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw error;
    if (!data || data.length === 0) return null;
    return (data as any[]).map(rowToRule);
  } catch (err) {
    console.warn('Rejection rules fetch notice:', err);
    return null;
  }
}

/** Merges stored rows over defaults so new built-in rules appear automatically. */
function mergeWithDefaults(stored: RejectionRule[]): RejectionRule[] {
  const byId = new Map(stored.map(r => [r.id, r]));
  return defaultRejectionRules().map(def => {
    const saved = byId.get(def.id);
    if (!saved) return def;
    return { ...def, enabled: saved.enabled, message: saved.message, params: { ...def.params, ...saved.params } };
  });
}

export const useRejectionRulesStore = createStore<RejectionRulesStore>((set, get) => ({
  rules: mergeWithDefaults(loadCache() || []),
  loaded: false,
  showModal: false,
  syncing: false,

  setShowModal: (show: boolean) => set({ showModal: show }),

  getRule: (id: string) => get().rules.find(r => r.id === id),

  isEnabled: (id: string) => {
    const rule = get().rules.find(r => r.id === id);
    return rule ? rule.enabled : true;
  },

  message: (id: string, vars?: Record<string, string | number>) => {
    const rule = get().rules.find(r => r.id === id);
    if (!rule) return '';
    return renderRuleMessage(rule.message, vars || {});
  },

  paramText: (id: string, key: string, fallback = '') => {
    const rule = get().rules.find(r => r.id === id);
    const val = rule?.params?.[key];
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    const def = defaultRejectionRules().find(d => d.id === id)?.params?.[key];
    return typeof def === 'string' ? def : fallback;
  },

  paramBool: (id: string, key: string, fallback = true) => {
    const rule = get().rules.find(r => r.id === id);
    const val = rule?.params?.[key];
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return ['1', 'true', 'si', 'sí', 'yes'].includes(val.trim().toLowerCase());
    if (typeof val === 'number') return val !== 0;
    const def = defaultRejectionRules().find(d => d.id === id)?.params?.[key];
    return typeof def === 'boolean' ? def : fallback;
  },

  paramNum: (id: string, key: string, fallback = 0) => {
    const rule = get().rules.find(r => r.id === id);
    const val = rule?.params?.[key];
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (typeof val === 'string') {
      const n = Number(val.replace(',', '.'));
      if (Number.isFinite(n)) return n;
    }
    const def = defaultRejectionRules().find(d => d.id === id)?.params?.[key];
    return typeof def === 'number' ? def : fallback;
  },

  loadRules: async () => {
    if (get().loaded) return;
    set({ syncing: true });
    try {
      const remote = await fetchRemote();
      if (remote && remote.length > 0) {
        const merged = mergeWithDefaults(remote);
        set({ rules: merged, loaded: true });
        saveCache(merged);
      } else {
        // Seed Supabase with defaults on first run (best-effort).
        const merged = get().rules.length > 0 ? get().rules : defaultRejectionRules();
        set({ rules: merged, loaded: true });
        saveCache(merged);
        if (supabase) {
          try {
            await supabase.from(TABLE).upsert(merged.map(ruleToRow), { onConflict: 'id' });
          } catch (err) {
            console.warn('Rejection rules seed notice:', err);
          }
        }
      }
    } finally {
      set({ syncing: false });
    }
  },

  saveRule: async (rule: RejectionRule) => {
    const next = get().rules.map(r => (r.id === rule.id ? { ...rule, updatedAt: new Date().toISOString() } : r));
    set({ rules: next });
    saveCache(next);
    if (supabase) {
      try {
        const { error } = await supabase.from(TABLE).upsert(ruleToRow(rule), { onConflict: 'id' });
        if (error) throw error;
      } catch (err) {
        console.warn('Rejection rule save notice (kept locally):', err);
        return false;
      }
    }
    return true;
  },

  resetRule: async (id: string) => {
    const def = defaultRejectionRules().find(d => d.id === id);
    if (!def) return false;
    return get().saveRule({ ...def, updatedAt: new Date().toISOString() });
  },

  resetAll: async () => {
    const defs = defaultRejectionRules();
    set({ rules: defs });
    saveCache(defs);
    if (supabase) {
      try {
        const { error } = await supabase.from(TABLE).upsert(defs.map(ruleToRow), { onConflict: 'id' });
        if (error) throw error;
      } catch (err) {
        console.warn('Rejection rules reset notice (kept locally):', err);
        return false;
      }
    }
    return true;
  }
}));

/** Synchronous snapshot accessor for non-React validation code (parsers). */
export function rejectionRuleSnapshot(): RejectionRulesStore {
  return useRejectionRulesStore.getState();
}
