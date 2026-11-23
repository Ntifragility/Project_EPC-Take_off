-- Rejection Rules SSOT (Supabase)
-- One row per import-time validation. The app merges these over built-in
-- defaults; localStorage holds only an offline cache.
-- Run this in the Supabase SQL editor, then the app seeds defaults on first load.

CREATE TABLE IF NOT EXISTS public.rejection_rules (
    id TEXT PRIMARY KEY,
    scope TEXT NOT NULL DEFAULT 'metrado',
    name TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    message TEXT NOT NULL DEFAULT '',
    params JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rejection_rules_scope ON public.rejection_rules(scope);

ALTER TABLE public.rejection_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Rejection Rules" ON public.rejection_rules;
CREATE POLICY "Public Read Rejection Rules" ON public.rejection_rules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Write Rejection Rules" ON public.rejection_rules;
CREATE POLICY "Public Write Rejection Rules" ON public.rejection_rules FOR ALL USING (true) WITH CHECK (true);
