-- BDUCTOS metrado. Exclusive table: do not insert these rows into main_PAT_table.
-- Run this once in the Supabase SQL editor. Guardar en BD then fills both tables.

CREATE TABLE IF NOT EXISTS public."main_BDUCTOS_table" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id TEXT DEFAULT '',
    partida_sicme TEXT DEFAULT '',
    partida TEXT DEFAULT '',
    sector TEXT DEFAULT '',
    wbs TEXT DEFAULT '',
    tag_unico TEXT DEFAULT '',
    plano TEXT DEFAULT '',
    rev TEXT DEFAULT '',
    seccion TEXT DEFAULT '',
    desde TEXT DEFAULT '',
    hasta TEXT DEFAULT '',
    descripcion TEXT DEFAULT '',
    diametro TEXT DEFAULT '',
    longitud_m NUMERIC,
    cant_xd NUMERIC,
    metrado NUMERIC,
    und TEXT DEFAULT '',
    kind TEXT DEFAULT '',
    comentario TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bductos_plano ON public."main_BDUCTOS_table" (plano);
CREATE INDEX IF NOT EXISTS idx_bductos_tag ON public."main_BDUCTOS_table" (tag_unico);

ALTER TABLE public."main_BDUCTOS_table" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read bductos" ON public."main_BDUCTOS_table";
CREATE POLICY "Allow anon read bductos" ON public."main_BDUCTOS_table"
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon insert bductos" ON public."main_BDUCTOS_table";
CREATE POLICY "Allow anon insert bductos" ON public."main_BDUCTOS_table"
    FOR INSERT WITH CHECK (true);


-- Curve catalog: description and piece length for each angle, radius, and diameter.
CREATE TABLE IF NOT EXISTS public.bducto_curve_catalog (
    id TEXT PRIMARY KEY,
    angle TEXT NOT NULL,
    radius TEXT NOT NULL,
    diameter TEXT NOT NULL,
    length_m NUMERIC NOT NULL,
    descripcion TEXT NOT NULL,
    diametro TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.bducto_curve_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read curve catalog" ON public.bducto_curve_catalog;
CREATE POLICY "Allow anon read curve catalog" ON public.bducto_curve_catalog
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon write curve catalog" ON public.bducto_curve_catalog;
CREATE POLICY "Allow anon write curve catalog" ON public.bducto_curve_catalog
    FOR ALL USING (true) WITH CHECK (true);
