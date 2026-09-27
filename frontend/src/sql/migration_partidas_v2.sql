-- ========================================================================
-- MIGRATION: Partidas Master v2 — 7-column layout in Supabase
-- ACTIVIDAD | WBS | PARTIDA SICME | PARTIDA BALANCE | FORECAST DESCRIPTION | DESCRIPCIÓN BM | UND
-- The master lives in public.partidas_table. Run this in the Supabase SQL editor.
-- ========================================================================

ALTER TABLE public.partidas_table ADD COLUMN IF NOT EXISTS wbs VARCHAR(50);
ALTER TABLE public.partidas_table ADD COLUMN IF NOT EXISTS partida_sicme VARCHAR(100);
ALTER TABLE public.partidas_table ADD COLUMN IF NOT EXISTS partida_balance VARCHAR(100) DEFAULT 'NA';
ALTER TABLE public.partidas_table ADD COLUMN IF NOT EXISTS descripcion_bm TEXT;
ALTER TABLE public.partidas_table ADD COLUMN IF NOT EXISTS forecast_desc TEXT;

-- Backfill new columns from the legacy layout (AREA / ITEM / DESCRIPCIÓN)
UPDATE public.partidas_table SET wbs = COALESCE(NULLIF(wbs, ''), area, '') WHERE wbs IS NULL OR wbs = '';
UPDATE public.partidas_table SET partida_sicme = COALESCE(NULLIF(partida_sicme, ''), item, '') WHERE partida_sicme IS NULL OR partida_sicme = '';
UPDATE public.partidas_table SET partida_balance = COALESCE(NULLIF(partida_balance, ''), 'NA') WHERE partida_balance IS NULL OR partida_balance = '';
UPDATE public.partidas_table SET descripcion_bm = COALESCE(NULLIF(descripcion_bm, ''), descripcion, '') WHERE descripcion_bm IS NULL OR descripcion_bm = '';

-- Fast lookup for the auto-fill: FORECAST DESCRIPTION + WBS
CREATE INDEX IF NOT EXISTS idx_partidas_wbs_forecast ON public.partidas_table (wbs, forecast_desc);
CREATE INDEX IF NOT EXISTS idx_partidas_sicme ON public.partidas_table (partida_sicme);

-- Metrado payload carries both partida columns
ALTER TABLE public."main_PAT_table" ADD COLUMN IF NOT EXISTS partida_balance VARCHAR(100) DEFAULT 'NA';
