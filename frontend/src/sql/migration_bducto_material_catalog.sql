-- ==============================================================================
-- Migration: Create bducto_material_catalog Table with Level 3 Admin RLS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.bducto_material_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,         -- 'tubo', 'union', 'adaptador', 'campana', 'cinta'
  diameter TEXT,                  -- '6"', '4"', '3"', '2"', etc. (NULL for cinta)
  descripcion TEXT NOT NULL,      -- Full description used in metrados
  codigo_sicme TEXT DEFAULT '',   -- Optional SICME/ERP code
  unidad TEXT DEFAULT 'm',        -- 'm', 'und', 'pza', etc.
  sort_order INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by category and diameter
CREATE INDEX IF NOT EXISTS idx_bducto_material_lookup 
  ON public.bducto_material_catalog (category, diameter);

-- Enable RLS
ALTER TABLE public.bducto_material_catalog ENABLE ROW LEVEL SECURITY;

-- 1. Read Policy: All authenticated and anon users can read the catalog
DROP POLICY IF EXISTS "Todos pueden leer catalogo de materiales" ON public.bducto_material_catalog;
CREATE POLICY "Todos pueden leer catalogo de materiales"
  ON public.bducto_material_catalog
  FOR SELECT
  TO public, authenticated, anon
  USING (true);

-- 2. Write Policy (INSERT/UPDATE/DELETE): ONLY Level 3 (Admin) users
DROP POLICY IF EXISTS "Solo Level 3 puede insertar o modificar materiales" ON public.bducto_material_catalog;
CREATE POLICY "Solo Level 3 puede insertar o modificar materiales"
  ON public.bducto_material_catalog
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND (up.role = 'Level 3' OR up.role = 'Admin' OR up.role = 'level3')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND (up.role = 'Level 3' OR up.role = 'Admin' OR up.role = 'level3')
    )
  );

-- Seed initial material catalog rows
INSERT INTO public.bducto_material_catalog (category, diameter, descripcion, unidad, sort_order)
VALUES
  -- Tubos (Conduit)
  ('tubo', '6"', 'CONDUIT PVC SCH 40 D=6" - CERTIFICACIÓN UL', 'm', 10),
  ('tubo', '4"', 'CONDUIT PVC SCH 40 D=4" - CERTIFICACIÓN UL', 'm', 20),
  ('tubo', '3"', 'CONDUIT PVC SCH 40 D=3" - CERTIFICACIÓN UL', 'm', 30),
  ('tubo', '2"', 'CONDUIT PVC SCH 40 D=2" - CERTIFICACIÓN UL', 'm', 40),
  ('tubo', '1 1/2"', 'CONDUIT PVC SCH 40 D=1 1/2" - CERTIFICACIÓN UL', 'm', 50),
  ('tubo', '1"', 'CONDUIT PVC SCH 40 D=1" - CERTIFICACIÓN UL', 'm', 60),

  -- Uniones
  ('union', '6"', 'UNION PVC SCH 40 D=6" - CERTIFICACIÓN UL', 'und', 110),
  ('union', '4"', 'UNION PVC SCH 40 D=4" - CERTIFICACIÓN UL', 'und', 120),
  ('union', '3"', 'UNION PVC SCH 40 D=3" - CERTIFICACIÓN UL', 'und', 130),
  ('union', '2"', 'UNION PVC SCH 40 D=2" - CERTIFICACIÓN UL', 'und', 140),
  ('union', '1 1/2"', 'UNION PVC SCH 40 D=1 1/2" - CERTIFICACIÓN UL', 'und', 150),
  ('union', '1"', 'UNION PVC SCH 40 D=1" - CERTIFICACIÓN UL', 'und', 160),

  -- Adaptadores PVC - RGS
  ('adaptador', '6"', 'ADAPTADOR PVC - RGS D=6" - CERTIFICACIÓN UL', 'und', 210),
  ('adaptador', '4"', 'ADAPTADOR PVC - RGS D=4" - CERTIFICACIÓN UL', 'und', 220),
  ('adaptador', '3"', 'ADAPTADOR PVC - RGS D=3" - CERTIFICACIÓN UL', 'und', 230),
  ('adaptador', '2"', 'ADAPTADOR PVC - RGS D=2" - CERTIFICACIÓN UL', 'und', 240),
  ('adaptador', '1 1/2"', 'ADAPTADOR PVC - RGS D=1 1/2" - CERTIFICACIÓN UL', 'und', 250),
  ('adaptador', '1"', 'ADAPTADOR PVC - RGS D=1" - CERTIFICACIÓN UL', 'und', 260),

  -- Campanas / Terminal End Bell
  ('campana', '6"', 'TERMINAL CAMPANA (END BELL) D=6" - CERTIFICACIÓN UL', 'und', 310),
  ('campana', '4"', 'TERMINAL CAMPANA (END BELL) D=4" - CERTIFICACIÓN UL', 'und', 320),
  ('campana', '3"', 'TERMINAL CAMPANA (END BELL) D=3" - CERTIFICACIÓN UL', 'und', 330),
  ('campana', '2"', 'TERMINAL CAMPANA (END BELL) D=2" - CERTIFICACIÓN UL', 'und', 340),
  ('campana', '1 1/2"', 'TERMINAL CAMPANA (END BELL) D=1 1/2" - CERTIFICACIÓN UL', 'und', 350),
  ('campana', '1"', 'TERMINAL CAMPANA (END BELL) D=1" - CERTIFICACIÓN UL', 'und', 360),

  -- Cinta de riesgo
  ('cinta', NULL, 'CINTA DE RIESGO ELECTRICO COLOR ROJO', 'm', 400)
ON CONFLICT (id) DO NOTHING;
