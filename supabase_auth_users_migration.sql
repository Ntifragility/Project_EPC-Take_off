-- ==============================================================================
-- EPC TAKEOFF - SUPABASE AUTHENTICATION & USER MANAGEMENT MIGRATION
-- Execute this SQL in the Supabase Dashboard: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Create table public.user_profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'Operario' CHECK (role IN ('Admin', 'Operario', 'Supervisor')),
  area TEXT NOT NULL DEFAULT 'Todas las áreas',
  admin_name TEXT,
  dni TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by email and user_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

-- 2. Create table public.user_requests (Solicitudes de registro / acceso)
CREATE TABLE IF NOT EXISTS public.user_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  dni TEXT,
  area TEXT NOT NULL DEFAULT 'Todas las áreas',
  role_requested TEXT NOT NULL DEFAULT 'Operario' CHECK (role_requested IN ('Admin', 'Operario', 'Supervisor')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_requests_status ON public.user_requests(status);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_requests ENABLE ROW LEVEL SECURITY;

-- 4. Helper function to check if the current user is an Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE (user_id = auth.uid() OR email = auth.email())
      AND role = 'Admin'
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Policies for public.user_profiles
DROP POLICY IF EXISTS "Allow select profiles" ON public.user_profiles;
CREATE POLICY "Allow select profiles" ON public.user_profiles
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert profiles" ON public.user_profiles;
CREATE POLICY "Allow insert profiles" ON public.user_profiles
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update profiles" ON public.user_profiles;
CREATE POLICY "Allow update profiles" ON public.user_profiles
  FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Allow delete profiles" ON public.user_profiles;
CREATE POLICY "Allow delete profiles" ON public.user_profiles
  FOR DELETE
  USING (true);

-- 6. Policies for public.user_requests
DROP POLICY IF EXISTS "Allow select requests" ON public.user_requests;
CREATE POLICY "Allow select requests" ON public.user_requests
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert requests" ON public.user_requests;
CREATE POLICY "Allow insert requests" ON public.user_requests
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update requests" ON public.user_requests;
CREATE POLICY "Allow update requests" ON public.user_requests
  FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Allow delete requests" ON public.user_requests;
CREATE POLICY "Allow delete requests" ON public.user_requests
  FOR DELETE
  USING (true);

-- 7. Trigger to synchronize newly created auth.users into user_profiles
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    user_id,
    email,
    role,
    area,
    admin_name,
    dni,
    status
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'Operario'),
    COALESCE(NEW.raw_user_meta_data->>'area', 'Todas las áreas'),
    COALESCE(NEW.raw_user_meta_data->>'admin_name', NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'dni', ''),
    'active'
  )
  ON CONFLICT (email) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    role = COALESCE(EXCLUDED.role, user_profiles.role),
    area = COALESCE(EXCLUDED.area, user_profiles.area),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 8. Seed Default Initial Users matching the project requirements
INSERT INTO public.user_profiles (email, role, area, admin_name, dni, status, created_at)
VALUES
  ('co.villaf@gmail.com', 'Operario', 'Área Húmeda', NULL, NULL, 'active', '2026-08-01 00:00:00+00'),
  ('mvillafuerte@ccp.pe', 'Admin', 'Todas las áreas', 'Administrador Principal 1', '48204199', 'active', '2026-06-11 00:00:00+00')
ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  area = EXCLUDED.area,
  admin_name = EXCLUDED.admin_name,
  dni = EXCLUDED.dni;
