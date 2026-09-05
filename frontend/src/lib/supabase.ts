import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TakeoffItem, PackageGroup, SupabaseTakeoffRecord, SectionType, TakeoffRule, PartidaRecord, SupabasePartidaRecord } from '../types/takeoff';
import { isCountable } from '../utils/calculations';

// Read Vite environment variables (supports VITE_SUPABASE_KEY, VITE_SUPABASE_ANON_KEY, and default project URL)
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://bnjnvtbwfhmkryogebak.supabase.co';

const supabaseKey =
  import.meta.env.VITE_SUPABASE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJuam52dGJ3Zmhta3J5b2dlYmFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMTU2ODEsImV4cCI6MjA5NTU5MTY4MX0.3f6gNxExATIHy-UnFCQN0LAcIXJLDQNxQmKkHNBoBVI';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes('your-project') &&
    !supabaseKey.includes('your-anon-key')
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * Maps items in current session to the Supabase database schema for "main_PAT_table".
 * Omit local client ID so Supabase generates UUIDs on insert.
 */
export function mapItemsToSupabasePayload(
  items: TakeoffItem[],
  packages: PackageGroup[]
): SupabaseTakeoffRecord[] {
  return items.map(it => {
    const pkgName = packages.find(p => p.id === it.pkgId)?.name || 'SIN PARTIDA';
    const qtyVal = isCountable(it.desc) ? (typeof it.qty === 'number' ? it.qty : parseFloat(it.qty) || null) : null;
    return {
      partida: it.partida || 'NA',
      material: it.material || '',
      plano: it.plano || '',
      rev: it.rev || '',
      tag_unico: it.tagUnico || '',
      tag_plano: it.tagPlano || '',
      detalle: it.detalle || '',
      description: it.desc,
      qty: qtyVal,
      metrado_ot: it.metradoOt || '',
      unit: it.unit,
      notes: it.notes || '',
      pkg_name: pkgName
    };
  });
}

/**
 * Synchronize items directly into Supabase table.
 * Trigger trg_fn_fill_main_PAT_table in Postgres will automatically fill 'edificio' and 'vista'.
 */
export async function syncItemsToSupabase(
  items: TakeoffItem[],
  packages: PackageGroup[],
  tableName = 'main_PAT_table'
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!supabase) {
    return {
      success: false,
      count: 0,
      error: 'Supabase client no está configurado. Verifica VITE_SUPABASE_URL y VITE_SUPABASE_KEY en .env.'
    };
  }

  const payload = mapItemsToSupabasePayload(items, packages);
  if (payload.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    const { error } = await supabase.from(tableName).insert(payload);
    if (error) {
      console.error('Supabase write error:', error);
      return { success: false, count: 0, error: error.message };
    }
    return { success: true, count: payload.length };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido al sincronizar con Supabase';
    console.error('Supabase write exception:', err);
    return { success: false, count: 0, error: message };
  }
}

/**
 * Fetch records from Supabase table
 */
export async function fetchItemsFromSupabase(
  tableName = 'main_PAT_table'
): Promise<{ data: SupabaseTakeoffRecord[] | null; error?: string }> {
  if (!supabase) {
    return { data: null, error: 'Supabase no está configurado' };
  }

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { data: (data as SupabaseTakeoffRecord[]) || [] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al consultar Supabase';
    return { data: null, error: message };
  }
}

export interface SupabaseRuleRecord {
  id: string;
  section: string;
  trigger: string;
  subitems: any;
  order_index?: number;
}

export interface SupabaseDetalleVariantRecord {
  id: string;
  area: string;
  category: string;
  detalle_code: string;
  items: any;
}

/**
 * Fetch all takeoff rules for a section from Supabase
 */
export async function fetchTakeoffRulesFromSupabase(
  section: SectionType
): Promise<{ data: TakeoffRule[] | null; error?: string }> {
  if (!supabase) {
    return { data: null, error: 'Supabase no está configurado' };
  }
  try {
    const { data, error } = await supabase
      .from('takeoff_rules')
      .select('*')
      .eq('section', section)
      .order('order_index', { ascending: true });

    if (error) throw error;
    const rules: TakeoffRule[] = (data || []).map(r => ({
      id: r.id,
      trigger: r.trigger,
      subitems: r.subitems
    }));
    return { data: rules };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al obtener reglas de Supabase';
    return { data: null, error: message };
  }
}

