-- 0. Clean up old triggers and functions to prevent errors during update
DROP TRIGGER IF EXISTS trg_fill_main_PAT_table ON "main_PAT_table";
DROP TRIGGER IF EXISTS trg_fill_takeoff_item_details ON "main_PAT_table";
DROP FUNCTION IF EXISTS fill_main_PAT_table();
DROP FUNCTION IF EXISTS fill_takeoff_item_details();

-- 1. Ensure edificio and vista columns exist in "main_PAT_table"
ALTER TABLE "main_PAT_table" ADD COLUMN IF NOT EXISTS edificio TEXT;
ALTER TABLE "main_PAT_table" ADD COLUMN IF NOT EXISTS vista TEXT;

-- 2. Create the trigger function to automatically fill edificio and vista on insert/update
CREATE OR REPLACE FUNCTION trg_fn_fill_main_PAT_table()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if table planos_pat_spat exists in public schema
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'planos_pat_spat'
    ) THEN
        RAISE EXCEPTION 'table planos_pat_spat do not exist';
    END IF;

    -- Populate edificio and vista from planos_pat_spat table matching document_id with plano
    SELECT description, vista 
    INTO NEW.edificio, NEW.vista
    FROM planos_pat_spat
    WHERE document_id = NEW.plano;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Bind the trigger trg_fill_main_PAT_table to "main_PAT_table"
CREATE TRIGGER trg_fill_main_PAT_table
BEFORE INSERT OR UPDATE ON "main_PAT_table"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_fill_main_PAT_table();

-- 4. Retroactively update existing rows in "main_PAT_table"
UPDATE "main_PAT_table" t
SET edificio = p.description, vista = p.vista
FROM planos_pat_spat p
WHERE t.plano = p.document_id;
