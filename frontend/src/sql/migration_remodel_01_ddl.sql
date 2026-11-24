-- ============================================================================
-- EPC TAKEOFF — FULL RE-MODEL · Task 1: normalized SSOT DDL
-- Run FIRST in the Supabase SQL editor (idempotent, safe to re-run).
-- Creates the normalized tables from ARCHITECTURE.md WITHOUT dropping anything.
-- Legacy tables/columns (takeoff_rules.subitems, detalle_variants.items, etc.)
-- stay untouched — dual-read phase. RLS stays anon-ALL through cutover.
-- Prereq: NONE. Next: 02_uuid_map.sql
-- ============================================================================

-- --------------------------------------------------------------------------
-- 0. Helpers
-- --------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------------
-- 1. detalle_catalog (master list of engineering detail codes)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.detalle_catalog (
    code TEXT PRIMARY KEY,
    section TEXT NOT NULL DEFAULT 'pat',
    area TEXT NOT NULL DEFAULT 'GENERAL',
    description TEXT,
    drawing_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.detalle_catalog ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid() UNIQUE;
ALTER TABLE public.detalle_catalog ADD COLUMN IF NOT EXISTS section TEXT;
ALTER TABLE public.detalle_catalog ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.detalle_catalog ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.detalle_catalog ADD COLUMN IF NOT EXISTS drawing_reference TEXT;
ALTER TABLE public.detalle_catalog ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE public.detalle_catalog ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- --------------------------------------------------------------------------
-- 2. takeoff_rules (universal rule header — v3 shape + legacy compat columns)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.takeoff_rules (
    id TEXT PRIMARY KEY,
    section TEXT NOT NULL DEFAULT 'pat',
    trigger TEXT NOT NULL,
    default_detalle TEXT,
    tag_prefix TEXT NOT NULL DEFAULT 'M',
    allowed_areas TEXT[] NOT NULL DEFAULT '{"AREA SECA","AREA HUMEDA"}',
    area_detalles JSONB NOT NULL DEFAULT '{}'::jsonb,
    allow_detalle_edit BOOLEAN NOT NULL DEFAULT TRUE,
    has_dimension_param BOOLEAN NOT NULL DEFAULT FALSE,
    dimension_param_name TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- UUID identity (Task 2 fills + maps; becomes PK only at final cutover)
ALTER TABLE public.takeoff_rules ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid() UNIQUE;
-- v3 columns (in case the table predates the v3 migration)
ALTER TABLE public.takeoff_rules ADD COLUMN IF NOT EXISTS default_detalle TEXT;
ALTER TABLE public.takeoff_rules ADD COLUMN IF NOT EXISTS tag_prefix TEXT;
ALTER TABLE public.takeoff_rules ADD COLUMN IF NOT EXISTS allowed_areas TEXT[];
ALTER TABLE public.takeoff_rules ADD COLUMN IF NOT EXISTS area_detalles JSONB;
ALTER TABLE public.takeoff_rules ADD COLUMN IF NOT EXISTS allow_detalle_edit BOOLEAN;
ALTER TABLE public.takeoff_rules ADD COLUMN IF NOT EXISTS has_dimension_param BOOLEAN;
ALTER TABLE public.takeoff_rules ADD COLUMN IF NOT EXISTS dimension_param_name TEXT;
ALTER TABLE public.takeoff_rules ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE public.takeoff_rules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
-- SSOT-partition columns (from supabase_detalle_variants_ssot_migration.sql)
ALTER TABLE public.takeoff_rules ADD COLUMN IF NOT EXISTS allowed_subareas TEXT[];
ALTER TABLE public.takeoff_rules ADD COLUMN IF NOT EXISTS origin_rule_id TEXT;
-- Legacy compat columns (read during dual-read, dropped at cleanup)
ALTER TABLE public.takeoff_rules ADD COLUMN IF NOT EXISTS section TEXT;
ALTER TABLE public.takeoff_rules ADD COLUMN IF NOT EXISTS detalle TEXT;
ALTER TABLE public.takeoff_rules ADD COLUMN IF NOT EXISTS areas TEXT[];
ALTER TABLE public.takeoff_rules ADD COLUMN IF NOT EXISTS kind TEXT;
ALTER TABLE public.takeoff_rules ADD COLUMN IF NOT EXISTS subitems JSONB;
ALTER TABLE public.takeoff_rules ADD COLUMN IF NOT EXISTS cable_tray_matrix JSONB;

-- --------------------------------------------------------------------------
-- 3. rule_area_detalles (relational area -> detalle mapping)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rule_area_detalles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    rule_id TEXT NOT NULL REFERENCES public.takeoff_rules(id) ON DELETE CASCADE,
    area TEXT NOT NULL CHECK (area IN ('AREA SECA', 'AREA HUMEDA', 'MINA')),
    detalle_code TEXT NOT NULL REFERENCES public.detalle_catalog(code) ON UPDATE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_rule_area UNIQUE (rule_id, area)
);

-- --------------------------------------------------------------------------
-- 4. rule_items (BOM rows — replaces takeoff_rules.subitems JSONB)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rule_items (
    id TEXT PRIMARY KEY,
    rule_id TEXT NOT NULL REFERENCES public.takeoff_rules(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0,
    descripcion TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'und',
    material TEXT NOT NULL CHECK (material IN ('P', 'C')),
    base_qty TEXT NOT NULL DEFAULT '1',
    formula TEXT NOT NULL DEFAULT '',
    optional BOOLEAN NOT NULL DEFAULT FALSE,
    subitem_detalle TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.rule_items ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid() UNIQUE;
-- legacy `qty` spelling (schema_rules.sql era) — readable during dual-read
ALTER TABLE public.rule_items ADD COLUMN IF NOT EXISTS qty TEXT;
ALTER TABLE public.rule_items ADD COLUMN IF NOT EXISTS base_qty TEXT;
ALTER TABLE public.rule_items ADD COLUMN IF NOT EXISTS formula TEXT;
ALTER TABLE public.rule_items ADD COLUMN IF NOT EXISTS optional BOOLEAN;
ALTER TABLE public.rule_items ADD COLUMN IF NOT EXISTS subitem_detalle TEXT;
ALTER TABLE public.rule_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE public.rule_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- --------------------------------------------------------------------------
-- 5. rule_item_overrides (per-detalle overrides — replaces detalle_variants.items)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rule_item_overrides (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    rule_item_id TEXT NOT NULL REFERENCES public.rule_items(id) ON DELETE CASCADE,
    detalle_code TEXT NOT NULL,
    override_descripcion TEXT,
    override_qty TEXT,
    override_unit TEXT,
    override_formula TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.rule_item_overrides ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid() UNIQUE;
-- FK override -> detalle_catalog is added NOT VALID in 04_fks.sql (data first).

-- --------------------------------------------------------------------------
-- 6. rule_parameter_options (width matrix — replaces cable_tray_matrix table)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rule_parameter_options (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    rule_id TEXT NOT NULL REFERENCES public.takeoff_rules(id) ON DELETE CASCADE,
    param_key TEXT NOT NULL,
    option_label TEXT NOT NULL,
    option_value TEXT NOT NULL,
    multiplier_map JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.rule_parameter_options ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid() UNIQUE;

-- --------------------------------------------------------------------------
-- 7. Legacy tables guaranteed present (transition reads)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.detalle_variants (
    id TEXT PRIMARY KEY,
    area TEXT NOT NULL,
    category TEXT NOT NULL,
    detalle_code TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb
);
ALTER TABLE public.detalle_variants ADD COLUMN IF NOT EXISTS sub_area TEXT NOT NULL DEFAULT 'NO_CORROSIVO';
ALTER TABLE public.detalle_variants ADD COLUMN IF NOT EXISTS rule_id TEXT;
ALTER TABLE public.detalle_variants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.detalle_variants ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.detalle_variants ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid() UNIQUE;

CREATE TABLE IF NOT EXISTS public.cable_tray_matrix (
    id TEXT PRIMARY KEY,
    rule_id TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    descripcion TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT '',
    material TEXT NOT NULL DEFAULT 'C',
    w900 TEXT NOT NULL DEFAULT '',
    w600 TEXT NOT NULL DEFAULT '',
    w450 TEXT NOT NULL DEFAULT '',
    w300 TEXT NOT NULL DEFAULT ''
);

-- --------------------------------------------------------------------------
-- 8. Transition helpers: legacy id map + orphan quarantine
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legacy_id_map (
    old_id TEXT PRIMARY KEY,
    new_id UUID NOT NULL DEFAULT gen_random_uuid(),
    kind TEXT NOT NULL CHECK (kind IN ('rule', 'variant', 'item')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.remodel_orphans (
    id BIGSERIAL PRIMARY KEY,
    check_name TEXT NOT NULL,
    detail JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- 9. Indices
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_takeoff_rules_section ON public.takeoff_rules(section);
CREATE INDEX IF NOT EXISTS idx_rule_items_rule ON public.rule_items(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_area_detalles_lookup ON public.rule_area_detalles(rule_id, area);
CREATE INDEX IF NOT EXISTS idx_rule_item_overrides_lookup ON public.rule_item_overrides(rule_item_id, detalle_code);
CREATE INDEX IF NOT EXISTS idx_rule_item_overrides_detalle ON public.rule_item_overrides(detalle_code);
CREATE INDEX IF NOT EXISTS idx_detalle_catalog_area ON public.detalle_catalog(area);
CREATE INDEX IF NOT EXISTS idx_detalle_variants_lookup ON public.detalle_variants(area, sub_area, category, detalle_code);
CREATE INDEX IF NOT EXISTS idx_cable_tray_rule ON public.cable_tray_matrix(rule_id);

-- --------------------------------------------------------------------------
-- 10. RLS — keep anon-ALL through cutover (tightened in 07_cleanup, staged)
-- --------------------------------------------------------------------------
ALTER TABLE public.detalle_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.takeoff_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_area_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_item_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_parameter_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cable_tray_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_id_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remodel_orphans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all detalle catalog" ON public.detalle_catalog;
CREATE POLICY "Allow all detalle catalog" ON public.detalle_catalog FOR ALL TO public USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all takeoff rules" ON public.takeoff_rules;
CREATE POLICY "Allow all takeoff rules" ON public.takeoff_rules FOR ALL TO public USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all rule area detalles" ON public.rule_area_detalles;
CREATE POLICY "Allow all rule area detalles" ON public.rule_area_detalles FOR ALL TO public USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all rule items" ON public.rule_items;
CREATE POLICY "Allow all rule items" ON public.rule_items FOR ALL TO public USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all rule item overrides" ON public.rule_item_overrides;
CREATE POLICY "Allow all rule item overrides" ON public.rule_item_overrides FOR ALL TO public USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all rule parameter options" ON public.rule_parameter_options;
CREATE POLICY "Allow all rule parameter options" ON public.rule_parameter_options FOR ALL TO public USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all detalle variants" ON public.detalle_variants;
CREATE POLICY "Allow all detalle variants" ON public.detalle_variants FOR ALL TO public USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all cable tray matrix" ON public.cable_tray_matrix;
CREATE POLICY "Allow all cable tray matrix" ON public.cable_tray_matrix FOR ALL TO public USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all legacy id map" ON public.legacy_id_map;
CREATE POLICY "Allow all legacy id map" ON public.legacy_id_map FOR ALL TO public USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all remodel orphans" ON public.remodel_orphans;
CREATE POLICY "Allow all remodel orphans" ON public.remodel_orphans FOR ALL TO public USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------------
-- 11. Sanity notice
-- --------------------------------------------------------------------------
DO $$
DECLARE
  c_rules INT; c_variants INT; c_items INT; c_ov INT; c_opts INT; c_cat INT;
BEGIN
  SELECT COUNT(*) INTO c_rules FROM public.takeoff_rules;
  SELECT COUNT(*) INTO c_variants FROM public.detalle_variants;
  SELECT COUNT(*) INTO c_items FROM public.rule_items;
  SELECT COUNT(*) INTO c_ov FROM public.rule_item_overrides;
  SELECT COUNT(*) INTO c_opts FROM public.rule_parameter_options;
  SELECT COUNT(*) INTO c_cat FROM public.detalle_catalog;
  RAISE NOTICE 'REMODEL-01 OK · rules=% variants=% items=% overrides=% options=% catalog=%',
    c_rules, c_variants, c_items, c_ov, c_opts, c_cat;
END $$;
