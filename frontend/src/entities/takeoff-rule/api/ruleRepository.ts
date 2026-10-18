import { supabase } from '../../../shared/api/supabase';
import { TakeoffRule, DetalleDefinition, RuleSubitem, RuleItemOverride, RuleParameterOption } from '../model/types';
import { SectionType } from '../../../shared/types/common';
import { loadStoredRules, saveStoredRules } from '../../../shared/lib/storage';

const DETALLE_STORAGE_KEY = 'epc-detalle-catalog';

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

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(DETALLE_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  // Built-in standard details
  return [
    { code: '151', section: 'pat', area: 'AREA SECA', description: 'Conexión a estructura con cable 2/0' },
    { code: '020', section: 'pat', area: 'AREA SECA', description: 'Puesta a tierra de motores y tableros' },
    { code: '022', section: 'pat', area: 'AREA SECA', description: 'Puesta a tierra de bandejas' },
    { code: '166A', section: 'pat', area: 'AREA SECA', description: 'Barra POT' },
    { code: '166B', section: 'pat', area: 'AREA SECA', description: 'Barra secundaria' },
    { code: '166C', section: 'pat', area: 'AREA SECA', description: 'Barra INST' },
    { code: '167/G1', section: 'pat', area: 'GENERAL', description: 'Malla a tierra cable 4/0' },
    { code: '167/X1', section: 'pat', area: 'GENERAL', description: 'Soldadura T 4/0' },
    { code: '167/X2', section: 'pat', area: 'GENERAL', description: 'Soldadura T 4/0-2/0' },
    { code: '010/17A', section: 'pat', area: 'GENERAL', description: 'Pozo vertical tipo A' },
    { code: '010/17B', section: 'pat', area: 'GENERAL', description: 'Pozo vertical tipo B' },
    { code: '010/17C', section: 'pat', area: 'GENERAL', description: 'Pozo vertical tipo C' },
    { code: '010/17D', section: 'pat', area: 'GENERAL', description: 'Pozo horizontal' },
    { code: '008/05', section: 'pat', area: 'GENERAL', description: 'Derivación cable terminal' },
    { code: '008/3A', section: 'pat', area: 'GENERAL', description: 'Bajada cable vertical' },
    { code: '008/3B', section: 'pat', area: 'GENERAL', description: 'Bajada con recubrimiento' },
    { code: '001/2B-X1', section: 'canalizado', area: 'GENERAL', description: 'Soporte trapecio/lateral' },
    { code: '001/1', section: 'canalizado', area: 'GENERAL', description: 'Soporte trapecio' }
  ];
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
 * Loads all unified rules from Supabase (including subitems, overrides, and parameter options).
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

        // Fetch subitems
        const { data: itemsData } = await supabase
          .from('rule_items')
          .select('*')
          .in('rule_id', ruleIds)
          .order('order_index');

        // Fetch parameter options
        const { data: paramsData } = await supabase
          .from('rule_parameter_options')
          .select('*')
          .in('rule_id', ruleIds);

        const fullRules: TakeoffRule[] = rulesData.map(r => {
          // If subitems table populated, use it, else fallback to JSONB column
          let subitems: RuleSubitem[] = [];
          if (itemsData && itemsData.some(i => i.rule_id === r.id)) {
            subitems = itemsData
              .filter(i => i.rule_id === r.id)
              .map(i => ({
                id: i.id,
                desc: i.descripcion,
                qty: i.base_qty,
                unit: i.unit,
                material: i.material,
                formula: i.formula,
                optional: i.optional,
                subitemDetalle: i.subitem_detalle
              }));
          } else if (Array.isArray(r.subitems)) {
            subitems = r.subitems;
          }

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
            areaDetalles: (r.area_detalles && typeof r.area_detalles === 'object') ? r.area_detalles : {},
            orderIndex: r.order_index,
            subitems,
            parameterOptions,
            cableTrayMatrix: r.cable_tray_matrix
          };
        });

        saveStoredRules(section, fullRules);
        return fullRules;
      }
    } catch (e) {
      console.warn('Failed to load rules from Supabase, loading from cache:', e);
    }
  }

  // Fallback to local storage
  return loadStoredRules(section);
}

/**
 * Saves a unified rule (header + subitems) to Supabase and LocalStorage.
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
    // 1. Upsert Rule Header
    const ruleHeader = {
      id: rule.id,
      section,
      trigger: rule.trigger,
      default_detalle: rule.defaultDetalle || rule.detalle || null,
      detalle: rule.defaultDetalle || rule.detalle || null,
      tag_prefix: rule.tagPrefix || 'M',
      allowed_areas: rule.areas || ['AREA SECA', 'AREA HUMEDA'],
      area_detalles: rule.areaDetalles || {},
      allow_detalle_edit: rule.allowDetalleEdit ?? true,
      has_dimension_param: rule.hasDimensionParam ?? false,
      dimension_param_name: rule.dimensionParamName || null,
      order_index: orderIndex,
      subitems: rule.subitems,
      updated_at: new Date().toISOString()
    };

    await supabase.from('takeoff_rules').upsert(ruleHeader);

    // 2. Upsert Rule Subitems
    if (rule.subitems && rule.subitems.length > 0) {
      const itemsPayload = rule.subitems.map((s, idx) => ({
        id: s.id,
        rule_id: rule.id,
        order_index: idx + 1,
        descripcion: s.desc,
        unit: s.unit || 'und',
        material: s.material || 'C',
        base_qty: String(s.qty ?? '1'),
        formula: s.formula || '',
        optional: Boolean(s.optional),
        subitem_detalle: s.subitemDetalle || null
      }));

      // Delete existing subitems and insert fresh to prevent orphan rows
      await supabase.from('rule_items').delete().eq('rule_id', rule.id);
      await supabase.from('rule_items').insert(itemsPayload);
    }

    // 3. Upsert Parameter Options if any
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
      await supabase.from('rule_parameter_options').insert(paramsPayload);
    }
  } catch (err) {
    console.warn('Error saving unified rule to Supabase:', err);
  }
}
