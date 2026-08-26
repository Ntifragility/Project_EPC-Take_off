import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TakeoffItem, PackageGroup, SupabaseTakeoffRecord } from '../types/takeoff';
import { isCountable } from '../utils/calculations';

// Read Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || '';

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

