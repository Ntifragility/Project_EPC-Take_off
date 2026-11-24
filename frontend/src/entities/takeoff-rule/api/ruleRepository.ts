import { supabase, withTimeout } from '../../../shared/api/supabase';
import { TakeoffRule, DetalleDefinition, RuleSubitem, RuleItemOverride, RuleParameterOption } from '../model/types';
import { SectionType } from '../../../shared/types/common';
import { loadStoredRules, saveStoredRules } from '../../../shared/lib/storage';

const DETALLE_STORAGE_KEY = 'epc-detalle-catalog';

// --- Re-model cutover flags -------------------------------------------------
// Reads are always dual: rule_items (normalized BOM) wins when present,
// takeoff_rules.subitems JSONB mirror is the fallback for databases where the
// remodel backfill hasn't run yet. Post-07 the mirror column is gone, so the
// fallback is a silent no-op there.
// REMODEL_LEGACY_WRITE: while true the writer still mirrors to the legacy
// JSONB blobs (takeoff_rules.subitems, cable_tray_matrix) for rollback. Set
// false one release after cutover, then run migration_remodel_07_cleanup.
export const REMODEL_LEGACY_WRITE = false;

interface RawRuleItemRow {
  id: string;
  rule_id: string;
  order_index?: number;
  descripcion?: string;
  desc?: string;
  unit?: string;
  material?: string;
  base_qty?: string | number;
  qty?: string | number;
  formula?: string;
  optional?: boolean;
  subitem_detalle?: string;
}

function mapRuleItemRow(i: RawRuleItemRow): RuleSubitem {
  const rawQty = i.base_qty ?? i.qty ?? 1;
  const numQty = Number(rawQty);
  const parsedQty =
    rawQty !== '' && Number.isFinite(numQty) && String(numQty) === String(rawQty) ? numQty : rawQty;
  const rawMat = (i.material || 'C').toUpperCase().trim();
  return {
    id: i.id,
    desc: i.descripcion ?? i.desc ?? '',
    qty: parsedQty,
    unit: i.unit || 'und',
    material: rawMat === 'P' ? 'P' : 'C',
    formula: i.formula || '',
    optional: i.optional,
    subitemDetalle: i.subitem_detalle
  };
}

interface RawOverrideRow {
  id: string;
  rule_item_id: string;
  detalle_code: string;
  override_descripcion?: string;
  override_qty?: string;
  override_unit?: string;
  override_formula?: string;
}

function mapOverrideRow(o: RawOverrideRow): RuleItemOverride {
  return {
    id: o.id,
    ruleItemId: o.rule_item_id,
    detalleCode: o.detalle_code,
    overrideDescripcion: o.override_descripcion || undefined,
    overrideQty: o.override_qty || undefined,
    overrideUnit: o.override_unit || undefined,
    overrideFormula: o.override_formula || undefined
  };
}

/**
 * Loads the Detalle master catalog from Supabase (or localStorage fallback).
 */
