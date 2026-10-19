-- ==============================================================================
-- MIGRATION: Pure User Levels Hierarchy
-- Roles are strictly: 'Level 1', 'Level 2', 'Level 3'
-- (Words OPERARIO, SUPERVISOR, ADMIN removed)
-- ==============================================================================

-- 1. Migrar registros existentes a 'Level 1', 'Level 2', 'Level 3'
UPDATE public.user_profiles
SET role = 'Level 1'
WHERE role IN ('Operario', 'operario');

UPDATE public.user_profiles
SET role = 'Level 2'
WHERE role IN ('Supervisor', 'Superv', 'supervisor', 'superv');

UPDATE public.user_profiles
SET role = 'Level 3'
WHERE role IN ('Admin', 'admin');

-- 2. Migrar solicitudes pendientes si existen
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_requests') THEN
    UPDATE public.user_requests
    SET role_requested = 'Level 1'
    WHERE role_requested IN ('Operario', 'operario');

    UPDATE public.user_requests
    SET role_requested = 'Level 2'
    WHERE role_requested IN ('Supervisor', 'Superv', 'supervisor', 'superv');

    UPDATE public.user_requests
    SET role_requested = 'Level 3'
    WHERE role_requested IN ('Admin', 'admin');
  END IF;
END $$;

-- 3. Actualizar la restricción CHECK de roles en user_profiles
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('Level 1', 'Level 2', 'Level 3'));

ALTER TABLE public.user_profiles
  ALTER COLUMN role SET DEFAULT 'Level 1';

-- 4. Actualizar la restricción CHECK en user_requests (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_requests') THEN
    ALTER TABLE public.user_requests
      DROP CONSTRAINT IF EXISTS user_requests_role_requested_check;

    ALTER TABLE public.user_requests
      ADD CONSTRAINT user_requests_role_requested_check
      CHECK (role_requested IN ('Level 1', 'Level 2', 'Level 3'));

    ALTER TABLE public.user_requests
      ALTER COLUMN role_requested SET DEFAULT 'Level 1';
  END IF;
END $$;

-- 5. Asegurar permisos para authenticated y anon
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO anon;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_requests') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_requests TO authenticated;
    GRANT SELECT, INSERT ON public.user_requests TO anon;
  END IF;
END $$;
