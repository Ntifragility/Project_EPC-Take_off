import {
  CableTrayRecord,
  catalogRules,
  detalleVariantRows,
  hydrateRules,
  RuleHeaderRecord,
  ruleHeader,
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
  if (!supabase) return;
  const existing = await supabase.from('detalle_variants').select('id');
  if (existing.error) {
    if (!missingRelation(existing.error)) console.warn('[Rules] detalle_variants:', existing.error.message);
    return;
  }
  const have = new Set((existing.data || []).map(row => row.id as string));
  const missing = detalleVariantRows().filter(row => !have.has(row.id));
  const error = await upsertChunked('detalle_variants', missing);
  if (error) console.warn('[Rules] No se pudieron completar los detalles:', error);
}

export async function ensureRuleCatalog(): Promise<{ published: boolean; unavailable: boolean; rules: number }> {
  if (!supabase) return { published: false, unavailable: true, rules: 0 };
  const probe = await supabase.from('rule_items').select('id').limit(1);
  if (probe.error) {
    if (!missingRelation(probe.error)) console.warn('[Rules] rule_items:', probe.error.message);
    return { published: false, unavailable: missingRelation(probe.error), rules: 0 };
  }
  if ((probe.data || []).length > 0) {
    await fillMissingVariants();
    return { published: false, unavailable: false, rules: 0 };
  }

  const headers: RuleHeaderRecord[] = [];
  const items: RuleItemRecord[] = [];
  const matrix: CableTrayRecord[] = [];
  catalogRules().forEach(group => {
    group.rules.forEach((rule, index) => {
      headers.push(ruleHeader(rule, group.section, index));
      items.push(...ruleItemRows(rule));
      matrix.push(...cableTrayRows(rule));
    });
  });
  const headerError = await upsertChunked('takeoff_rules', headers);
  if (headerError) {
    console.warn('[Rules] No se publicó takeoff_rules:', headerError);
    return { published: false, unavailable: false, rules: 0 };
  }
  const itemError = await upsertChunked('rule_items', items);
  if (itemError) {
    console.warn('[Rules] No se publicó rule_items:', itemError);
    return { published: false, unavailable: false, rules: 0 };
  }
  const matrixError = await upsertChunked('cable_tray_matrix', matrix);
  if (matrixError) console.warn('[Rules] No se publicó cable_tray_matrix:', matrixError);
  await fillMissingVariants();
  console.info(`[Rules] Catálogo publicado: ${headers.length} reglas, ${items.length} materiales, ${matrix.length} filas de bandeja.`);
  return { published: true, unavailable: false, rules: headers.length };
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
