-- ============================================================================
-- EPC TAKEOFF — FULL RE-MODEL · Task 2: UUID map + identity backfill
-- Run AFTER 01_ddl, BEFORE 03_backfill. Idempotent.
-- Bridges legacy TEXT ids (r1/r2, AREA_..._CABLE_2_0_...) to new UUIDs without
-- breaking any live reader: TEXT ids stay PK, uuid columns get filled + mapped.
-- Prereq: 01_ddl. Next: 03_backfill
-- ============================================================================

-- 1. One map row per existing rule / variant / rule_item (never rewrites).
INSERT INTO public.legacy_id_map (old_id, kind)
SELECT r.id, 'rule' FROM public.takeoff_rules r
ON CONFLICT (old_id) DO NOTHING;

INSERT INTO public.legacy_id_map (old_id, kind)
SELECT v.id, 'variant' FROM public.detalle_variants v
ON CONFLICT (old_id) DO NOTHING;

INSERT INTO public.legacy_id_map (old_id, kind)
SELECT i.id, 'item' FROM public.rule_items i
ON CONFLICT (old_id) DO NOTHING;

-- 2. Backfill uuid columns from the map (production tables keep TEXT PKs for now).
UPDATE public.takeoff_rules r
SET uuid = m.new_id
FROM public.legacy_id_map m
WHERE m.old_id = r.id AND m.kind = 'rule' AND r.uuid IS NULL;

UPDATE public.detalle_variants v
SET uuid = m.new_id
FROM public.legacy_id_map m
WHERE m.old_id = v.id AND m.kind = 'variant' AND v.uuid IS NULL;

UPDATE public.rule_items i
SET uuid = m.new_id
FROM public.legacy_id_map m
WHERE m.old_id = i.id AND m.kind = 'item' AND i.uuid IS NULL;

-- 3. Guard: every legacy row must be mapped + stamped.
DO $$
DECLARE
  unmapped_rules INT; unmapped_variants INT; unmapped_items INT;
BEGIN
  SELECT COUNT(*) INTO unmapped_rules FROM public.takeoff_rules WHERE uuid IS NULL;
  SELECT COUNT(*) INTO unmapped_variants FROM public.detalle_variants WHERE uuid IS NULL;
  SELECT COUNT(*) INTO unmapped_items FROM public.rule_items WHERE uuid IS NULL;

  INSERT INTO public.remodel_orphans (check_name, detail)
  SELECT 'uuid_map_missing', jsonb_build_object('table', t.tbl, 'old_id', t.id)
  FROM (
    SELECT 'takeoff_rules' AS tbl, id FROM public.takeoff_rules WHERE uuid IS NULL
    UNION ALL
    SELECT 'detalle_variants', id FROM public.detalle_variants WHERE uuid IS NULL
    UNION ALL
    SELECT 'rule_items', id FROM public.rule_items WHERE uuid IS NULL
  ) t;

  IF unmapped_rules + unmapped_variants + unmapped_items > 0 THEN
    RAISE NOTICE 'REMODEL-02 WARN · unmapped rules=% variants=% items=% (see remodel_orphans)',
      unmapped_rules, unmapped_variants, unmapped_items;
  ELSE
    RAISE NOTICE 'REMODEL-02 OK · all legacy ids mapped (rules+variants+items)';
  END IF;
END $$;
