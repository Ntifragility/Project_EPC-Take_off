-- ==============================================================================
-- MIGRATION: User Role Hierarchy - Levels 1, 2, 3
-- Level 1 -> Operario
-- Level 2 -> Superv
-- Level 3 -> Admin
-- ==============================================================================

-- 1. Actualizar roles existentes de 'Supervisor' a 'Superv' en user_profiles
UPDATE public.user_profiles
SET role = 'Superv'
WHERE role = 'Supervisor';

-- 2. Actualizar solicitudes pendientes con 'Supervisor' a 'Superv' si existen
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_requests') THEN
    UPDATE public.user_requests
    SET role_requested = 'Superv'
    WHERE role_requested = 'Supervisor';
  END IF;
END $$;

-- 3. Actualizar la restricción CHECK de roles en user_profiles
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('Admin', 'Superv', 'Operario', 'Supervisor'));

-- 4. Actualizar la restricción CHECK en user_requests (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_requests') THEN
    ALTER TABLE public.user_requests
      DROP CONSTRAINT IF EXISTS user_requests_role_requested_check;

    ALTER TABLE public.user_requests
      ADD CONSTRAINT user_requests_role_requested_check
      CHECK (role_requested IN ('Admin', 'Superv', 'Operario', 'Supervisor'));
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
