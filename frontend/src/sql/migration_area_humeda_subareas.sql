-- ==============================================================================
-- Migration: Add sub_area column to main_PAT_table and detalle_variants
-- Environments: 'NO_CORROSIVO' and 'CORROSIVO'
-- Single Source of Truth: Supabase public.detalle_variants table
-- Run this in Supabase SQL Editor.
-- ==============================================================================

-- 1. Ensure sub_area exists on main_PAT_table
ALTER TABLE public."main_PAT_table" ADD COLUMN IF NOT EXISTS sub_area TEXT DEFAULT 'NO_CORROSIVO';

-- 2. Ensure sub_area exists on detalle_variants
ALTER TABLE public.detalle_variants ADD COLUMN IF NOT EXISTS sub_area TEXT NOT NULL DEFAULT 'NO_CORROSIVO';

-- 3. Ensure lookup index exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_detalle_variants_lookup 
ON public.detalle_variants (area, sub_area, category, detalle_code);

-- 4. Enable RLS and permissive policies (if not already set)
ALTER TABLE public.detalle_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read detalle variants" ON public.detalle_variants;
CREATE POLICY "Allow anon read detalle variants" ON public.detalle_variants
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon write detalle variants" ON public.detalle_variants;
CREATE POLICY "Allow anon write detalle variants" ON public.detalle_variants
    FOR ALL USING (true) WITH CHECK (true);

