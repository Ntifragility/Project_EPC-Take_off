-- ============================================================================
-- EPC TAKEOFF — FULL RE-MODEL · Task 7 (STAGED — run ONE RELEASE after cutover)
-- Cleanup: drop the JSONB mirrors + dead tables, tighten RLS.
-- !!! DO NOT RUN during dual-read / cutover. Only after the new tables have
-- been the sole writer for a full release with zero rollback need !!!
-- Prereq: new tables sole writer for >= 1 release; remodel_orphans empty;
-- all 7 FKs VALIDATED (04_fks).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 7.1 drop legacy JSONB mirror columns (the blobs the re-model replaces)
-- --------------------------------------------------------------------------
ALTER TABLE public.takeoff_rules DROP COLUMN IF EXISTS subitems;
ALTER TABLE public.takeoff_rules DROP COLUMN IF EXISTS detalle;
ALTER TABLE public.takeoff_rules DROP COLUMN IF EXISTS areas;
ALTER TABLE public.takeoff_rules DROP COLUMN IF EXISTS kind;
ALTER TABLE public.takeoff_rules DROP COLUMN IF EXISTS cable_tray_matrix;
-- NOTE: default_detalle / area_detalles stay (they are the v3 header shape).

ALTER TABLE public.rule_items DROP COLUMN IF EXISTS qty;  -- legacy spelling; base_qty survives

-- --------------------------------------------------------------------------
-- 7.2 drop dead tables (replaced by rule_parameter_options / overrides)
-- --------------------------------------------------------------------------
DROP TABLE IF EXISTS public.cable_tray_matrix CASCADE;
DROP TABLE IF EXISTS public.detalle_variants CASCADE;
DROP TABLE IF EXISTS public.legacy_id_map CASCADE;
-- remodel_orphans: keep for audit, or drop if empty:
-- DROP TABLE IF EXISTS public.remodel_orphans CASCADE;

-- --------------------------------------------------------------------------
-- 7.3 swap TEXT ids -> UUID primary identity (optional, final step)
-- --------------------------------------------------------------------------
-- Only after every consumer reads uuid. Until then the TEXT id columns stay
-- as UNIQUE lookup keys. When ready, uncomment:
-- ALTER TABLE public.takeoff_rules DROP CONSTRAINT takeoff_rules_pkey;
-- ALTER TABLE public.takeoff_rules ADD PRIMARY KEY (uuid);
-- ALTER TABLE public.takeoff_rules ADD CONSTRAINT uq_takeoff_rules_legacy_id UNIQUE (id);

-- --------------------------------------------------------------------------
-- 7.4 tighten RLS: anon-ALL -> authenticated roles
-- --------------------------------------------------------------------------
-- Reads stay public (field app works offline-first); writes require auth.
DROP POLICY IF EXISTS "Allow all detalle catalog" ON public.detalle_catalog;
DROP POLICY IF EXISTS "Allow all takeoff rules" ON public.takeoff_rules;
DROP POLICY IF EXISTS "Allow all rule area detalles" ON public.rule_area_detalles;
DROP POLICY IF EXISTS "Allow all rule items" ON public.rule_items;
DROP POLICY IF EXISTS "Allow all rule item overrides" ON public.rule_item_overrides;
DROP POLICY IF EXISTS "Allow all rule parameter options" ON public.rule_parameter_options;

CREATE POLICY "Public read detalle catalog" ON public.detalle_catalog
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Editor write detalle catalog" ON public.detalle_catalog
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read takeoff rules" ON public.takeoff_rules
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Editor write takeoff rules" ON public.takeoff_rules
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read rule area detalles" ON public.rule_area_detalles
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Editor write rule area detalles" ON public.rule_area_detalles
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read rule items" ON public.rule_items
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Editor write rule items" ON public.rule_items
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read rule item overrides" ON public.rule_item_overrides
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Editor write rule item overrides" ON public.rule_item_overrides
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read rule parameter options" ON public.rule_parameter_options
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Editor write rule parameter options" ON public.rule_parameter_options
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DO $$ BEGIN
  RAISE NOTICE 'REMODEL-07 OK · JSONB mirrors + dead tables dropped, RLS tightened to authenticated writes.';
END $$;
