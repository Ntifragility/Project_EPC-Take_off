-- ============================================================================
-- EPC TAKEOFF — FULL RE-MODEL · Task 3: backfill blobs -> normalized rows
-- RUN ONLY DURING THE CATALOG FREEZE WINDOW. Idempotent (safe to re-run).
-- Source of truth for the freeze: takeoff_rules.subitems JSONB +
-- detalle_variants.items JSONB. Never deletes a source row.
-- Prereq: 01_ddl + 02_uuid_map. Next: 04_fks
-- Expected scale: ~17 rules, ~70 variants (SECA 18, HUMEDA 26+26).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 3.1 detalle_catalog: seed from every detalle code in use
-- --------------------------------------------------------------------------
WITH used_codes AS (
  SELECT DISTINCT code FROM (
    -- variant rows
    SELECT UPPER(TRIM(v.detalle_code)) AS code FROM public.detalle_variants v
    WHERE v.detalle_code IS NOT NULL AND TRIM(v.detalle_code) <> ''
    UNION
    -- rule headers (default + per-area)
    SELECT UPPER(TRIM(r.default_detalle)) FROM public.takeoff_rules r
    WHERE r.default_detalle IS NOT NULL AND TRIM(r.default_detalle) <> ''
    UNION
    SELECT UPPER(TRIM(r.detalle)) FROM public.takeoff_rules r
    WHERE r.detalle IS NOT NULL AND TRIM(r.detalle) <> ''
    UNION
    SELECT UPPER(TRIM(x.value)) FROM public.takeoff_rules r
    JOIN LATERAL jsonb_each_text(
      CASE WHEN jsonb_typeof(COALESCE(r.area_detalles, '{}'::jsonb)) = 'object'
        THEN COALESCE(r.area_detalles, '{}'::jsonb) ELSE '{}'::jsonb END
    ) AS x(key, value) ON TRUE
    WHERE TRIM(x.value) <> ''
  ) s
  WHERE code IS NOT NULL AND code <> ''
    -- skip known aliases (canonical form wins)
    AND code NOT IN ('008/5', 'N/D')
),
normalized AS (
  -- alias folding: 008/5 -> 008/05, N/D -> ND
  SELECT CASE WHEN code = '008/5' THEN '008/05'
              WHEN code = 'N/D' THEN 'ND'
              ELSE code END AS code
  FROM used_codes
)
INSERT INTO public.detalle_catalog (code, section, area, description)
SELECT
  n.code,
  'pat' AS section,
  CASE
    WHEN n.code IN ('001/2B-X1', '001/1') THEN 'GENERAL'
    WHEN n.code LIKE '010/%' THEN 'AREA HUMEDA'
    WHEN n.code LIKE '008/%' THEN 'AREA HUMEDA'
    WHEN n.code LIKE '009/%' THEN 'AREA HUMEDA'
    ELSE 'GENERAL'
  END AS area,
  'Backfilled from legacy catalog (remodel-03)' AS description
FROM normalized n
ON CONFLICT (code) DO NOTHING;

-- Fix legacy alias rows that may already exist under the alias spelling.
UPDATE public.detalle_variants SET detalle_code = '008/05' WHERE detalle_code = '008/5';
UPDATE public.detalle_variants SET detalle_code = 'ND' WHERE detalle_code = 'N/D';

-- Merge per-area rule headers into relational rule_area_detalles.
-- (v3 migration already seeded anchors; this covers custom/imported rules.)
INSERT INTO public.rule_area_detalles (rule_id, area, detalle_code)
SELECT r.id, x.key, UPPER(TRIM(x.value))
FROM public.takeoff_rules r
JOIN LATERAL jsonb_each_text(
  CASE WHEN jsonb_typeof(COALESCE(r.area_detalles, '{}'::jsonb)) = 'object'
    THEN COALESCE(r.area_detalles, '{}'::jsonb) ELSE '{}'::jsonb END
) AS x(key, value) ON TRUE
WHERE x.key IN ('AREA SECA', 'AREA HUMEDA', 'MINA')
  AND TRIM(x.value) <> ''
  AND EXISTS (SELECT 1 FROM public.detalle_catalog c WHERE c.code = UPPER(TRIM(x.value)))
ON CONFLICT (rule_id, area) DO UPDATE SET detalle_code = EXCLUDED.detalle_code;

