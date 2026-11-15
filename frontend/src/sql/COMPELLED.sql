-- ==============================================================================
-- Migration / Fix: Normalize detalle_variants in Supabase SSOT
-- Ensures:
-- 1. sub_area column exists with default 'NO_CORROSIVO'
-- 2. Legacy rows without NO_CORROSIVO in their ID are updated to canonical format
-- 3. Any duplicated rows are deduplicated
-- 4. Unique index on (area, sub_area, category, detalle_code) is in place
-- 5. RLS policies allow SELECT and ALL operations
-- Run this in Supabase SQL Editor if you want to normalize existing records directly.
-- ==============================================================================

-- 1. Ensure sub_area column exists
ALTER TABLE public.detalle_variants ADD COLUMN IF NOT EXISTS sub_area TEXT NOT NULL DEFAULT 'NO_CORROSIVO';

-- 2. Update NULL or empty sub_area values to 'NO_CORROSIVO'
UPDATE public.detalle_variants 
SET sub_area = 'NO_CORROSIVO' 
WHERE sub_area IS NULL OR TRIM(sub_area) = '';

-- 3. In case of duplicate natural keys before updating IDs, keep only the latest row
DELETE FROM public.detalle_variants a
USING public.detalle_variants b
WHERE a.ctid < b.ctid
  AND a.area = b.area
  AND a.sub_area = b.sub_area
  AND a.category = b.category
  AND a.detalle_code = b.detalle_code;

-- 4. Update legacy IDs (format: 'AREA SECA_CABLE_2_0_151' -> 'AREA SECA_NO_CORROSIVO_CABLE_2_0_151')
UPDATE public.detalle_variants
SET id = area || '_' || sub_area || '_' || category || '_' || detalle_code
WHERE id NOT LIKE '%_NO_CORROSIVO_%' AND id NOT LIKE '%_CORROSIVO_%';

-- 5. Ensure unique index on lookup natural key
CREATE UNIQUE INDEX IF NOT EXISTS idx_detalle_variants_lookup 
ON public.detalle_variants (area, sub_area, category, detalle_code);

-- 6. Ensure RLS policies are active and permit read and write
ALTER TABLE public.detalle_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read detalle variants" ON public.detalle_variants;
CREATE POLICY "Allow anon read detalle variants" ON public.detalle_variants
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon write detalle variants" ON public.detalle_variants;
CREATE POLICY "Allow anon write detalle variants" ON public.detalle_variants
    FOR ALL USING (true) WITH CHECK (true);
