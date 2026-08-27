-- 1. Create takeoff_rules table
CREATE TABLE IF NOT EXISTS public.takeoff_rules (
    id TEXT PRIMARY KEY,
    section TEXT NOT NULL,                     -- 'pat' | 'canalizado'
    trigger TEXT NOT NULL,                     -- ej: 'CABLE DESNUDO 2/0 AWG'
    subitems JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de subítems [{ id, desc, qty, unit }]
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create detalle_variants table
CREATE TABLE IF NOT EXISTS public.detalle_variants (
    id TEXT PRIMARY KEY,                       -- ej: 'SECA_151', 'HUMEDA_008_05'
    area TEXT NOT NULL,                        -- 'AREA SECA' | 'AREA HUMEDA'
    category TEXT NOT NULL,                    -- 'CABLE_2_0' | 'BARRA_POT' | 'BARRA_INST'
    detalle_code TEXT NOT NULL,                -- ej: 'ND', '151', '008/05'
    items JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array de materiales [{ desc, qty, unit, mat, swappable }]
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.takeoff_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_variants ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if any
DROP POLICY IF EXISTS "Allow anon select on takeoff_rules" ON public.takeoff_rules;
DROP POLICY IF EXISTS "Allow anon insert on takeoff_rules" ON public.takeoff_rules;
DROP POLICY IF EXISTS "Allow anon update on takeoff_rules" ON public.takeoff_rules;
DROP POLICY IF EXISTS "Allow anon delete on takeoff_rules" ON public.takeoff_rules;

DROP POLICY IF EXISTS "Allow anon select on detalle_variants" ON public.detalle_variants;
DROP POLICY IF EXISTS "Allow anon insert on detalle_variants" ON public.detalle_variants;
DROP POLICY IF EXISTS "Allow anon update on detalle_variants" ON public.detalle_variants;
DROP POLICY IF EXISTS "Allow anon delete on detalle_variants" ON public.detalle_variants;

-- 5. Create policies to allow public (anon) read/write access
CREATE POLICY "Allow anon select on takeoff_rules" ON public.takeoff_rules
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert on takeoff_rules" ON public.takeoff_rules
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update on takeoff_rules" ON public.takeoff_rules
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete on takeoff_rules" ON public.takeoff_rules
    FOR DELETE TO anon USING (true);

CREATE POLICY "Allow anon select on detalle_variants" ON public.detalle_variants
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert on detalle_variants" ON public.detalle_variants
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update on detalle_variants" ON public.detalle_variants
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete on detalle_variants" ON public.detalle_variants
    FOR DELETE TO anon USING (true);

