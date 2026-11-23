import {
  CableTrayRecord,
  hydrateRules,
  RuleItemRecord,
  ruleItemRows,
  cableTrayRows
} from '../../../entities/takeoff-rule/model/ruleCatalog';
import { TakeoffRule } from '../../../entities/takeoff-rule/model/types';
import { supabase } from '../../../shared/api/supabase';

export { hydrateRules };

function missingRelation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const message = `${error.code || ''} ${error.message || ''}`.toLowerCase();
  return error.code === '42P01' || error.code === 'PGRST205' || message.includes('schema cache') || message.includes('does not exist');
}

async function upsertChunked(table: string, rows: object[]): Promise<string | null> {
  if (!supabase || rows.length === 0) return null;
  const size = 80;
  for (let index = 0; index < rows.length; index += size) {
    const { error } = await supabase.from(table).upsert(rows.slice(index, index + size));
    if (error) return error.message;
  }
  return null;
}

export async function fetchRuleLines(): Promise<{ items: RuleItemRecord[]; matrix: CableTrayRecord[]; unavailable: boolean }> {
  if (!supabase) return { items: [], matrix: [], unavailable: true };
  const itemsResult = await supabase.from('rule_items').select('*');
  if (itemsResult.error) {
    return { items: [], matrix: [], unavailable: missingRelation(itemsResult.error) };
  }
  const matrixResult = await supabase.from('cable_tray_matrix').select('*');
  if (matrixResult.error && !missingRelation(matrixResult.error)) {
    console.warn('[Rules] cable_tray_matrix:', matrixResult.error.message);
  }
  return {
    items: (itemsResult.data || []) as RuleItemRecord[],
    matrix: ((matrixResult.data || []) as CableTrayRecord[]),
    unavailable: false
  };
}

async function fillMissingVariants(): Promise<void> {
  // Supabase-first: NEVER re-seed hardcoded variants. This only logs an empty
  // table so the operator knows the backfill migration hasn't been applied.
  if (!supabase) return;
  const existing = await supabase.from('detalle_variants').select('id', { count: 'exact', head: true });
  if (existing.error) {
    if (!missingRelation(existing.error)) console.warn('[Rules] detalle_variants:', existing.error.message);
    return;
  }
  if ((existing.count ?? 0) === 0) {
    console.warn('[Rules] detalle_variants is empty — run the Supabase backfill migration to populate variant rows.');
  }
}

export async function ensureRuleCatalog(): Promise<{ published: boolean; unavailable: boolean; rules: number }> {
  // Supabase-first: the database is the catalog. Bootstrapping hardcoded
  // seeds was removed — an empty DB stays empty and surfaces as such in UI.
  if (!supabase) return { published: false, unavailable: true, rules: 0 };
  const probe = await supabase.from('takeoff_rules').select('id', { count: 'exact', head: true });
  if (probe.error) {
    if (!missingRelation(probe.error)) console.warn('[Rules] takeoff_rules:', probe.error.message);
    return { published: false, unavailable: missingRelation(probe.error), rules: 0 };
  }
  await fillMissingVariants();
  return { published: false, unavailable: false, rules: probe.count ?? 0 };
}

export async function replaceRuleLines(rule: TakeoffRule): Promise<void> {
  if (!supabase) return;
  const items = ruleItemRows(rule);
  const matrix = cableTrayRows(rule);
  const removedItems = await supabase.from('rule_items').delete().eq('rule_id', rule.id);
  if (removedItems.error && !missingRelation(removedItems.error)) {
    console.warn('[Rules] rule_items:', removedItems.error.message);
    return;
  }
  if (missingRelation(removedItems.error)) return;
  const itemError = await upsertChunked('rule_items', items);
  if (itemError) console.warn('[Rules] rule_items:', itemError);

  const removedMatrix = await supabase.from('cable_tray_matrix').delete().eq('rule_id', rule.id);
  if (removedMatrix.error && !missingRelation(removedMatrix.error)) {
    console.warn('[Rules] cable_tray_matrix:', removedMatrix.error.message);
    return;
  }
  const matrixError = await upsertChunked('cable_tray_matrix', matrix);
  if (matrixError) console.warn('[Rules] cable_tray_matrix:', matrixError);
}

export async function deleteRuleLines(ruleId: string): Promise<void> {
  if (!supabase) return;
  const items = await supabase.from('rule_items').delete().eq('rule_id', ruleId);
  if (items.error && !missingRelation(items.error)) console.warn('[Rules] rule_items:', items.error.message);
  const matrix = await supabase.from('cable_tray_matrix').delete().eq('rule_id', ruleId);
  if (matrix.error && !missingRelation(matrix.error)) console.warn('[Rules] cable_tray_matrix:', matrix.error.message);
}