-- Fallback (no area_detalles JSON): rule default_detalle applies to both areas.
INSERT INTO public.rule_area_detalles (rule_id, area, detalle_code)
SELECT r.id, a.area, UPPER(TRIM(COALESCE(r.default_detalle, r.detalle)))
FROM public.takeoff_rules r
CROSS JOIN (VALUES ('AREA SECA'), ('AREA HUMEDA')) AS a(area)
WHERE COALESCE(r.default_detalle, r.detalle) IS NOT NULL
  AND TRIM(COALESCE(r.default_detalle, r.detalle)) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.rule_area_detalles d
    WHERE d.rule_id = r.id AND d.area = a.area
  )
  AND EXISTS (
    SELECT 1 FROM public.detalle_catalog c
    WHERE c.code = UPPER(TRIM(COALESCE(r.default_detalle, r.detalle)))
  );

-- --------------------------------------------------------------------------
-- -- 3.2 rule_items: explode takeoff_rules.subitems JSONB -> one row per subitem
-- --------------------------------------------------------------------------
-- Shape in the wild: [{id, desc, qty, unit, material, formula, optional,
-- subitemDetalle, ot, otDynamic, ruleId}] — qty may be number or text.
-- Guard: rows whose subitems mirror is a JSON *object* (never an array)
-- contribute zero rows instead of erroring (22P02 invalid input).
-- DISTINCT ON (id): two rules (or two slots) can carry the same explicit
-- subitem id; without dedup the single command proposes the same target
-- row twice -> 21000. Deterministic winner: lowest (rule_id, order_index).
INSERT INTO public.rule_items
  (id, rule_id, order_index, descripcion, unit, material, base_qty, formula, optional, subitem_detalle)
SELECT DISTINCT ON (q.id)
  q.id, q.rule_id, q.order_index, q.descripcion, q.unit, q.material,
  q.base_qty, q.formula, q.optional, q.subitem_detalle
FROM (
  SELECT
    COALESCE(NULLIF(TRIM(s.item ->> 'id'), ''), r.id || ':s' || s.idx::text) AS id,
    r.id AS rule_id,
    s.idx::int AS order_index,
    COALESCE(NULLIF(TRIM(s.item ->> 'desc'), ''), NULLIF(TRIM(s.item ->> 'descripcion'), ''), 'SIN DESCRIPCION') AS descripcion,
    COALESCE(NULLIF(TRIM(s.item ->> 'unit'), ''), 'und') AS unit,
    CASE UPPER(COALESCE(NULLIF(TRIM(s.item ->> 'material'), ''), 'C'))
      WHEN 'P' THEN 'P' ELSE 'C' END AS material,
    COALESCE(NULLIF(TRIM(COALESCE(s.item ->> 'qty', s.item ->> 'base_qty', s.item ->> 'ot')), ''), '1') AS base_qty,
    COALESCE(s.item ->> 'formula', '') AS formula,
    -- some mirrors store optional as 'SI'/'NO'/'' — only strict true/false cast
    CASE WHEN lower(TRIM(COALESCE(s.item ->> 'optional', ''))) IN ('true', 't', '1', 'si', 'sí', 's', 'yes', 'y') THEN TRUE
         WHEN lower(TRIM(COALESCE(s.item ->> 'optional', ''))) IN ('false', 'f', '0', 'no', 'n') THEN FALSE
         ELSE FALSE END AS optional,
    NULLIF(UPPER(TRIM(COALESCE(s.item ->> 'subitemDetalle', s.item ->> 'subitem_detalle', ''))), '') AS subitem_detalle
  FROM public.takeoff_rules r
  JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(COALESCE(r.subitems, '[]'::jsonb)) = 'array'
      THEN COALESCE(r.subitems, '[]'::jsonb) ELSE '[]'::jsonb END
  ) WITH ORDINALITY AS s(item, idx) ON TRUE
) q
ORDER BY q.id, q.rule_id, q.order_index
ON CONFLICT (id) DO UPDATE SET
  rule_id = EXCLUDED.rule_id,
  order_index = EXCLUDED.order_index,
  descripcion = EXCLUDED.descripcion,
  unit = EXCLUDED.unit,
  material = EXCLUDED.material,
  base_qty = EXCLUDED.base_qty,
  formula = EXCLUDED.formula,
  optional = EXCLUDED.optional,
  subitem_detalle = EXCLUDED.subitem_detalle,
  updated_at = NOW();

