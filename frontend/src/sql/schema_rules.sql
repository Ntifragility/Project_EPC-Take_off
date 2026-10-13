-- Rule catalog.
-- takeoff_rules: one row per rule.
-- rule_items: materials for the simple rules, including formulas.
-- detalle_variants: cable 2/0 and barra lists, one row per area and detalle.
-- cable_tray_matrix: the four widths of DET.001/2B-X1.
-- Run this once in the Supabase SQL editor. The app fills the tables on the next load.

CREATE TABLE IF NOT EXISTS public.takeoff_rules (
    id TEXT PRIMARY KEY,
    section TEXT NOT NULL,
    trigger TEXT NOT NULL,
    detalle TEXT,
    tag_prefix TEXT,
    areas TEXT[] NOT NULL DEFAULT '{}',
    order_index INTEGER NOT NULL DEFAULT 0,
    kind TEXT NOT NULL DEFAULT 'items',
    subitems JSONB NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE public.takeoff_rules ADD COLUMN IF NOT EXISTS section TEXT;
ALTER TABLE public.takeoff_rules ADD COLUMN IF NOT EXISTS trigger TEXT;
ALTER TABLE public.takeoff_rules ADD COLUMN IF NOT EXISTS detalle TEXT;
ALTER TABLE public.takeoff_rules ADD COLUMN IF NOT EXISTS tag_prefix TEXT;
ALTER TABLE public.takeoff_rules ADD COLUMN IF NOT EXISTS areas TEXT[] DEFAULT '{}';
ALTER TABLE public.takeoff_rules ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE public.takeoff_rules ADD COLUMN IF NOT EXISTS kind TEXT DEFAULT 'items';
ALTER TABLE public.takeoff_rules ADD COLUMN IF NOT EXISTS subitems JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.rule_items (
    id TEXT PRIMARY KEY,
    rule_id TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    descripcion TEXT NOT NULL,
    qty TEXT NOT NULL DEFAULT '',
    unit TEXT NOT NULL DEFAULT '',
    material TEXT NOT NULL DEFAULT 'C',
    formula TEXT NOT NULL DEFAULT '',
    optional BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_rule_items_rule ON public.rule_items (rule_id);

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

CREATE INDEX IF NOT EXISTS idx_cable_tray_rule ON public.cable_tray_matrix (rule_id);

CREATE TABLE IF NOT EXISTS public.detalle_variants (
    id TEXT PRIMARY KEY,
    area TEXT NOT NULL,
    category TEXT NOT NULL,
    detalle_code TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE public.takeoff_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cable_tray_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read takeoff rules" ON public.takeoff_rules;
CREATE POLICY "Allow anon read takeoff rules" ON public.takeoff_rules
    FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anon write takeoff rules" ON public.takeoff_rules;
CREATE POLICY "Allow anon write takeoff rules" ON public.takeoff_rules
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read rule items" ON public.rule_items;
CREATE POLICY "Allow anon read rule items" ON public.rule_items
    FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anon write rule items" ON public.rule_items;
CREATE POLICY "Allow anon write rule items" ON public.rule_items
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read cable tray matrix" ON public.cable_tray_matrix;
CREATE POLICY "Allow anon read cable tray matrix" ON public.cable_tray_matrix
    FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anon write cable tray matrix" ON public.cable_tray_matrix;
CREATE POLICY "Allow anon write cable tray matrix" ON public.cable_tray_matrix
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read detalle variants" ON public.detalle_variants;
CREATE POLICY "Allow anon read detalle variants" ON public.detalle_variants
    FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anon write detalle variants" ON public.detalle_variants;
CREATE POLICY "Allow anon write detalle variants" ON public.detalle_variants
    FOR ALL USING (true) WITH CHECK (true);
