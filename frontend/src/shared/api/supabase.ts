import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TakeoffItem, PackageGroup } from '../../entities/takeoff-item/model/types';
import { TakeoffRule } from '../../entities/takeoff-rule/model/types';
import { PartidaRecord, SupabasePartidaRecord, SupabaseTakeoffRecord } from '../../entities/partida/model/types';
import { SectionType } from '../types/common';
import { isCountable } from '../../entities/takeoff-item/model/materialClassifier';

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

export function mapItemsToSupabasePayload(
  items: TakeoffItem[],
  packages: PackageGroup[]
): SupabaseTakeoffRecord[] {
  return items.map(it => {
    const pkgName = packages.find(p => p.id === it.pkgId)?.name || 'SIN PARTIDA';
    const qtyVal = isCountable(it.desc, 'pat') ? (typeof it.qty === 'number' ? it.qty : parseFloat(String(it.qty)) || null) : null;
    return {
      partida: it.partida || 'NA',
      partida_balance: it.partidaBalance || 'NA',
      material: it.material || '',
      plano: it.plano || '',
      rev: it.rev || '',
      tag_unico: it.tagUnico || '',
      tag_plano: it.tagPlano || '',
      detalle: it.detalle || '',
      descripcion: it.desc,
      cantidad: qtyVal,
      metrado_ot: it.metradoOt || '',
      und: it.unit,
      item_group: pkgName
    };
  });
}

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
  detalle?: string;
  tag_prefix?: string;
  cable_tray_matrix?: any;
}

export interface SupabaseDetalleVariantRecord {
  id: string;
  area: string;
  category: string;
  detalle_code: string;
  items: any;
}

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
    const rules: TakeoffRule[] = (data || []).map((r: any) => {
      let subitems = r.subitems;
      let cableTrayMatrix = r.cable_tray_matrix || r.cableTrayMatrix;
      let detalle = r.detalle || r.detalle_code;
      let tagPrefix = r.tag_prefix || r.tagPrefix;
      let areas = r.areas;

      if (subitems && typeof subitems === 'object' && !Array.isArray(subitems)) {
        if (subitems.cableTrayMatrix) cableTrayMatrix = subitems.cableTrayMatrix;
        if (subitems.detalle) detalle = subitems.detalle;
        if (subitems.tagPrefix) tagPrefix = subitems.tagPrefix;
        if (subitems.areas) areas = subitems.areas;
        if (Array.isArray(subitems.items)) subitems = subitems.items;
      }

      return {
        id: r.id,
        trigger: r.trigger,
        subitems: Array.isArray(subitems) ? subitems : [],
        detalle,
        tagPrefix,
        cableTrayMatrix,
        areas
      };
    });
    return { data: rules };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al obtener reglas de Supabase';
    return { data: null, error: message };
  }
}

export async function saveTakeoffRuleToSupabase(
  rule: TakeoffRule,
  section: SectionType,
  orderIndex = 0
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase no está configurado' };
  }
  try {
    const payload: any = {
      id: rule.id,
      section,
      trigger: rule.trigger,
      subitems: rule.subitems,
      order_index: orderIndex,
      detalle: rule.detalle,
      tag_prefix: rule.tagPrefix,
      cable_tray_matrix: rule.cableTrayMatrix
    };
    const { error } = await supabase.from('takeoff_rules').upsert(payload);
    if (!error) return { success: true };

    // Fallback if cable_tray_matrix column does not exist on PostgreSQL table
    const fallbackSubitems = Array.isArray(rule.subitems) ? [...rule.subitems] : [];
    const subitemsWithMeta = {
      items: fallbackSubitems,
      cableTrayMatrix: rule.cableTrayMatrix,
      detalle: rule.detalle,
      tagPrefix: rule.tagPrefix,
      areas: rule.areas
    };

    const basePayload: any = {
      id: rule.id,
      section,
      trigger: rule.trigger,
      subitems: rule.cableTrayMatrix ? subitemsWithMeta : rule.subitems,
      order_index: orderIndex
    };
    const { error: fallbackErr } = await supabase.from('takeoff_rules').upsert(basePayload);
    if (fallbackErr) throw fallbackErr;

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al guardar regla en Supabase';
    return { success: false, error: message };
  }
}

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

export async function deleteDetalleVariantFromSupabase(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase no está configurado' };
  }
  try {
    const { error } = await supabase.from('detalle_variants').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al eliminar variante de detalle en Supabase';
    return { success: false, error: message };
  }
}

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
    wbs: String(p.wbs || p.area || '').trim(),
    area: String(p.wbs || p.area || '').trim(),
    partida_sicme: String(p.partidaSicme || p.item || '').trim(),
    item: String(p.partidaSicme || p.item || '').trim(),
    partida_balance: String(p.partidaBalance || 'NA').trim() || 'NA',
    forecast_desc: p.forecastDesc || '',
    descripcion_bm: p.descripcionBm || p.descripcion || '',
    descripcion: p.descripcionBm || p.descripcion || '',
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

function partidaToSupabasePayload(p: PartidaRecord): SupabasePartidaRecord {
  return {
    actividad: p.actividad || 'PAT',
    wbs: String(p.wbs || p.area || '').trim(),
    area: String(p.wbs || p.area || '').trim(),
    partida_sicme: String(p.partidaSicme || p.item || '').trim(),
    item: String(p.partidaSicme || p.item || '').trim(),
    partida_balance: String(p.partidaBalance || 'NA').trim() || 'NA',
    forecast_desc: p.forecastDesc || '',
    descripcion_bm: p.descripcionBm || p.descripcion || '',
    descripcion: p.descripcionBm || p.descripcion || '',
    und: p.und || 'UND'
  };
}

export function isSupabasePartidaId(id?: string): boolean {
  return Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
}

export async function updatePartidaInSupabase(
  partida: PartidaRecord
): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !isSupabasePartidaId(partida.id)) {
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('partidas_table')
      .update(partidaToSupabasePayload(partida))
      .eq('id', partida.id);
    if (error) {
      console.error('Supabase partida update error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al actualizar partida en Supabase';
    console.error('Supabase partida update exception:', err);
    return { success: false, error: message };
  }
}

export async function deletePartidaFromSupabase(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !isSupabasePartidaId(id)) {
    return { success: true };
  }

  try {
    const { error } = await supabase.from('partidas_table').delete().eq('id', id);
    if (error) {
      console.error('Supabase partida delete error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al eliminar partida en Supabase';
    console.error('Supabase partida delete exception:', err);
    return { success: false, error: message };
  }
}

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
      .order('partida_sicme', { ascending: true });

    if (error) throw error;

    const mapped: PartidaRecord[] = (data || []).map((row: any) => ({
      id: row.id,
      actividad: row.actividad,
      wbs: row.wbs ?? row.area ?? '',
      area: row.wbs ?? row.area ?? '',
      partidaSicme: row.partida_sicme ?? row.item ?? '',
      item: row.partida_sicme ?? row.item ?? '',
      partidaBalance: row.partida_balance || 'NA',
      forecastDesc: row.forecast_desc || '',
      descripcionBm: row.descripcion_bm ?? row.descripcion ?? '',
      descripcion: row.descripcion_bm ?? row.descripcion ?? '',
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