-- map any rows created by the backfill (ids like '<rule>:s<N>')
INSERT INTO public.legacy_id_map (old_id, kind)
SELECT q.old_id, 'item' FROM (
  SELECT DISTINCT i.id AS old_id FROM public.rule_items i
  WHERE NOT EXISTS (SELECT 1 FROM public.legacy_id_map m WHERE m.old_id = i.id)
) q
ON CONFLICT (old_id) DO NOTHING;

UPDATE public.rule_items i
SET uuid = m.new_id
FROM public.legacy_id_map m
WHERE m.old_id = i.id AND m.kind = 'item' AND i.uuid IS NULL;

-- --------------------------------------------------------------------------
-- 3.3 rule_item_overrides: one override row per (variant x item-slot)
-- --------------------------------------------------------------------------
-- Heuristic: variant items[i] overrides the anchor's generic rule_items[i]
-- by position (the app's stampFamilyRuleVariant clones subitems verbatim, so
-- position matches exactly for stamped rows). Custom-edited variants whose
-- payload diverged are flagged into remodel_orphans for manual review and are
-- STILL inserted positionally (never dropped).
-- --------------------------------------------------------------------------
-- 3.3a anchor definitions (CTE, repeated per statement — NO TEMP TABLES:
-- Supabase pools connections per statement, so TEMP tables vanish mid-script
-- with 42P01 "relation _remodel_anchor does not exist").
-- Heuristic: variant items[i] overrides the anchor's generic rule_items[i]
-- by position (the app's stampFamilyRuleVariant clones subitems verbatim).
-- --------------------------------------------------------------------------
-- cleanup: drop temp leftovers from previous failed runs (harmless if absent)
DROP TABLE IF EXISTS _remodel_anchor_items;
DROP TABLE IF EXISTS _remodel_anchor;

-- 3.3b anchor missing entirely -> quarantine + skip that category
-- NOTE: WITH comes BEFORE INSERT (INSERT ... WITH is a syntax error).
WITH anchor(category, rule_id) AS (
  VALUES ('CABLE_2_0'::text, 'r2'::text),
         ('BARRA_POT'::text, 'r8'::text),
         ('BARRA_INST'::text, 'r9'::text)
)
INSERT INTO public.remodel_orphans (check_name, detail)
SELECT 'backfill_anchor_missing', jsonb_build_object('category', a.category)
FROM anchor a
WHERE NOT EXISTS (SELECT 1 FROM public.rule_items i WHERE i.rule_id = a.rule_id);

-- 3.3c insert overrides positionally (anchor inlined as CTE — no TEMP table).
-- NOTE: WITH comes BEFORE INSERT (INSERT ... WITH is a syntax error).
WITH anchor(category, rule_id) AS (
  VALUES ('CABLE_2_0'::text, 'r2'::text),
         ('BARRA_POT'::text, 'r8'::text),
         ('BARRA_INST'::text, 'r9'::text)
),
anchor_items AS (
  SELECT DISTINCT ON (a.category, i.order_index)
    a.category, i.id AS rule_item_id, i.order_index
  FROM anchor a
  JOIN public.rule_items i ON i.rule_id = a.rule_id
  ORDER BY a.category, i.order_index, i.id
)
INSERT INTO public.rule_item_overrides
  (id, rule_item_id, detalle_code, override_descripcion, override_qty, override_unit, override_formula)
SELECT
  v.id || '::' || s.idx::text AS id,
  ai.rule_item_id,
  UPPER(TRIM(v.detalle_code)) AS detalle_code,
  NULLIF(TRIM(s.item ->> 'desc'), '') AS override_descripcion,
  NULLIF(TRIM(COALESCE(s.item ->> 'qty', s.item ->> 'ot', s.item ->> 'base_qty', '')), '') AS override_qty,
  NULLIF(TRIM(s.item ->> 'unit'), '') AS override_unit,
  NULLIF(TRIM(COALESCE(s.item ->> 'formula', '')), '') AS override_formula
FROM public.detalle_variants v
JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(COALESCE(v.items, '[]'::jsonb)) = 'array'
    THEN COALESCE(v.items, '[]'::jsonb) ELSE '[]'::jsonb END
) WITH ORDINALITY AS s(item, idx) ON TRUE
JOIN anchor_items ai
  ON ai.category = v.category AND ai.order_index = s.idx::int
WHERE v.detalle_code IS NOT NULL AND TRIM(v.detalle_code) <> ''
  AND (s.item ->> 'desc' IS NOT NULL AND TRIM(s.item ->> 'desc') <> '')
