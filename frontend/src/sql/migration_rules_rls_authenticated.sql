-- ==============================================================================
-- EPC TAKEOFF - PERMISSIONS & RLS POLICIES FOR TAKEOFF RULES & VARIANTS
-- Execute this SQL in the Supabase Dashboard: SQL Editor -> New Query -> Run
-- Ensures both authenticated users and public access can SELECT, INSERT, UPDATE, DELETE rules.
-- ==============================================================================

ALTER TABLE IF EXISTS public.takeoff_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rule_area_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rule_parameter_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.detalle_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.detalle_variants ENABLE ROW LEVEL SECURITY;

-- 1. takeoff_rules
DROP POLICY IF EXISTS "Allow anon all takeoff rules" ON public.takeoff_rules;
DROP POLICY IF EXISTS "Allow all takeoff rules" ON public.takeoff_rules;
CREATE POLICY "Allow all takeoff rules" ON public.takeoff_rules FOR ALL TO public USING (true) WITH CHECK (true);

-- 2. rule_items
DROP POLICY IF EXISTS "Allow anon all rule items" ON public.rule_items;
DROP POLICY IF EXISTS "Allow all rule items" ON public.rule_items;
CREATE POLICY "Allow all rule items" ON public.rule_items FOR ALL TO public USING (true) WITH CHECK (true);

-- 3. rule_area_detalles
DROP POLICY IF EXISTS "Allow anon all rule area detalles" ON public.rule_area_detalles;
DROP POLICY IF EXISTS "Allow all rule area detalles" ON public.rule_area_detalles;
CREATE POLICY "Allow all rule area detalles" ON public.rule_area_detalles FOR ALL TO public USING (true) WITH CHECK (true);

-- 4. rule_parameter_options
DROP POLICY IF EXISTS "Allow anon all rule parameter options" ON public.rule_parameter_options;
DROP POLICY IF EXISTS "Allow all rule parameter options" ON public.rule_parameter_options;
CREATE POLICY "Allow all rule parameter options" ON public.rule_parameter_options FOR ALL TO public USING (true) WITH CHECK (true);

-- 5. detalle_catalog
DROP POLICY IF EXISTS "Allow anon all detalle catalog" ON public.detalle_catalog;
DROP POLICY IF EXISTS "Allow all detalle catalog" ON public.detalle_catalog;
CREATE POLICY "Allow all detalle catalog" ON public.detalle_catalog FOR ALL TO public USING (true) WITH CHECK (true);

-- 6. detalle_variants
DROP POLICY IF EXISTS "Allow anon all detalle variants" ON public.detalle_variants;
DROP POLICY IF EXISTS "Allow all detalle variants" ON public.detalle_variants;
CREATE POLICY "Allow all detalle variants" ON public.detalle_variants FOR ALL TO public USING (true) WITH CHECK (true);