/**
 * Save/upsert a takeoff rule to Supabase
 */
export async function saveTakeoffRuleToSupabase(
  rule: TakeoffRule,
  section: SectionType,
  orderIndex = 0
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase no está configurado' };
  }
  try {
    const payload: SupabaseRuleRecord = {
      id: rule.id,
      section,
      trigger: rule.trigger,
      subitems: rule.subitems,
      order_index: orderIndex
    };
    const { error } = await supabase.from('takeoff_rules').upsert(payload);
    if (error) throw error;
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al guardar regla en Supabase';
    return { success: false, error: message };
  }
}

/**
 * Delete a takeoff rule from Supabase by ID
 */
export async function deleteTakeoffRuleFromSupabase(
  ruleId: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase no está configurado' };
  }
  try {
    const { error } = await supabase.from('takeoff_rules').delete().eq('id', ruleId);
    if (error) throw error;
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al eliminar regla en Supabase';
    return { success: false, error: message };
  }
}

/**
 * Fetch all detalle variants from Supabase
 */
export async function fetchDetalleVariantsFromSupabase(): Promise<{
  data: SupabaseDetalleVariantRecord[] | null;
  error?: string;
}> {
  if (!supabase) {
    return { data: null, error: 'Supabase no está configurado' };
  }
  try {
    const { data, error } = await supabase
      .from('detalle_variants')
      .select('*');

    if (error) throw error;
    return { data: (data as SupabaseDetalleVariantRecord[]) || [] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al obtener variantes de detalles de Supabase';
    return { data: null, error: message };
  }
}

/**
 * Save/upsert a detalle variant to Supabase
 */
export async function saveDetalleVariantToSupabase(
  variant: SupabaseDetalleVariantRecord
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase no está configurado' };
  }
  try {
    const { error } = await supabase.from('detalle_variants').upsert(variant);
    if (error) throw error;
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al guardar variante de detalle en Supabase';
    return { success: false, error: message };
  }
}

/**
 * Sync / insert a list of Partidas directly into Supabase (public.partidas_table).
 */
export async function syncPartidasToSupabase(
  partidas: PartidaRecord[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!supabase) {
    return {
      success: false,
      count: 0,
      error: 'Supabase client no está configurado. Verifica VITE_SUPABASE_URL y VITE_SUPABASE_KEY en .env.'
    };
  }

  if (!partidas || partidas.length === 0) {
    return { success: true, count: 0 };
  }

  const payload: SupabasePartidaRecord[] = partidas.map(p => ({
    actividad: p.actividad || 'PAT',
    area: String(p.area || '').trim(),
    item: String(p.item || '').trim(),
    forecast_desc: p.forecastDesc || '',
    descripcion: p.descripcion || '',
    und: p.und || 'UND'
  }));

  try {
    const { error } = await supabase.from('partidas_table').insert(payload);
    if (error) {
      console.error('Supabase partidas write error:', error);
      return { success: false, count: 0, error: error.message };
    }
    return { success: true, count: payload.length };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al sincronizar partidas con Supabase';
    console.error('Supabase partidas write exception:', err);
    return { success: false, count: 0, error: message };
  }
}

/**
 * Fetch all master Partidas from Supabase (public.partidas_table).
 */
export async function fetchPartidasFromSupabase(): Promise<{
  data: PartidaRecord[] | null;
  error?: string;
}> {
  if (!supabase) {
    return { data: null, error: 'Supabase no está configurado' };
  }

  try {
    const { data, error } = await supabase
      .from('partidas_table')
      .select('*')
      .order('item', { ascending: true });

    if (error) throw error;

    const mapped: PartidaRecord[] = (data || []).map((row: any) => ({
      id: row.id,
      actividad: row.actividad,
      area: row.area,
      item: row.item,
      forecastDesc: row.forecast_desc || '',
      descripcion: row.descripcion || '',
      und: row.und || 'UND',
      createdAt: row.created_at
    }));

    return { data: mapped };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al obtener partidas de Supabase';
    console.error('Supabase partidas fetch exception:', err);
    return { data: null, error: message };
  }
}