ON CONFLICT (id) DO UPDATE SET
  rule_item_id = EXCLUDED.rule_item_id,
  detalle_code = EXCLUDED.detalle_code,
  override_descripcion = EXCLUDED.override_descripcion,
  override_qty = EXCLUDED.override_qty,
  override_unit = EXCLUDED.override_unit,
  override_formula = EXCLUDED.override_formula;

-- 3.3d variants with MORE slots than the anchor (or anchor missing): still
-- inserted, anchored to the LAST anchor item, flagged for manual review
-- (anchor inlined as CTE — no TEMP table).
-- NOTE: WITH comes BEFORE INSERT (INSERT ... WITH is a syntax error).
WITH anchor(category, rule_id) AS (
  VALUES ('CABLE_2_0'::text, 'r2'::text),
         ('BARRA_POT'::text, 'r8'::text),
         ('BARRA_INST'::text, 'r9'::text)
),
anchor_items AS (
  SELECT DISTINCT ON (a.category, i.order_index)
    a.category, i.id AS rule_item_id, i.order_index
  FROM anchor a
  JOIN public.rule_items i ON i.rule_id = a.rule_id
  ORDER BY a.category, i.order_index, i.id
)
INSERT INTO public.rule_item_overrides
  (id, rule_item_id, detalle_code, override_descripcion, override_qty, override_unit, override_formula)
SELECT
  v.id || '::extra::' || s.idx::text AS id,
  last_ai.rule_item_id,
  UPPER(TRIM(v.detalle_code)),
  NULLIF(TRIM(s.item ->> 'desc'), ''),
  NULLIF(TRIM(COALESCE(s.item ->> 'qty', s.item ->> 'ot', s.item ->> 'base_qty', '')), ''),
  NULLIF(TRIM(s.item ->> 'unit'), ''),
  NULLIF(TRIM(COALESCE(s.item ->> 'formula', '')), '')
FROM public.detalle_variants v
JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(COALESCE(v.items, '[]'::jsonb)) = 'array'
    THEN COALESCE(v.items, '[]'::jsonb) ELSE '[]'::jsonb END
) WITH ORDINALITY AS s(item, idx) ON TRUE
JOIN LATERAL (
  SELECT ai.rule_item_id
  FROM anchor_items ai
  WHERE ai.category = v.category
  ORDER BY ai.order_index DESC LIMIT 1
) last_ai ON TRUE
WHERE v.detalle_code IS NOT NULL AND TRIM(v.detalle_code) <> ''
  AND (s.item ->> 'desc' IS NOT NULL AND TRIM(s.item ->> 'desc') <> '')
  AND NOT EXISTS (
    SELECT 1 FROM anchor_items ai2
    WHERE ai2.category = v.category AND ai2.order_index = s.idx::int
  )
ON CONFLICT (id) DO UPDATE SET
  rule_item_id = EXCLUDED.rule_item_id,
  detalle_code = EXCLUDED.detalle_code,
  override_descripcion = EXCLUDED.override_descripcion,
  override_qty = EXCLUDED.override_qty,
  override_unit = EXCLUDED.override_unit,
  override_formula = EXCLUDED.override_formula;

-- NOTE: WITH comes BEFORE INSERT (INSERT ... WITH is a syntax error).
WITH anchor(category, rule_id) AS (
  VALUES ('CABLE_2_0'::text, 'r2'::text),
         ('BARRA_POT'::text, 'r8'::text),
         ('BARRA_INST'::text, 'r9'::text)
),
anchor_items AS (
  SELECT DISTINCT ON (a.category, i.order_index)
    a.category, i.order_index
  FROM anchor a
  JOIN public.rule_items i ON i.rule_id = a.rule_id
  ORDER BY a.category, i.order_index, i.id
)
INSERT INTO public.remodel_orphans (check_name, detail)
SELECT 'backfill_variant_extra_slot',
  jsonb_build_object('variant_id', v.id, 'category', v.category,
    'detalle_code', v.detalle_code, 'slots',
    CASE WHEN jsonb_typeof(COALESCE(v.items, '[]'::jsonb)) = 'array'
      THEN jsonb_array_length(v.items) ELSE 0 END)
FROM public.detalle_variants v
WHERE CASE WHEN jsonb_typeof(COALESCE(v.items, '[]'::jsonb)) = 'array'
    THEN jsonb_array_length(v.items) ELSE 0 END >
  COALESCE((SELECT COUNT(*) FROM anchor_items ai WHERE ai.category = v.category), 0);

