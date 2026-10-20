-- ==============================================================================
-- MIGRATION: BDUCTOS Joint Loss Catalog (Pérdida por embone)
-- Permite calibrar y editar las pérdidas por embone/traslape de tubos por diámetro
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.bducto_joint_loss_catalog (
    id TEXT PRIMARY KEY,
    diameter TEXT NOT NULL UNIQUE,
    loss_m NUMERIC NOT NULL,
    descripcion TEXT DEFAULT '',
    order_index INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.bducto_joint_loss_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read joint loss" ON public.bducto_joint_loss_catalog;
CREATE POLICY "Allow anon read joint loss" ON public.bducto_joint_loss_catalog
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public all joint loss" ON public.bducto_joint_loss_catalog;
CREATE POLICY "Allow public all joint loss" ON public.bducto_joint_loss_catalog
    FOR ALL TO public USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bducto_joint_loss_catalog TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bducto_joint_loss_catalog TO anon;

-- Valores por defecto calibrados:
-- 6" -> 0.13 m
-- 4" -> 0.09 m
-- 3" -> 0.07 m
-- 2" -> 0.05 m
INSERT INTO public.bducto_joint_loss_catalog (id, diameter, loss_m, descripcion, order_index)
VALUES 
    ('loss-6', '6"', 0.13, 'Pérdida por embone D=6"', 1),
    ('loss-4', '4"', 0.09, 'Pérdida por embone D=4"', 2),
    ('loss-3', '3"', 0.07, 'Pérdida por embone D=3"', 3),
    ('loss-2', '2"', 0.05, 'Pérdida por embone D=2"', 4)
ON CONFLICT (id) DO NOTHING;
