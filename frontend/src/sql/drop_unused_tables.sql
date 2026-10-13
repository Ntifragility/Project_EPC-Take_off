-- Empty leftovers. The app never reads or writes these tables.
-- regla_detalles was replaced by detalle_variants + rule_items.
-- area_seca_process_areas is unused; area is chosen in the UI.

DROP TABLE IF EXISTS public.regla_detalles;
DROP TABLE IF EXISTS public.area_seca_process_areas;