-- (no DROP needed — no TEMP tables are created by this script)

-- --------------------------------------------------------------------------
-- 3.4 rule_parameter_options: one width option row per (rule, width).
-- cable_tray_matrix has ONE ROW PER MATERIAL (riel, tuerca, mordaza, perno),
-- so the multiplier map must be AGGREGATED: the old per-row
-- jsonb_build_object(m.id, t.val) produced N rows with the same
-- '<rule>:width:900' id -> 21000. Deterministic winner: lowest matrix id.
-- --------------------------------------------------------------------------
INSERT INTO public.rule_parameter_options
  (id, rule_id, param_key, option_label, option_value, multiplier_map)
SELECT
  q.rule_id || ':width:' || lower(q.w) AS id,
  q.rule_id,
  'width' AS param_key,
  q.w || ' mm' AS option_label,
  q.w AS option_value,
  jsonb_object_agg(q.mat_id, q.val) AS multiplier_map
FROM (
  SELECT DISTINCT ON (m.rule_id, t.w, m.id) m.rule_id, t.w, m.id AS mat_id, t.val
  FROM public.cable_tray_matrix m
  CROSS JOIN LATERAL (VALUES
    ('900', NULLIF(TRIM(m.w900), '')),
    ('600', NULLIF(TRIM(m.w600), '')),
    ('450', NULLIF(TRIM(m.w450), '')),
    ('300', NULLIF(TRIM(m.w300), ''))
  ) AS t(w, val)
  WHERE t.val IS NOT NULL
  ORDER BY m.rule_id, t.w, m.id
) q
GROUP BY q.rule_id, q.w
ON CONFLICT (id) DO UPDATE SET
  option_label = EXCLUDED.option_label,
  option_value = EXCLUDED.option_value,
  multiplier_map = EXCLUDED.multiplier_map;

-- --------------------------------------------------------------------------
-- 3.5 verification (raises NOTICE; operator compares with expected counts)
-- --------------------------------------------------------------------------
DO $$
DECLARE
  n_rules INT; n_items INT; n_items_expected INT;
  n_variants INT; n_ov INT; n_ov_expected INT;
  n_sec INT; n_hum_nc INT; n_hum_c INT;
BEGIN
  SELECT COUNT(*) INTO n_rules FROM public.takeoff_rules;
  SELECT COUNT(*) INTO n_items FROM public.rule_items;
  -- object-shaped mirrors contribute 0 (same guard as the 3.2 expansion).
  SELECT COALESCE(SUM(
    CASE WHEN jsonb_typeof(COALESCE(subitems, '[]'::jsonb)) = 'array'
      THEN jsonb_array_length(subitems) ELSE 0 END), 0)
    INTO n_items_expected FROM public.takeoff_rules;
  SELECT COUNT(*) INTO n_variants FROM public.detalle_variants;
  SELECT COUNT(*) INTO n_ov FROM public.rule_item_overrides;
  SELECT COALESCE(SUM(
    CASE WHEN jsonb_typeof(COALESCE(items, '[]'::jsonb)) = 'array'
      THEN jsonb_array_length(items) ELSE 0 END), 0)
    INTO n_ov_expected FROM public.detalle_variants;

  SELECT COUNT(*) INTO n_sec FROM public.detalle_variants WHERE area = 'AREA SECA';
  SELECT COUNT(*) INTO n_hum_nc FROM public.detalle_variants
    WHERE area = 'AREA HUMEDA' AND sub_area = 'NO_CORROSIVO';
  SELECT COUNT(*) INTO n_hum_c FROM public.detalle_variants
    WHERE area = 'AREA HUMEDA' AND sub_area = 'CORROSIVO';

  RAISE NOTICE 'REMODEL-03 · rules=% rule_items=% (expected >= % from JSONB)',
    n_rules, n_items, n_items_expected;
  RAISE NOTICE 'REMODEL-03 · variants=% overrides=% (expected ~ % item slots)',
    n_variants, n_ov, n_ov_expected;
  RAISE NOTICE 'REMODEL-03 · partition check: SECA=% HUMEDA_NC=% HUMEDA_C=% (expect 18 / 26 / 26)',
    n_sec, n_hum_nc, n_hum_c;
  RAISE NOTICE 'REMODEL-03 · review queue: % rows in remodel_orphans', (SELECT COUNT(*) FROM public.remodel_orphans);
END $$;