export async function fetchDetalleCatalog(section?: SectionType): Promise<DetalleDefinition[]> {
  if (supabase) {
    try {
      let query = supabase.from('detalle_catalog').select('*').order('code');
      if (section) {
        query = query.or(`section.eq.${section},section.eq.general`);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const mapped: DetalleDefinition[] = data.map(d => ({
          code: d.code,
          section: d.section as SectionType,
          area: d.area,
          description: d.description || '',
          drawingReference: d.drawing_reference || ''
        }));
        try {
          localStorage.setItem(DETALLE_STORAGE_KEY, JSON.stringify(mapped));
        } catch {}
        return mapped;
      }
    } catch (e) {
      console.warn('Failed to fetch detalle catalog from Supabase, using cache:', e);
    }
  }

  // Fallback to localStorage cache only. Empty cache = empty catalog.
  // (The legacy hardcoded detalle list was removed: Supabase is SSOT.)
  try {
    const raw = localStorage.getItem(DETALLE_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  return [];
}

/**
 * Saves a new or updated Detalle in the catalog.
 */
export async function saveDetalleToCatalog(detalle: DetalleDefinition): Promise<void> {
  // Update local cache
  const current = await fetchDetalleCatalog();
  const existingIdx = current.findIndex(d => d.code === detalle.code);
  const updated = existingIdx >= 0
    ? current.map(d => (d.code === detalle.code ? detalle : d))
    : [...current, detalle];
  try {
    localStorage.setItem(DETALLE_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  // Sync to Supabase
  if (supabase) {
    try {
      await supabase.from('detalle_catalog').upsert({
        code: detalle.code,
        section: detalle.section,
        area: detalle.area,
        description: detalle.description || '',
        drawing_reference: detalle.drawingReference || '',
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Could not save detalle to Supabase:', e);
    }
  }
}

/**
 * Loads all unified rules from Supabase.
 *
 * DUAL-READ order (parsers never change — they consume TakeoffRule[]):
 *   1. rule_items (normalized BOM) — if ANY rows exist for the rule, they win.
 *   2. takeoff_rules.subitems JSONB mirror — transition fallback only.
 *   3. localStorage offline cache.
 * Overrides come from rule_item_overrides (normalized); legacy detalle
 * variant rows stay readable one release via rule_id -> detalle_code mapping.
 */
export async function fetchUnifiedRules(section: SectionType): Promise<TakeoffRule[]> {
  if (supabase) {
    try {
      const { data: rulesData, error: rulesError } = await supabase
        .from('takeoff_rules')
        .select('*')
        .eq('section', section)
        .order('order_index');

      if (!rulesError && rulesData && rulesData.length > 0) {
        const ruleIds = rulesData.map(r => r.id);

        // Fetch subitems (normalized BOM wins over the JSONB mirror)
        const { data: itemsData } = await supabase
          .from('rule_items')
          .select('*')
          .in('rule_id', ruleIds)
          .order('order_index');

        // Fetch per-detalle overrides (normalized replacement for
        // detalle_variants.items blobs for family anchors)
        let overridesData: RawOverrideRow[] | null = null;
        try {
          const res = await supabase
            .from('rule_item_overrides')
            .select('*')
            .in('rule_item_id', (itemsData || []).map(i => i.id));
          overridesData = (res.data || []) as RawOverrideRow[];
        } catch {
          overridesData = null; // table may not exist pre-migration — fall back silently
        }

        // Fetch parameter options
        let paramsData: any[] = [];
        try {
          const res = await supabase
            .from('rule_parameter_options')
            .select('*')
            .in('rule_id', ruleIds);
          if (!res.error) paramsData = (res.data || []) as any[];
        } catch {
          paramsData = []; // table may not exist pre-migration — fall back silently
        }

        // Fetch cable tray matrix (legacy table; normalized options win when present).
        // Post-07 this table is gone — missing-relation errors mean empty.
        let matrixData: any[] | null = [];
        try {
          const res = await supabase
            .from('cable_tray_matrix')
            .select('*')
            .in('rule_id', ruleIds)
            .order('order_index');
          if (!res.error) matrixData = (res.data || []) as any[];
        } catch {
          matrixData = [];
        }

        const fullRules: TakeoffRule[] = rulesData.map(r => {
          const normItems = (itemsData || []).filter(i => i.rule_id === r.id);
          // Normalized BOM wins when present; JSONB mirror is the fallback
          // for databases where the remodel backfill hasn't run yet.
          // Post-07 the mirror column is gone (undefined) so this is a no-op.
          let subitems: RuleSubitem[] = [];
          if (normItems.length > 0) {
            subitems = normItems
              .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
              .map(mapRuleItemRow);
          }
          if (subitems.length === 0 && Array.isArray(r.subitems)) {
            subitems = r.subitems;
          }

          const overrides: RuleItemOverride[] = (overridesData || [])
            .filter(o => normItems.some(i => i.id === o.rule_item_id))
            .map(mapOverrideRow);

          const parameterOptions: RuleParameterOption[] = (paramsData || [])
            .filter(p => p.rule_id === r.id)
            .map(p => ({
              id: p.id,
              ruleId: p.rule_id,
              paramKey: p.param_key,
              optionLabel: p.option_label,
              optionValue: p.option_value,
              multiplierMap: p.multiplier_map || {}
            }));

          const ruleMatrix = (matrixData || [])
            .filter(m => m.rule_id === r.id)
            .map(m => ({
              id: m.id,
              desc: m.descripcion,
              unit: m.unit,
              material: m.material,
              w900: m.w900,
              w600: m.w600,
              w450: m.w450,
              w300: m.w300
            }));

          // Normalized width options (rule_parameter_options) shadow the
          // legacy tray matrix rows when both exist for a rule.
          const hasWidthOptions = parameterOptions.some(
            p => (p.paramKey || '').toLowerCase() === 'width'
          );

          // Post-07 synthesis: no legacy rows, but width options exist —
          // rebuild display matrix rows from the multiplier maps so cards,
          // previews, and the tray editor keep working without the table.
          let effectiveMatrix = ruleMatrix.length > 0
            ? ruleMatrix
            : (r.cable_tray_matrix || undefined);
          if (
            (!effectiveMatrix || effectiveMatrix.length === 0) &&
            hasWidthOptions &&
            normItems.length > 0
          ) {
            const widthOpts = parameterOptions.filter(
              p => (p.paramKey || '').toLowerCase() === 'width'
            );
            effectiveMatrix = normItems
              .slice()
              .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
              .map(i => {
                const row: Record<string, any> = {
                  id: i.id,
                  desc: i.descripcion ?? i.desc ?? '',
                  unit: i.unit || 'und',
                  material: i.material || 'C',
                  w900: '', w600: '', w450: '', w300: ''
                };
                for (const opt of widthOpts) {
                  const key = `w${String(opt.optionValue || '').trim()}`;
                  const map = opt.multiplierMap || {};
                  const v = map[i.id];
                  if (key in row && v !== undefined && v !== null) row[key] = String(v);
                }
                return row;
              });
          }

      return {
        id: r.id,
        section: r.section,
        trigger: r.trigger,
        detalle: r.default_detalle || r.detalle || '',
        defaultDetalle: r.default_detalle || r.detalle || '',
        tagPrefix: r.tag_prefix || 'M',
        allowDetalleEdit: r.allow_detalle_edit ?? true,
        hasDimensionParam: r.has_dimension_param ?? false,
        dimensionParamName: r.dimension_param_name,
        areas: r.allowed_areas || r.areas || ['AREA SECA', 'AREA HUMEDA'],
        subAreas: r.allowed_subareas || r.sub_areas || r.subAreas,
        areaDetalles: (r.area_detalles && typeof r.area_detalles === 'object') ? r.area_detalles : {},
        originRuleId: r.origin_rule_id || r.originRuleId,
        orderIndex: r.order_index,
        subitems,
        overrides: overrides.length > 0 ? overrides : undefined,
        parameterOptions,
        cableTrayMatrix: hasWidthOptions
          ? (effectiveMatrix || undefined)
          : effectiveMatrix
      };
        });

        saveStoredRules(section, fullRules);
        return fullRules;
      }
    } catch (e) {
      console.warn('Failed to load rules from Supabase, loading from cache:', e);
    }
  }

  // Fallback to localStorage — the offline cache of the last Supabase snapshot.
  // No hardcoded data: an unreachable DB with an empty cache yields [].
  return loadStoredRules(section);
}

/**
 * Overrides-mirror of a detalle_variants write. Positional mapping matches
 * 03_backfill 3.3: variant items[i] overrides anchor rule_items[i].
 * Runs best-effort AFTER the legacy detalle_variants write so pre-07 paths
 * keep working; post-07 (table dropped) this is the ONLY write that matters.
 */
export async function saveVariantAsOverrides(
  anchorRuleId: string,
  detalleCode: string,
  items: Array<{ desc?: string; qty?: string | number; unit?: string; formula?: string; ot?: string | number }>
): Promise<void> {
  if (!supabase || !anchorRuleId || !detalleCode || !items || items.length === 0) return;
  try {
    const { data: anchorItems } = await supabase
      .from('rule_items')
      .select('id, order_index')
      .eq('rule_id', anchorRuleId)
      .order('order_index');
    if (!anchorItems || anchorItems.length === 0) return;
    const code = detalleCode.toUpperCase().trim();
    const rows = items.map((it, idx) => {
      const anchor = anchorItems[Math.min(idx, anchorItems.length - 1)] as { id: string };
      const desc = (it.desc || '').trim();
      if (!desc) return null;
      return {
        id: `${anchorRuleId}::${code}::${idx}`,
        rule_item_id: anchor.id,
        detalle_code: code,
        override_descripcion: desc,
        override_qty: it.qty !== undefined && it.qty !== null && String(it.qty) !== '' ? String(it.qty) : null,
        override_unit: (it.unit || '').trim() || null,
        override_formula: (it.formula || '').trim() || null
      };
    }).filter(Boolean);
    if (rows.length === 0) return;
    // Replace ONLY this detalle's slots for this anchor (deterministic ids).
    // Stale trailing slots (previous longer list) are removed by prefix.
    try {
      const prefix = `${anchorRuleId}::${code}::`;
      const { data: stale } = await supabase.from('rule_item_overrides').select('id').like('id', `${prefix}%`);
      const staleIds = ((stale || []) as Array<{ id: string }>).map(r => r.id)
        .filter(id => !rows.some(rr => (rr as { id: string }).id === id));
      if (staleIds.length > 0) await supabase.from('rule_item_overrides').delete().in('id', staleIds);
    } catch { /* best-effort cleanup */ }
    const { error } = await supabase.from('rule_item_overrides').upsert(rows as any[], { onConflict: 'id' });
    if (error) console.warn('[Supabase] Warning saving variant overrides mirror:', error.message);
  } catch (e) {
    console.warn('[Supabase] Variant overrides mirror notice:', e);
  }
}

/**
 * Overrides-mirror of a detalle_variants delete. Best-effort; missing
 * table/rows after 07 simply no-op.
 */
export async function deleteVariantOverrides(
  anchorRuleId: string,
  detalleCode: string
): Promise<void> {
  if (!supabase || !anchorRuleId || !detalleCode) return;
  try {
    const prefix = `${anchorRuleId}::${detalleCode.toUpperCase().trim()}::`;
    const { data } = await supabase.from('rule_item_overrides').select('id').like('id', `${prefix}%`);
    const ids = ((data || []) as Array<{ id: string }>).map(r => r.id);
    if (ids.length > 0) await supabase.from('rule_item_overrides').delete().in('id', ids);
  } catch {
    // table dropped or RLS — legacy path already handled the delete
  }
}

/**
 * Saves a unified rule (header + subitems) to Supabase and LocalStorage.
 *
 * CUTOVER order: normalized tables are the source of truth; the legacy
 * JSONB mirrors (takeoff_rules.subitems, cable_tray_matrix table) are only
 * written while REMODEL_LEGACY_WRITE is true (rollback window). Parsers and
 * the rule engine never change — they consume TakeoffRule[] from fetchUnifiedRules.
 */
export async function saveUnifiedRule(
  rule: TakeoffRule,
  section: SectionType,
  orderIndex: number = 0
): Promise<void> {
  // Update LocalStorage first
  const current = loadStoredRules(section);
  const exists = current.some(r => r.id === rule.id);
  const updated = exists ? current.map(r => (r.id === rule.id ? rule : r)) : [...current, rule];
  saveStoredRules(section, updated);

  if (!supabase) return;

  try {
    await withTimeout(
      (async () => {
        if (!supabase) return;

        // 1. Upsert Rule Header. `subitems`/`detalle` legacy mirrors are only
        // included while the rollback window is open — the normalized tables
        // below are authoritative either way.
        const headerPayload: Record<string, any> = {
          id: rule.id,
          section,
          trigger: rule.trigger,
          default_detalle: rule.defaultDetalle || rule.detalle || null,
          tag_prefix: rule.tagPrefix || 'M',
          allowed_areas: rule.areas || ['AREA SECA', 'AREA HUMEDA'],
          allowed_subareas: rule.subAreas || null,
          origin_rule_id: rule.originRuleId || null,
          area_detalles: rule.areaDetalles || {},
          allow_detalle_edit: rule.allowDetalleEdit ?? true,
          has_dimension_param: rule.hasDimensionParam ?? false,
          dimension_param_name: rule.dimensionParamName || null,
          order_index: orderIndex,
          updated_at: new Date().toISOString()
        };
        if (REMODEL_LEGACY_WRITE) {
          headerPayload.detalle = rule.defaultDetalle || rule.detalle || null;
          headerPayload.areas = rule.areas || ['AREA SECA', 'AREA HUMEDA'];
          headerPayload.subitems = rule.subitems;
        }

        for (let attempt = 0; attempt < 10; attempt++) {
          const { error: headerErr } = await supabase.from('takeoff_rules').upsert(headerPayload);
          if (!headerErr) break;

          const missingColMatch = /Could not find the '([^']+)' column/i.exec(headerErr.message || '');
          if (missingColMatch && missingColMatch[1] && missingColMatch[1] in headerPayload) {
            delete headerPayload[missingColMatch[1]];
            continue;
          }

          console.error('[Supabase] Error saving rule header:', headerErr);
          throw new Error(headerErr.message);
        }

        // 2. Upsert Rule Subitems (NORMALIZED — source of truth)
        if (rule.subitems && rule.subitems.length > 0) {
          const v3Items = rule.subitems.map((s, idx) => {
            const rawMat = (s.material || 'C').toUpperCase().trim();
            const cleanMat = (rawMat === 'P' || rawMat === 'C') ? rawMat : 'C';
            return {
              id: s.id,
              rule_id: rule.id,
              order_index: idx + 1,
              descripcion: s.desc,
              unit: s.unit || 'und',
              material: cleanMat,
              base_qty: String(s.qty ?? '1'),
              formula: s.formula || '',
              optional: Boolean(s.optional),
              subitem_detalle: s.subitemDetalle || null
            };
          });

          // Delete existing subitems and insert fresh to prevent orphan rows
          await supabase.from('rule_items').delete().eq('rule_id', rule.id);
          let { error: itemsErr } = await supabase.from('rule_items').insert(v3Items);
          if (itemsErr) {
            console.warn('[Supabase] V3 rule items insert failed, retrying with legacy schema (qty):', itemsErr.message);
            const legacyItems = rule.subitems.map((s, idx) => {
              const rawMat = (s.material || 'C').toUpperCase().trim();
              const cleanMat = (rawMat === 'P' || rawMat === 'C') ? rawMat : 'C';
              return {
                id: s.id,
                rule_id: rule.id,
                order_index: idx + 1,
                descripcion: s.desc,
                unit: s.unit || 'und',
                material: cleanMat,
                qty: String(s.qty ?? '1'),
                formula: s.formula || '',
                optional: Boolean(s.optional)
              };
            });
            const retryItems = await supabase.from('rule_items').insert(legacyItems);
            if (retryItems.error) {
              console.warn('[Supabase] Warning saving rule items to table:', retryItems.error.message);
            }
          }
        }



        // 2b. Upsert Rule Item Overrides (NORMALIZED — replaces detalle_variants.items for anchors)
        if (rule.overrides && rule.overrides.length > 0) {
          const itemIds = rule.overrides.map(o => o.ruleItemId);
          await supabase.from('rule_item_overrides').delete().in('rule_item_id', itemIds);
          const overridesPayload = rule.overrides.map(o => ({
            id: o.id,
            rule_item_id: o.ruleItemId,
            detalle_code: o.detalleCode,
            override_descripcion: o.overrideDescripcion || null,
            override_qty: o.overrideQty != null ? String(o.overrideQty) : null,
            override_unit: o.overrideUnit || null,
            override_formula: o.overrideFormula || null
          }));
          const { error: ovErr } = await supabase.from('rule_item_overrides').insert(overridesPayload);
          if (ovErr) {
            console.warn('[Supabase] Warning saving rule item overrides:', ovErr.message);
          }
        }

        // 3. Upsert Parameter Options (NORMALIZED — source of truth for width matrix)
        if (rule.parameterOptions && rule.parameterOptions.length > 0) {
          await supabase.from('rule_parameter_options').delete().eq('rule_id', rule.id);
          const paramsPayload = rule.parameterOptions.map(p => ({
            id: p.id,
            rule_id: rule.id,
            param_key: p.paramKey,
            option_label: p.optionLabel,
            option_value: p.optionValue,
            multiplier_map: p.multiplierMap
          }));
          const { error: paramsErr } = await supabase.from('rule_parameter_options').insert(paramsPayload);
          if (paramsErr) {
            console.warn('[Supabase] Warning saving rule parameter options:', paramsErr);
          }
        }

        // 4. Legacy Cable Tray Matrix mirror — rollback window only.
        // Post-07 the table is gone: skip silently (save succeeds anyway).
        if (REMODEL_LEGACY_WRITE && rule.cableTrayMatrix && rule.cableTrayMatrix.length > 0) {
          try {
            await supabase.from('cable_tray_matrix').delete().eq('rule_id', rule.id);
            const matrixPayload = rule.cableTrayMatrix.map((m, idx) => ({
              id: m.id || `${rule.id}_matrix_${idx}`,
              rule_id: rule.id,
              order_index: idx + 1,
              descripcion: m.desc,
              unit: m.unit || 'm',
              material: m.material || 'C',
              w900: String(m.w900 ?? ''),
              w600: String(m.w600 ?? ''),
              w450: String(m.w450 ?? ''),
              w300: String(m.w300 ?? '')
            }));
            const { error: matrixErr } = await supabase.from('cable_tray_matrix').insert(matrixPayload);
            if (matrixErr) {
              console.warn('[Supabase] Warning saving cable tray matrix:', matrixErr.message);
            }
          } catch {
            // table dropped by 07 — normalized options above are authoritative
          }
        }
      })(),
      6500,
      'Guardar regla unificada'
    );
  } catch (err) {
    console.error('Error saving unified rule to Supabase:', err);
    throw err;
  }
}
