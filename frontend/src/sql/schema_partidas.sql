-- ========================================================================
-- 1. TABLA MASTER DE PARTIDAS: public.partidas_table
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.partidas_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actividad VARCHAR(50) NOT NULL,
    area VARCHAR(50) NOT NULL,
    item VARCHAR(100) NOT NULL,
    forecast_desc TEXT,
    descripcion TEXT NOT NULL,
    und VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices de búsqueda rápida por AREA + DESCRIPCIÓN
CREATE INDEX IF NOT EXISTS idx_partidas_area_desc ON public.partidas_table (area, descripcion);
CREATE INDEX IF NOT EXISTS idx_partidas_area_forecast ON public.partidas_table (area, forecast_desc);

-- Seguridad a nivel de fila (RLS) y permisos
ALTER TABLE public.partidas_table ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read partidas" ON public.partidas_table;
CREATE POLICY "Allow anon read partidas" ON public.partidas_table
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon all partidas" ON public.partidas_table;
CREATE POLICY "Allow anon all partidas" ON public.partidas_table
    FOR ALL USING (true);


-- ========================================================================
-- 2. TABLA PRINCIPAL DE METRADO: public."main_PAT_table"
-- En PostgreSQL los nombres con mayúsculas requieren comillas dobles: "main_PAT_table"
-- ========================================================================
CREATE TABLE IF NOT EXISTS public."main_PAT_table" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partida VARCHAR(100) DEFAULT 'NA',
    material VARCHAR(10) DEFAULT '',
    plano VARCHAR(100) DEFAULT '',
    rev VARCHAR(10) DEFAULT '',
    tag_unico VARCHAR(100) DEFAULT '',
    tag_plano VARCHAR(100) DEFAULT '',
    detalle VARCHAR(50) DEFAULT '',
    description TEXT DEFAULT '',
    qty NUMERIC DEFAULT NULL,
    metrado_ot VARCHAR(50) DEFAULT '',
    unit VARCHAR(20) DEFAULT '',
    notes TEXT DEFAULT '',
    pkg_name VARCHAR(100) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Si la tabla ya existía previamente sin la columna 'partida':
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'main_PAT_table'
    ) THEN
        ALTER TABLE public."main_PAT_table" ADD COLUMN IF NOT EXISTS partida VARCHAR(100) DEFAULT 'NA';
    END IF;
END $$;

