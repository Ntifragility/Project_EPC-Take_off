-- ============================================================================
-- EPC TAKEOFF — FULL RE-MODEL · Task 4: FKs (NOT VALID -> VALIDATE) + orphans
-- Run AFTER 03_backfill. Idempotent. Adds the FKs skipped in the legacy
-- schema WITHOUT locking production writes: constraints are created
-- NOT VALID (no table scan, no lock), orphans are quarantined into
-- remodel_orphans, then constraints are VALIDATEd.
-- Prereq: 03_backfill. Next: cutover writer (code Task 6).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 4.1 quarantine: collect orphans BEFORE validating
-- --------------------------------------------------------------------------
-- NOTE: remodel_orphans has a BIGSERIAL pk and no unique key on
-- (check_name, detail), so these inserts intentionally have NO ON CONFLICT —
-- re-runs append a fresh audit row (created_at) instead of failing.
-- --------------------------------------------------------------------------
INSERT INTO public.remodel_orphans (check_name, detail)
SELECT 'fk_rule_items_rule_missing_parent',
  jsonb_build_object('rule_item_id', i.id, 'rule_id', i.rule_id)
FROM public.rule_items i
WHERE NOT EXISTS (SELECT 1 FROM public.takeoff_rules r WHERE r.id = i.rule_id);

INSERT INTO public.remodel_orphans (check_name, detail)
SELECT 'fk_overrides_item_missing',
  jsonb_build_object('override_id', o.id, 'rule_item_id', o.rule_item_id)
FROM public.rule_item_overrides o
WHERE NOT EXISTS (SELECT 1 FROM public.rule_items i WHERE i.id = o.rule_item_id);

INSERT INTO public.remodel_orphans (check_name, detail)
SELECT 'fk_overrides_detalle_missing',
  jsonb_build_object('override_id', o.id, 'detalle_code', o.detalle_code)
FROM public.rule_item_overrides o
WHERE o.detalle_code IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.detalle_catalog c WHERE c.code = o.detalle_code);

INSERT INTO public.remodel_orphans (check_name, detail)
SELECT 'fk_param_rule_missing_parent',
  jsonb_build_object('option_id', p.id, 'rule_id', p.rule_id)
FROM public.rule_parameter_options p
WHERE NOT EXISTS (SELECT 1 FROM public.takeoff_rules r WHERE r.id = p.rule_id);

INSERT INTO public.remodel_orphans (check_name, detail)
SELECT 'fk_variant_rule_missing_parent',
  jsonb_build_object('variant_id', v.id, 'rule_id', v.rule_id)
FROM public.detalle_variants v
WHERE v.rule_id IS NOT NULL AND TRIM(v.rule_id) <> ''
  AND NOT EXISTS (SELECT 1 FROM public.takeoff_rules r WHERE r.id = v.rule_id);

-- --------------------------------------------------------------------------
-- 4.2 add constraints NOT VALID (no scan, no write lock)
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_items_rule') THEN
    ALTER TABLE public.rule_items ADD CONSTRAINT fk_items_rule
      FOREIGN KEY (rule_id) REFERENCES public.takeoff_rules(id)
      ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ov_item') THEN
    ALTER TABLE public.rule_item_overrides ADD CONSTRAINT fk_ov_item
      FOREIGN KEY (rule_item_id) REFERENCES public.rule_items(id)
      ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ov_detalle') THEN
    ALTER TABLE public.rule_item_overrides ADD CONSTRAINT fk_ov_detalle
      FOREIGN KEY (detalle_code) REFERENCES public.detalle_catalog(code)
      ON UPDATE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_param_rule') THEN
    ALTER TABLE public.rule_parameter_options ADD CONSTRAINT fk_param_rule
      FOREIGN KEY (rule_id) REFERENCES public.takeoff_rules(id)
      ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_area_det_rule') THEN
    ALTER TABLE public.rule_area_detalles ADD CONSTRAINT fk_area_det_rule
      FOREIGN KEY (rule_id) REFERENCES public.takeoff_rules(id)
      ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_area_det_catalog') THEN
    ALTER TABLE public.rule_area_detalles ADD CONSTRAINT fk_area_det_catalog
      FOREIGN KEY (detalle_code) REFERENCES public.detalle_catalog(code)
      ON UPDATE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_variant_rule') THEN
    ALTER TABLE public.detalle_variants ADD CONSTRAINT fk_variant_rule
      FOREIGN KEY (rule_id) REFERENCES public.takeoff_rules(id)
      ON DELETE SET NULL NOT VALID;
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- 4.3 repair the ONLY auto-fixable class: null out dangling variant rule_ids
-- (rules can be deleted independently; variants survive. Everything else
-- needs a human — see remodel_orphans — so VALIDATE will fail loudly until
-- the queue is cleared, which is the point.)
-- --------------------------------------------------------------------------
UPDATE public.detalle_variants v
SET rule_id = NULL
WHERE v.rule_id IS NOT NULL AND TRIM(v.rule_id) <> ''
  AND NOT EXISTS (SELECT 1 FROM public.takeoff_rules r WHERE r.id = v.rule_id);

-- --------------------------------------------------------------------------
-- 4.4 validate (fails loudly if orphans remain — clear remodel_orphans first)
-- --------------------------------------------------------------------------
ALTER TABLE public.rule_items VALIDATE CONSTRAINT fk_items_rule;
ALTER TABLE public.rule_item_overrides VALIDATE CONSTRAINT fk_ov_item;
ALTER TABLE public.rule_item_overrides VALIDATE CONSTRAINT fk_ov_detalle;
ALTER TABLE public.rule_parameter_options VALIDATE CONSTRAINT fk_param_rule;
ALTER TABLE public.rule_area_detalles VALIDATE CONSTRAINT fk_area_det_rule;
ALTER TABLE public.rule_area_detalles VALIDATE CONSTRAINT fk_area_det_catalog;
ALTER TABLE public.detalle_variants VALIDATE CONSTRAINT fk_variant_rule;

DO $$
BEGIN
  RAISE NOTICE 'REMODEL-04 OK · 7 FKs validated. Orphan queue: % rows (SELECT * FROM remodel_orphans ORDER BY created_at DESC LIMIT 20)',
    (SELECT COUNT(*) FROM public.remodel_orphans);
END $$;