-- 5. Seed / Update all Detalle Variants with sub_area (Single Source of Truth)

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA SECA_NO_CORROSIVO_CABLE_2_0_151', 'AREA SECA', 'NO_CORROSIVO', 'CABLE_2_0', '151', '[{"desc":"TERMINAL A COMPRESION UN OJAL 1/2 PARA CABLE 2/0 YAV","qty":1,"unit":"und","ot":1},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO GALVANIZADO, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"und","ot":1}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA SECA_NO_CORROSIVO_CABLE_2_0_152', 'AREA SECA', 'NO_CORROSIVO', 'CABLE_2_0', '152', '[{"desc":"PRENSA PARALELA 2 CONDUCTORES 4- 2/0 AWG GCM26 BURNDY","qty":1,"unit":"und","ot":1}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA SECA_NO_CORROSIVO_CABLE_2_0_153', 'AREA SECA', 'NO_CORROSIVO', 'CABLE_2_0', '153', '[{"desc":"PRENSA PARALELA 1 CONDUCTOR 4- 2/0 AWG GCM26 BURNDY","qty":1,"unit":"und","ot":"1 c / 3 m","otDynamic":"1c/3m"},{"desc":"PRENSA PARALELA 2 CONDUCTOR 4- 2/0 AWG GCM26 BURNDY","qty":2,"unit":"und","ot":"2 s / 15 m","otDynamic":"empty"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA SECA_NO_CORROSIVO_CABLE_2_0_154', 'AREA SECA', 'NO_CORROSIVO', 'CABLE_2_0', '154', '[{"desc":"TERMINAL A COMPRESION UN OJAL 1/2 PARA CABLE 2/0 YAV","qty":1,"unit":"und","ot":1},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO GALVANIZADO, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"und","ot":1}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA SECA_NO_CORROSIVO_CABLE_2_0_160', 'AREA SECA', 'NO_CORROSIVO', 'CABLE_2_0', '160', '[{"desc":"TERMINAL A COMPRESION UN OJAL 1/2 PARA CABLE 2/0 YAV","qty":1,"unit":"und","ot":1},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO GALVANIZADO, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"und","ot":1}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA SECA_NO_CORROSIVO_CABLE_2_0_161', 'AREA SECA', 'NO_CORROSIVO', 'CABLE_2_0', '161', '[{"desc":"TERMINAL A COMPRESION UN OJAL 1/2 PARA CABLE 2/0 YAV","qty":2,"unit":"und","ot":2},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO GALVANIZADO, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":2,"unit":"und","ot":2}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA SECA_NO_CORROSIVO_CABLE_2_0_168', 'AREA SECA', 'NO_CORROSIVO', 'CABLE_2_0', '168', '[{"desc":"TERMINAL A COMPRESION UN OJAL 1/2 PARA CABLE 2/0 YAV","qty":1,"unit":"und","ot":1},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO GALVANIZADO, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"und","ot":1}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA SECA_NO_CORROSIVO_CABLE_2_0_170', 'AREA SECA', 'NO_CORROSIVO', 'CABLE_2_0', '170', '[{"desc":"TERMINAL A COMPRESION UN OJAL 3/8 PARA CABLE 2/0 YA26","qty":1,"unit":"und","ot":1},{"desc":"PERNO 3/8\"X1 1/2\" DE ACERO GALVANIZADO, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"und","ot":1}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA SECA_NO_CORROSIVO_CABLE_2_0_020', 'AREA SECA', 'NO_CORROSIVO', 'CABLE_2_0', '020', '[{"desc":"TERMINAL A COMPRESION UN OJAL 1/2 PARA CABLE 2/0 YAV","qty":1,"unit":"und","ot":1},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO GALVANIZADO, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"und","ot":1}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA SECA_NO_CORROSIVO_CABLE_2_0_155A', 'AREA SECA', 'NO_CORROSIVO', 'CABLE_2_0', '155A', '[{"desc":"TERMINAL A COMPRESION UN OJAL 1/2 PARA CABLE 2/0 YAV","qty":1,"unit":"und","ot":1},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO GALVANIZADO, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"und","ot":1}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA SECA_NO_CORROSIVO_CABLE_2_0_155B', 'AREA SECA', 'NO_CORROSIVO', 'CABLE_2_0', '155B', '[{"desc":"TERMINAL A COMPRESION UN OJAL 1/2 PARA CABLE 2/0 YAV","qty":2,"unit":"und","ot":2},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO GALVANIZADO, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":2,"unit":"und","ot":2}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA SECA_NO_CORROSIVO_CABLE_2_0_157A', 'AREA SECA', 'NO_CORROSIVO', 'CABLE_2_0', '157A', '[{"desc":"TERMINAL A COMPRESION UN OJAL 1/2 PARA CABLE 2/0 YAV","qty":1,"unit":"und","ot":1},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO GALVANIZADO, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"und","ot":1}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA SECA_NO_CORROSIVO_CABLE_2_0_157B', 'AREA SECA', 'NO_CORROSIVO', 'CABLE_2_0', '157B', '[{"desc":"SOLDADURA VS","qty":1,"unit":"und","ot":1},{"desc":"CARGA 90","qty":1,"unit":"und","ot":1},{"desc":"MOLDE HSC-2G","qty":1,"unit":"und","ot":0.0167}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA SECA_NO_CORROSIVO_CABLE_2_0_166A', 'AREA SECA', 'NO_CORROSIVO', 'CABLE_2_0', '166A', '[{"desc":"TERMINAL A COMPRESION UN OJAL 3/8 PARA CABLE 2/0 YA26","qty":1,"unit":"und","ot":1},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO GALVANIZADO, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"und","ot":1}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA SECA_NO_CORROSIVO_CABLE_2_0_166B', 'AREA SECA', 'NO_CORROSIVO', 'CABLE_2_0', '166B', '[{"desc":"TERMINAL A COMPRESION UN OJAL 3/8 PARA CABLE 2/0 YA26","qty":1,"unit":"und","ot":1},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO GALVANIZADO, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"und","ot":1}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA SECA_NO_CORROSIVO_CABLE_2_0_166C', 'AREA SECA', 'NO_CORROSIVO', 'CABLE_2_0', '166C', '[{"desc":"TERMINAL A COMPRESION UN OJAL 3/8 PARA CABLE 2/0 YA26","qty":1,"unit":"und","ot":1},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO GALVANIZADO, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":2,"unit":"und","ot":2},{"desc":"AISLADOR DE RESINA TIPO BARRIL","qty":1,"unit":"und","ot":1}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA SECA_NO_CORROSIVO_CABLE_2_0_NA', 'AREA SECA', 'NO_CORROSIVO', 'CABLE_2_0', 'NA', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA SECA_NO_CORROSIVO_CABLE_2_0_ND', 'AREA SECA', 'NO_CORROSIVO', 'CABLE_2_0', 'ND', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YAV","qty":1,"unit":"und","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"und","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_NO_CORROSIVO_CABLE_2_0_ND', 'AREA HUMEDA', 'NO_CORROSIVO', 'CABLE_2_0', 'ND', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YAV","qty":1,"unit":"und","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"und","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_CORROSIVO_CABLE_2_0_ND', 'AREA HUMEDA', 'CORROSIVO', 'CABLE_2_0', 'ND', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YAV","qty":1,"unit":"und","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"und","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_NO_CORROSIVO_CABLE_2_0_008/05', 'AREA HUMEDA', 'NO_CORROSIVO', 'CABLE_2_0', '008/05', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"CABLE AISLADO 2/0 AWG THHN (JUMPER)","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YAV","qty":1,"unit":"und","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"und","ot":1,"material":"C"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YAV","qty":2,"unit":"c/jumper","ot":2,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":2,"unit":"c/jumper","ot":2,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_CORROSIVO_CABLE_2_0_008/05', 'AREA HUMEDA', 'CORROSIVO', 'CABLE_2_0', '008/05', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"CABLE AISLADO 2/0 AWG THHN (JUMPER)","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YAV","qty":1,"unit":"und","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"und","ot":1,"material":"C"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YAV","qty":2,"unit":"c/jumper","ot":2,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":2,"unit":"c/jumper","ot":2,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_NO_CORROSIVO_CABLE_2_0_009/07', 'AREA HUMEDA', 'NO_CORROSIVO', 'CABLE_2_0', '009/07', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YAV","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"RIEL PREFORMADO STRUT 41X41X2.7mm, A.G. RECUBIERTO DE PVC","qty":0.15,"unit":"m/ soporte","ot":0.15,"material":"C"},{"desc":"PERNO DE EXPANSIÓN 1/4\"x2 1/2\" SS316, CON TUERCA, ARANDELA PLANA Y DE PRESIÓN","qty":2,"unit":"u / soporte","ot":2,"material":"C"},{"desc":"ABRAZADERA Ø 3/4\" DE 2 PIEZAS SS316, SIMILAR A P1112 DE UNISTRUT","qty":1,"unit":"u / soporte","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_CORROSIVO_CABLE_2_0_009/07', 'AREA HUMEDA', 'CORROSIVO', 'CABLE_2_0', '009/07', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YAV","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"RIEL PREFORMADO STRUT 41X41X2.7mm, A.G. RECUBIERTO DE PVC","qty":0.15,"unit":"m/ soporte","ot":0.15,"material":"C"},{"desc":"PERNO DE EXPANSIÓN 1/4\"x2 1/2\" SS316, CON TUERCA, ARANDELA PLANA Y DE PRESIÓN","qty":2,"unit":"u / soporte","ot":2,"material":"C"},{"desc":"ABRAZADERA Ø 3/4\" DE 2 PIEZAS SS316, SIMILAR A P1112 DE UNISTRUT","qty":1,"unit":"u / soporte","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_NO_CORROSIVO_CABLE_2_0_009/08A', 'AREA HUMEDA', 'NO_CORROSIVO', 'CABLE_2_0', '009/08A', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"PRENSA PARALELA","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"RIEL PREFORMADO STRUT 41X41X2.7mm, A.G. RECUBIERTO DE PVC","qty":0.15,"unit":"m/ soporte","ot":0.15,"material":"C"},{"desc":"PERNO DE EXPANSIÓN 1/4\"x2 1/2\" SS316, CON TUERCA, ARANDELA PLANA Y DE PRESIÓN","qty":2,"unit":"u / soporte","ot":2,"material":"C"},{"desc":"ABRAZADERA Ø 3/4\" DE 2 PIEZAS SS316, SIMILAR A P1112 DE UNISTRUT","qty":1,"unit":"u / soporte","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_CORROSIVO_CABLE_2_0_009/08A', 'AREA HUMEDA', 'CORROSIVO', 'CABLE_2_0', '009/08A', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"PRENSA PARALELA","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"RIEL PREFORMADO STRUT 41X41X2.7mm, A.G. RECUBIERTO DE PVC","qty":0.15,"unit":"m/ soporte","ot":0.15,"material":"C"},{"desc":"PERNO DE EXPANSIÓN 1/4\"x2 1/2\" SS316, CON TUERCA, ARANDELA PLANA Y DE PRESIÓN","qty":2,"unit":"u / soporte","ot":2,"material":"C"},{"desc":"ABRAZADERA Ø 3/4\" DE 2 PIEZAS SS316, SIMILAR A P1112 DE UNISTRUT","qty":1,"unit":"u / soporte","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_NO_CORROSIVO_CABLE_2_0_009/09', 'AREA HUMEDA', 'NO_CORROSIVO', 'CABLE_2_0', '009/09', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"RIEL PREFORMADO STRUT 41X41X2.7mm, A.G. RECUBIERTO DE PVC","qty":0.15,"unit":"m/ soporte","ot":0.15,"material":"C"},{"desc":"PERNO DE EXPANSIÓN 1/4\"x2 1/2\" SS316, CON TUERCA, ARANDELA PLANA Y DE PRESIÓN","qty":2,"unit":"u / soporte","ot":2,"material":"C"},{"desc":"ABRAZADERA Ø 1\" DE 2 PIEZAS SS316, SIMILAR A P1112 DE UNISTRUT","qty":1,"unit":"u / soporte","ot":1,"material":"C"},{"desc":"CONECTOR DE PUESTA A TIERRA DE ACERO ESTRUCTURAL TIPO ''BURNDY''","qty":1,"unit":"u / soporte","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_CORROSIVO_CABLE_2_0_009/09', 'AREA HUMEDA', 'CORROSIVO', 'CABLE_2_0', '009/09', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"RIEL PREFORMADO STRUT 41X41X2.7mm, A.G. RECUBIERTO DE PVC","qty":0.15,"unit":"m/ soporte","ot":0.15,"material":"C"},{"desc":"PERNO DE EXPANSIÓN 1/4\"x2 1/2\" SS316, CON TUERCA, ARANDELA PLANA Y DE PRESIÓN","qty":2,"unit":"u / soporte","ot":2,"material":"C"},{"desc":"ABRAZADERA Ø 1\" DE 2 PIEZAS SS316, SIMILAR A P1112 DE UNISTRUT","qty":1,"unit":"u / soporte","ot":1,"material":"C"},{"desc":"CONECTOR DE PUESTA A TIERRA DE ACERO ESTRUCTURAL TIPO ''BURNDY''","qty":1,"unit":"u / soporte","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_NO_CORROSIVO_CABLE_2_0_009/10', 'AREA HUMEDA', 'NO_CORROSIVO', 'CABLE_2_0', '009/10', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YAV","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"RIEL PREFORMADO STRUT 41X41X2.7mm, A.G. RECUBIERTO DE PVC","qty":0.15,"unit":"m/ soporte","ot":0.15,"material":"C"},{"desc":"PERNO DE EXPANSIÓN 1/4\"x2 1/2\" SS316, CON TUERCA, ARANDELA PLANA Y DE PRESIÓN","qty":2,"unit":"u / soporte","ot":2,"material":"C"},{"desc":"ABRAZADERA Ø 3/4\" DE 2 PIEZAS SS316, SIMILAR A P1112 DE UNISTRUT","qty":1,"unit":"u / soporte","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_CORROSIVO_CABLE_2_0_009/10', 'AREA HUMEDA', 'CORROSIVO', 'CABLE_2_0', '009/10', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YAV","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"RIEL PREFORMADO STRUT 41X41X2.7mm, A.G. RECUBIERTO DE PVC","qty":0.15,"unit":"m/ soporte","ot":0.15,"material":"C"},{"desc":"PERNO DE EXPANSIÓN 1/4\"x2 1/2\" SS316, CON TUERCA, ARANDELA PLANA Y DE PRESIÓN","qty":2,"unit":"u / soporte","ot":2,"material":"C"},{"desc":"ABRAZADERA Ø 3/4\" DE 2 PIEZAS SS316, SIMILAR A P1112 DE UNISTRUT","qty":1,"unit":"u / soporte","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_NO_CORROSIVO_CABLE_2_0_009/11', 'AREA HUMEDA', 'NO_CORROSIVO', 'CABLE_2_0', '009/11', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL PARA CABLE DE Cu N°2/0 AWG, CON 1 PERFORACIÓN DE 3/8\" TIPO YA26 DE BURNDY O SIMILAR","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"PERNO 3/8\"X1 1/2\" DE ACERO INOX 316  CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"PERNO DE EXPANSIÓN 1/4\"x2 1/2\" SS316, CON TUERCA, ARANDELA PLANA Y DE PRESIÓN","qty":2,"unit":"u / soporte","ot":2,"material":"C"},{"desc":"ABRAZADERA Ø 3/4\" DE 2 PIEZAS SS316, SIMILAR A P1112 DE UNISTRUT","qty":1,"unit":"u / soporte","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_CORROSIVO_CABLE_2_0_009/11', 'AREA HUMEDA', 'CORROSIVO', 'CABLE_2_0', '009/11', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL PARA CABLE DE Cu N°2/0 AWG, CON 1 PERFORACIÓN DE 3/8\" TIPO YA26 DE BURNDY O SIMILAR","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"PERNO 3/8\"X1 1/2\" DE ACERO INOX 316  CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"PERNO DE EXPANSIÓN 1/4\"x2 1/2\" SS316, CON TUERCA, ARANDELA PLANA Y DE PRESIÓN","qty":2,"unit":"u / soporte","ot":2,"material":"C"},{"desc":"ABRAZADERA Ø 3/4\" DE 2 PIEZAS SS316, SIMILAR A P1112 DE UNISTRUT","qty":1,"unit":"u / soporte","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_NO_CORROSIVO_CABLE_2_0_009/12A', 'AREA HUMEDA', 'NO_CORROSIVO', 'CABLE_2_0', '009/12A', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"SOLDADURA VBC-2G","qty":1,"unit":"c/u","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_CORROSIVO_CABLE_2_0_009/12A', 'AREA HUMEDA', 'CORROSIVO', 'CABLE_2_0', '009/12A', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"SOLDADURA VBC-2G","qty":1,"unit":"c/u","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_NO_CORROSIVO_CABLE_2_0_009/12B', 'AREA HUMEDA', 'NO_CORROSIVO', 'CABLE_2_0', '009/12B', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YAV","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"c/u","ot":1,"material":"C"},{"desc":"RIEL PREFORMADO STRUT 41X41X2.7mm, A.G. RECUBIERTO DE PVC","qty":0.15,"unit":"m/ soporte","ot":0.15,"material":"C"},{"desc":"PERNO DE EXPANSIÓN 1/4\"x2 1/2\" SS316, CON TUERCA, ARANDELA PLANA Y DE PRESIÓN","qty":2,"unit":"u / soporte","ot":2,"material":"C"},{"desc":"ABRAZADERA Ø 3/4\" DE 2 PIEZAS SS316, SIMILAR A P1112 DE UNISTRUT","qty":1,"unit":"u / soporte","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_CORROSIVO_CABLE_2_0_009/12B', 'AREA HUMEDA', 'CORROSIVO', 'CABLE_2_0', '009/12B', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YAV","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"c/u","ot":1,"material":"C"},{"desc":"RIEL PREFORMADO STRUT 41X41X2.7mm, A.G. RECUBIERTO DE PVC","qty":0.15,"unit":"m/ soporte","ot":0.15,"material":"C"},{"desc":"PERNO DE EXPANSIÓN 1/4\"x2 1/2\" SS316, CON TUERCA, ARANDELA PLANA Y DE PRESIÓN","qty":2,"unit":"u / soporte","ot":2,"material":"C"},{"desc":"ABRAZADERA Ø 3/4\" DE 2 PIEZAS SS316, SIMILAR A P1112 DE UNISTRUT","qty":1,"unit":"u / soporte","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_NO_CORROSIVO_CABLE_2_0_010/13', 'AREA HUMEDA', 'NO_CORROSIVO', 'CABLE_2_0', '010/13', '[{"desc":"CABLE AISLADO 2/0 AWG THHN","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YA26N","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"c/u","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_CORROSIVO_CABLE_2_0_010/13', 'AREA HUMEDA', 'CORROSIVO', 'CABLE_2_0', '010/13', '[{"desc":"CABLE AISLADO 2/0 AWG THHN","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YA26N","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"c/u","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_NO_CORROSIVO_CABLE_2_0_010/14', 'AREA HUMEDA', 'NO_CORROSIVO', 'CABLE_2_0', '010/14', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"RIEL PREFORMADO STRUT 41X41X2.7mm, A.G. RECUBIERTO DE PVC","qty":0.15,"unit":"m/ soporte","ot":0.15,"material":"C"},{"desc":"PERNO DE EXPANSIÓN 1/4\"x2 1/2\" SS316, CON TUERCA, ARANDELA PLANA Y DE PRESIÓN","qty":2,"unit":"u / soporte","ot":2,"material":"C"},{"desc":"ABRAZADERA Ø 1\" DE 2 PIEZAS SS316, SIMILAR A P1112 DE UNISTRUT","qty":1,"unit":"u / soporte","ot":1,"material":"C"},{"desc":"CONECTOR DE PUESTA A TIERRA DE ACERO ESTRUCTURAL TIPO ''BURNDY''","qty":1,"unit":"u / soporte","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_CORROSIVO_CABLE_2_0_010/14', 'AREA HUMEDA', 'CORROSIVO', 'CABLE_2_0', '010/14', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"RIEL PREFORMADO STRUT 41X41X2.7mm, A.G. RECUBIERTO DE PVC","qty":0.15,"unit":"m/ soporte","ot":0.15,"material":"C"},{"desc":"PERNO DE EXPANSIÓN 1/4\"x2 1/2\" SS316, CON TUERCA, ARANDELA PLANA Y DE PRESIÓN","qty":2,"unit":"u / soporte","ot":2,"material":"C"},{"desc":"ABRAZADERA Ø 1\" DE 2 PIEZAS SS316, SIMILAR A P1112 DE UNISTRUT","qty":1,"unit":"u / soporte","ot":1,"material":"C"},{"desc":"CONECTOR DE PUESTA A TIERRA DE ACERO ESTRUCTURAL TIPO ''BURNDY''","qty":1,"unit":"u / soporte","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_NO_CORROSIVO_CABLE_2_0_010/15', 'AREA HUMEDA', 'NO_CORROSIVO', 'CABLE_2_0', '010/15', '[{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"CABLE DESNUDO 4/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YA26N","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"RIEL PREFORMADO STRUT 41X41X2.7mm, A.G. RECUBIERTO DE PVC","qty":0.15,"unit":"m/ soporte","ot":0.15,"material":"C"},{"desc":"PERNO DE EXPANSIÓN 1/4\"x2 1/2\" SS316, CON TUERCA, ARANDELA PLANA Y DE PRESIÓN","qty":2,"unit":"u / soporte","ot":2,"material":"C"},{"desc":"ABRAZADERA Ø 3/4\" DE 2 PIEZAS SS316, SIMILAR A P1112 DE UNISTRUT","qty":1,"unit":"u / soporte","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_CORROSIVO_CABLE_2_0_010/15', 'AREA HUMEDA', 'CORROSIVO', 'CABLE_2_0', '010/15', '[{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"CABLE DESNUDO 4/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YA26N","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"RIEL PREFORMADO STRUT 41X41X2.7mm, A.G. RECUBIERTO DE PVC","qty":0.15,"unit":"m/ soporte","ot":0.15,"material":"C"},{"desc":"PERNO DE EXPANSIÓN 1/4\"x2 1/2\" SS316, CON TUERCA, ARANDELA PLANA Y DE PRESIÓN","qty":2,"unit":"u / soporte","ot":2,"material":"C"},{"desc":"ABRAZADERA Ø 3/4\" DE 2 PIEZAS SS316, SIMILAR A P1112 DE UNISTRUT","qty":1,"unit":"u / soporte","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_NO_CORROSIVO_CABLE_2_0_010/16', 'AREA HUMEDA', 'NO_CORROSIVO', 'CABLE_2_0', '010/16', '[{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"PLATINA DE ACERO 100x50x4mm, CON DOS PERFORACIONES DE Ø14mm.","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YA26N","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"c/u","ot":1,"material":"C"},{"desc":"RIEL PREFORMADO STRUT 41X41X2.7mm, A.G. RECUBIERTO DE PVC","qty":0.15,"unit":"m/ soporte","ot":0.15,"material":"C"},{"desc":"PERNO DE EXPANSIÓN 1/4\"x2 1/2\" SS316, CON TUERCA, ARANDELA PLANA Y DE PRESIÓN","qty":2,"unit":"u / soporte","ot":2,"material":"C"},{"desc":"ABRAZADERA Ø 3/4\" DE 2 PIEZAS SS316, SIMILAR A P1112 DE UNISTRUT","qty":1,"unit":"u / soporte","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_CORROSIVO_CABLE_2_0_010/16', 'AREA HUMEDA', 'CORROSIVO', 'CABLE_2_0', '010/16', '[{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"PLATINA DE ACERO 100x50x4mm, CON DOS PERFORACIONES DE Ø14mm.","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YA26N","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"c/u","ot":1,"material":"C"},{"desc":"RIEL PREFORMADO STRUT 41X41X2.7mm, A.G. RECUBIERTO DE PVC","qty":0.15,"unit":"m/ soporte","ot":0.15,"material":"C"},{"desc":"PERNO DE EXPANSIÓN 1/4\"x2 1/2\" SS316, CON TUERCA, ARANDELA PLANA Y DE PRESIÓN","qty":2,"unit":"u / soporte","ot":2,"material":"C"},{"desc":"ABRAZADERA Ø 3/4\" DE 2 PIEZAS SS316, SIMILAR A P1112 DE UNISTRUT","qty":1,"unit":"u / soporte","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_NO_CORROSIVO_CABLE_2_0_010/17A', 'AREA HUMEDA', 'NO_CORROSIVO', 'CABLE_2_0', '010/17A', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YAV","qty":1,"unit":"und","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"und","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_CORROSIVO_CABLE_2_0_010/17A', 'AREA HUMEDA', 'CORROSIVO', 'CABLE_2_0', '010/17A', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YAV","qty":1,"unit":"und","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"und","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_NO_CORROSIVO_CABLE_2_0_010/17B', 'AREA HUMEDA', 'NO_CORROSIVO', 'CABLE_2_0', '010/17B', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YAV","qty":1,"unit":"und","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"und","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_CORROSIVO_CABLE_2_0_010/17B', 'AREA HUMEDA', 'CORROSIVO', 'CABLE_2_0', '010/17B', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YAV","qty":1,"unit":"und","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"und","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_NO_CORROSIVO_CABLE_2_0_010/17C', 'AREA HUMEDA', 'NO_CORROSIVO', 'CABLE_2_0', '010/17C', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YAV","qty":1,"unit":"und","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"und","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_CORROSIVO_CABLE_2_0_010/17C', 'AREA HUMEDA', 'CORROSIVO', 'CABLE_2_0', '010/17C', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YAV","qty":1,"unit":"und","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"und","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_NO_CORROSIVO_CABLE_2_0_010/17D', 'AREA HUMEDA', 'NO_CORROSIVO', 'CABLE_2_0', '010/17D', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YAV","qty":1,"unit":"und","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"und","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_CORROSIVO_CABLE_2_0_010/17D', 'AREA HUMEDA', 'CORROSIVO', 'CABLE_2_0', '010/17D', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YAV","qty":1,"unit":"und","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"und","ot":1,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_NO_CORROSIVO_CABLE_2_0_010/18', 'AREA HUMEDA', 'NO_CORROSIVO', 'CABLE_2_0', '010/18', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"CABLE AISLADO 2/0 AWG THHN (JUMPER)","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YA26N","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"c/u","ot":1,"material":"C"},{"desc":"RIEL PREFORMADO STRUT 41X41X2.7mm, A.G. RECUBIERTO DE PVC","qty":0.15,"unit":"m/ soporte","ot":0.15,"material":"C"},{"desc":"PERNO DE EXPANSIÓN 1/4\"x2 1/2\" SS316, CON TUERCA, ARANDELA PLANA Y DE PRESIÓN","qty":2,"unit":"u / soporte","ot":2,"material":"C"},{"desc":"ABRAZADERA Ø 3/4\" DE 2 PIEZAS SS316, SIMILAR A P1112 DE UNISTRUT","qty":1,"unit":"u / soporte","ot":1,"material":"C"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YA26N","qty":2,"unit":"c/jumper","ot":2,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":2,"unit":"c/jumper","ot":2,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_CORROSIVO_CABLE_2_0_010/18', 'AREA HUMEDA', 'CORROSIVO', 'CABLE_2_0', '010/18', '[{"desc":"CABLE DESNUDO 2/0 AWG","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"CABLE AISLADO 2/0 AWG THHN (JUMPER)","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YA26N","qty":1,"unit":"c/mecha","ot":1,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":1,"unit":"c/u","ot":1,"material":"C"},{"desc":"RIEL PREFORMADO STRUT 41X41X2.7mm, A.G. RECUBIERTO DE PVC","qty":0.15,"unit":"m/ soporte","ot":0.15,"material":"C"},{"desc":"PERNO DE EXPANSIÓN 1/4\"x2 1/2\" SS316, CON TUERCA, ARANDELA PLANA Y DE PRESIÓN","qty":2,"unit":"u / soporte","ot":2,"material":"C"},{"desc":"ABRAZADERA Ø 3/4\" DE 2 PIEZAS SS316, SIMILAR A P1112 DE UNISTRUT","qty":1,"unit":"u / soporte","ot":1,"material":"C"},{"desc":"TUBERIA PVC SCH 80 Ø3/4\"","qty":"Var.","unit":"m","ot":"Var.","material":"P"},{"desc":"TERMINAL A COMPRESION UN OJAL 1/2\" PARA CABLE 2/0 YA26N","qty":2,"unit":"c/jumper","ot":2,"material":"C"},{"desc":"PERNO 1/2\"X1 1/2\" DE ACERO INOX 316, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN","qty":2,"unit":"c/jumper","ot":2,"material":"C"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_NO_CORROSIVO_BARRA_POT_010/17A', 'AREA HUMEDA', 'NO_CORROSIVO', 'BARRA_POT', '010/17A', '[{"desc":"BARRA DE COBRE CON AGUJEROS PREPERFORADOS SIMETRICOS 11mm, SIN AISLADORES TIPO CB14412JK THERMOWELD O SIMILAR","qty":1,"unit":"u / cjto","material":"P","metradoOt":"1"},{"desc":"ANCLAJE 3/8\" TIPO HDI DE ACERO INOXIDABLE","qty":4,"unit":"u / cjto","material":"C","metradoOt":"4"},{"desc":"PERNO DE CABEZA HEXAGONAL 3/8\"X1\" DE ACERO INOXIDABLE, CON TUERCA, ARANDELA PLANA Y UNA DE PRESIÓN","qty":4,"unit":"u / cjto","material":"C","metradoOt":"4"},{"desc":"SOPORTE TIPO OMEGA ACERO INOXIDABLE 50x50mm e=1/4\", CON 2 AGUJEROS DE 9/16\" PARA 4 PERNOS DE 1/2\"","qty":2,"unit":"u / soporte","material":"C","metradoOt":"2"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_CORROSIVO_BARRA_POT_010/17A', 'AREA HUMEDA', 'CORROSIVO', 'BARRA_POT', '010/17A', '[{"desc":"BARRA DE COBRE CON AGUJEROS PREPERFORADOS SIMETRICOS 11mm, SIN AISLADORES TIPO CB14412JK THERMOWELD O SIMILAR","qty":1,"unit":"u / cjto","material":"P","metradoOt":"1"},{"desc":"ANCLAJE 3/8\" TIPO HDI DE ACERO INOXIDABLE","qty":4,"unit":"u / cjto","material":"C","metradoOt":"4"},{"desc":"PERNO DE CABEZA HEXAGONAL 3/8\"X1\" DE ACERO INOXIDABLE, CON TUERCA, ARANDELA PLANA Y UNA DE PRESIÓN","qty":4,"unit":"u / cjto","material":"C","metradoOt":"4"},{"desc":"SOPORTE TIPO OMEGA ACERO INOXIDABLE 50x50mm e=1/4\", CON 2 AGUJEROS DE 9/16\" PARA 4 PERNOS DE 1/2\"","qty":2,"unit":"u / soporte","material":"C","metradoOt":"2"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_NO_CORROSIVO_BARRA_POT_010/17B', 'AREA HUMEDA', 'NO_CORROSIVO', 'BARRA_POT', '010/17B', '[{"desc":"BARRA DE COBRE CON AGUJEROS PREPERFORADOS SIMETRICOS 11mm, SIN AISLADORES TIPO CB14412JK THERMOWELD O SIMILAR","qty":1,"unit":"u / cjto","material":"P","metradoOt":"1"},{"desc":"SOPORTE TIPO OMEGA ACERO INOXIDABLE 50x50mm e=1/4\", CON 2 AGUJEROS DE 9/16\" PARA 4 PERNOS DE 1/2\"","qty":2,"unit":"u / soporte","material":"C","metradoOt":"2"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_CORROSIVO_BARRA_POT_010/17B', 'AREA HUMEDA', 'CORROSIVO', 'BARRA_POT', '010/17B', '[{"desc":"BARRA DE COBRE CON AGUJEROS PREPERFORADOS SIMETRICOS 11mm, SIN AISLADORES TIPO CB14412JK THERMOWELD O SIMILAR","qty":1,"unit":"u / cjto","material":"P","metradoOt":"1"},{"desc":"SOPORTE TIPO OMEGA ACERO INOXIDABLE 50x50mm e=1/4\", CON 2 AGUJEROS DE 9/16\" PARA 4 PERNOS DE 1/2\"","qty":2,"unit":"u / soporte","material":"C","metradoOt":"2"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_NO_CORROSIVO_BARRA_INST_010/17C', 'AREA HUMEDA', 'NO_CORROSIVO', 'BARRA_INST', '010/17C', '[{"desc":"BARRA DE COBRE CON AGUJEROS PREPERFORADOS SIMETRICOS 11mm, CON AISLADORES TIPO CB14412JK THERMOWELD O SIMILAR","qty":1,"unit":"u / cjto","material":"P","metradoOt":"1"},{"desc":"SOPORTE TIPO OMEGA ACERO INOXIDABLE 50x50mm e=1/4\", CON 2 AGUJEROS DE 9/16\" PARA 4 PERNOS DE 1/2\"","qty":2,"unit":"u / soporte","material":"C","metradoOt":"2"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_CORROSIVO_BARRA_INST_010/17C', 'AREA HUMEDA', 'CORROSIVO', 'BARRA_INST', '010/17C', '[{"desc":"BARRA DE COBRE CON AGUJEROS PREPERFORADOS SIMETRICOS 11mm, CON AISLADORES TIPO CB14412JK THERMOWELD O SIMILAR","qty":1,"unit":"u / cjto","material":"P","metradoOt":"1"},{"desc":"SOPORTE TIPO OMEGA ACERO INOXIDABLE 50x50mm e=1/4\", CON 2 AGUJEROS DE 9/16\" PARA 4 PERNOS DE 1/2\"","qty":2,"unit":"u / soporte","material":"C","metradoOt":"2"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_NO_CORROSIVO_BARRA_INST_010/17D', 'AREA HUMEDA', 'NO_CORROSIVO', 'BARRA_INST', '010/17D', '[{"desc":"BARRA DE COBRE CON AGUJEROS PREPERFORADOS SIMETRICOS 11mm, CON AISLADORES TIPO CB14412JK THERMOWELD O SIMILAR","qty":1,"unit":"u / cjto","material":"P","metradoOt":"1"},{"desc":"ANCLAJE 3/8\" TIPO HDI DE ACERO INOXIDABLE","qty":4,"unit":"u / cjto","material":"C","metradoOt":"4"},{"desc":"PERNO DE CABEZA HEXAGONAL 3/8\"X1\" DE ACERO INOXIDABLE, CON TUERCA, ARANDELA PLANA Y UNA DE PRESIÓN","qty":4,"unit":"u / cjto","material":"C","metradoOt":"4"},{"desc":"SOPORTE TIPO OMEGA ACERO INOXIDABLE 50x50mm e=1/4\", CON 2 AGUJEROS DE 9/16\" PARA 4 PERNOS DE 1/2\"","qty":2,"unit":"u / soporte","material":"C","metradoOt":"2"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;

INSERT INTO public.detalle_variants (id, area, sub_area, category, detalle_code, items)
VALUES ('AREA HUMEDA_CORROSIVO_BARRA_INST_010/17D', 'AREA HUMEDA', 'CORROSIVO', 'BARRA_INST', '010/17D', '[{"desc":"BARRA DE COBRE CON AGUJEROS PREPERFORADOS SIMETRICOS 11mm, CON AISLADORES TIPO CB14412JK THERMOWELD O SIMILAR","qty":1,"unit":"u / cjto","material":"P","metradoOt":"1"},{"desc":"ANCLAJE 3/8\" TIPO HDI DE ACERO INOXIDABLE","qty":4,"unit":"u / cjto","material":"C","metradoOt":"4"},{"desc":"PERNO DE CABEZA HEXAGONAL 3/8\"X1\" DE ACERO INOXIDABLE, CON TUERCA, ARANDELA PLANA Y UNA DE PRESIÓN","qty":4,"unit":"u / cjto","material":"C","metradoOt":"4"},{"desc":"SOPORTE TIPO OMEGA ACERO INOXIDABLE 50x50mm e=1/4\", CON 2 AGUJEROS DE 9/16\" PARA 4 PERNOS DE 1/2\"","qty":2,"unit":"u / soporte","material":"C","metradoOt":"2"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  area = EXCLUDED.area,
  sub_area = EXCLUDED.sub_area,
  category = EXCLUDED.category,
  detalle_code = EXCLUDED.detalle_code,
  items = EXCLUDED.items;
