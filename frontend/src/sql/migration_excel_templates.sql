-- ==============================================================================
-- Migration: Add excel_templates table for Admin Custom Excel Templates
-- Single Source of Truth: Supabase public.excel_templates table
-- Run this in Supabase SQL Editor.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.excel_templates (
    id TEXT PRIMARY KEY, -- 'metrado_pat', 'partidas_master', 'bductos'
    name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_data TEXT NOT NULL, -- base64 encoded string
    file_size INTEGER NOT NULL DEFAULT 0,
    updated_by TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.excel_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read excel templates" ON public.excel_templates;
CREATE POLICY "Allow anon read excel templates" ON public.excel_templates
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon write excel templates" ON public.excel_templates;
CREATE POLICY "Allow anon write excel templates" ON public.excel_templates
    FOR ALL USING (true) WITH CHECK (true);

