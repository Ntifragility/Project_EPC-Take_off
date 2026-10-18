-- Migration V3: Unified Database-First Rule Engine
-- Replaces fragmented rules (items, detalle_variants, cable_tray_matrix) with a single universal schema.
-- Includes Area-Specific Detalle Mapping (Area Seca and Area Húmeda have distinct detail codes).

DROP TABLE IF EXISTS public.rule_area_detalles CASCADE;
DROP TABLE IF EXISTS public.rule_parameter_options CASCADE;
DROP TABLE IF EXISTS public.rule_item_overrides CASCADE;
DROP TABLE IF EXISTS public.rule_items CASCADE;
DROP TABLE IF EXISTS public.takeoff_rules CASCADE;
DROP TABLE IF EXISTS public.detalle_catalog CASCADE;

-- 1. DETALLE CATALOG
CREATE TABLE IF NOT EXISTS public.detalle_catalog (
    code TEXT PRIMARY KEY,
    section TEXT NOT NULL DEFAULT 'pat',
    area TEXT NOT NULL DEFAULT 'GENERAL',
    description TEXT,
    drawing_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TAKEOFF RULES (Universal Rule Header)
CREATE TABLE IF NOT EXISTS public.takeoff_rules (
    id TEXT PRIMARY KEY,
    section TEXT NOT NULL DEFAULT 'pat',
    trigger TEXT NOT NULL,
    default_detalle TEXT,
    tag_prefix TEXT NOT NULL DEFAULT 'M',
    allowed_areas TEXT[] NOT NULL DEFAULT '{"AREA SECA","AREA HUMEDA"}',
    area_detalles JSONB NOT NULL DEFAULT '{}'::jsonb,
    allow_detalle_edit BOOLEAN NOT NULL DEFAULT TRUE,
    has_dimension_param BOOLEAN NOT NULL DEFAULT FALSE,
    dimension_param_name TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. RULE AREA DETALLES (Relational Area-Specific Detalle Mapping)
CREATE TABLE IF NOT EXISTS public.rule_area_detalles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    rule_id TEXT NOT NULL REFERENCES public.takeoff_rules(id) ON DELETE CASCADE,
    area TEXT NOT NULL CHECK (area IN ('AREA SECA', 'AREA HUMEDA', 'MINA')),
    detalle_code TEXT NOT NULL REFERENCES public.detalle_catalog(code) ON UPDATE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_rule_area UNIQUE (rule_id, area)
);

-- 4. RULE SUBITEMS (Bill of Materials Components)
CREATE TABLE IF NOT EXISTS public.rule_items (
    id TEXT PRIMARY KEY,
    rule_id TEXT NOT NULL REFERENCES public.takeoff_rules(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0,
    descripcion TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'und',
    material TEXT NOT NULL CHECK (material IN ('P', 'C')),
    base_qty TEXT NOT NULL DEFAULT '1',
    formula TEXT NOT NULL DEFAULT '',
    optional BOOLEAN NOT NULL DEFAULT FALSE,
    subitem_detalle TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. DETALLE-SPECIFIC ITEM OVERRIDES (Overrides for specific details if needed)
CREATE TABLE IF NOT EXISTS public.rule_item_overrides (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    rule_item_id TEXT NOT NULL REFERENCES public.rule_items(id) ON DELETE CASCADE,
    detalle_code TEXT NOT NULL,
    override_descripcion TEXT,
    override_qty TEXT,
    override_unit TEXT,
    override_formula TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. RULE PARAMETER OPTIONS (e.g. Width options 900mm, 600mm, 450mm, 300mm)
CREATE TABLE IF NOT EXISTS public.rule_parameter_options (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    rule_id TEXT NOT NULL REFERENCES public.takeoff_rules(id) ON DELETE CASCADE,
    param_key TEXT NOT NULL, -- e.g. 'width'
    option_label TEXT NOT NULL, -- e.g. '900 mm'
    option_value TEXT NOT NULL, -- e.g. '900'
    multiplier_map JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_takeoff_rules_section ON public.takeoff_rules(section);
CREATE INDEX IF NOT EXISTS idx_rule_items_rule ON public.rule_items(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_area_detalles_lookup ON public.rule_area_detalles(rule_id, area);
CREATE INDEX IF NOT EXISTS idx_rule_item_overrides_lookup ON public.rule_item_overrides(rule_item_id, detalle_code);
CREATE INDEX IF NOT EXISTS idx_detalle_catalog_area ON public.detalle_catalog(area);

-- Enable RLS
ALTER TABLE public.detalle_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.takeoff_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_area_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_item_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_parameter_options ENABLE ROW LEVEL SECURITY;

-- Permissive Policies
DROP POLICY IF EXISTS "Allow anon all detalle catalog" ON public.detalle_catalog;
CREATE POLICY "Allow anon all detalle catalog" ON public.detalle_catalog FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all takeoff rules" ON public.takeoff_rules;
CREATE POLICY "Allow anon all takeoff rules" ON public.takeoff_rules FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all rule area detalles" ON public.rule_area_detalles;
CREATE POLICY "Allow anon all rule area detalles" ON public.rule_area_detalles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all rule items" ON public.rule_items;
CREATE POLICY "Allow anon all rule items" ON public.rule_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all rule item overrides" ON public.rule_item_overrides;
CREATE POLICY "Allow anon all rule item overrides" ON public.rule_item_overrides FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all rule parameter options" ON public.rule_parameter_options;
CREATE POLICY "Allow anon all rule parameter options" ON public.rule_parameter_options FOR ALL USING (true) WITH CHECK (true);

-- =========================================================================
-- SEED DATA: DETALLE CATALOG (Includes distinct codes for Dry and Wet areas)
-- =========================================================================
INSERT INTO public.detalle_catalog (code, section, area, description) VALUES
('151', 'pat', 'AREA SECA', 'Conexión a estructura / equipo con cable 2/0 AWG'),
('020', 'pat', 'AREA SECA', 'Puesta a tierra de motores y tableros'),
('022', 'pat', 'AREA SECA', 'Puesta a tierra de bandejas portacables con cable 2/0'),
('166A', 'pat', 'AREA SECA', 'Barra de puesta a tierra principal de potencia (BARRA POT)'),
('166B', 'pat', 'AREA SECA', 'Barra equipotencial secundaria'),
('166C', 'pat', 'AREA SECA', 'Barra de puesta a tierra instrumentación (BARRA INST)'),
('167/G1', 'pat', 'AREA SECA', 'Malla a tierra con cable desnudo 4/0 AWG en zanja (Área Seca)'),
('167/X1', 'pat', 'AREA SECA', 'Soldadura exotérmica tipo T 4/0 - 4/0 (Área Seca)'),
('167/X2', 'pat', 'AREA SECA', 'Soldadura exotérmica tipo T 4/0 - 2/0 (Área Seca)'),
('008/3A', 'pat', 'AREA HUMEDA', 'Bajada de cable a tierra en tramo vertical protegido (Área Húmeda)'),
('008/3B', 'pat', 'AREA HUMEDA', 'Bajada de cable a tierra con recubrimiento de concreto (Área Húmeda)'),
('008/4T1', 'pat', 'AREA HUMEDA', 'Soldadura exotérmica tipo T 4/0 (Área Húmeda / Alta Corrosión)'),
('008/4T2', 'pat', 'AREA HUMEDA', 'Soldadura exotérmica tipo T 4/0 - 2/0 (Área Húmeda / Alta Corrosión)'),
('010/17A', 'pat', 'AREA HUMEDA', 'Pozo de puesta a tierra vertical con caja de registro tipo A (Área Húmeda)'),
('010/17B', 'pat', 'AREA HUMEDA', 'Pozo de puesta a tierra vertical con caja de registro tipo B (Área Húmeda)'),
('010/17C', 'pat', 'AREA HUMEDA', 'Pozo de puesta a tierra vertical con caja de registro tipo C (Área Húmeda)'),
('010/17D', 'pat', 'AREA HUMEDA', 'Pozo de puesta a tierra horizontal (Área Húmeda)'),
('008/05', 'pat', 'GENERAL', 'Derivación de cable a estructura con terminal a compresión'),
('001/2B-X1', 'canalizado', 'GENERAL', 'Soporte trapecio / lateral para bandeja portacables escalerilla'),
('001/1', 'canalizado', 'GENERAL', 'Soporte trapecio para bandejas')
ON CONFLICT (code) DO UPDATE SET 
    description = EXCLUDED.description, 
    area = EXCLUDED.area,
    updated_at = NOW();

-- =========================================================================
-- SEED DATA: TAKEOFF RULES WITH AREA-SPECIFIC DETALLES
-- =========================================================================

-- Rule r1: CABLE DESNUDO 4/0 AWG
-- Seca: 167/G1 | Húmeda: 008/3A
INSERT INTO public.takeoff_rules (id, section, trigger, default_detalle, tag_prefix, allowed_areas, area_detalles, allow_detalle_edit, order_index)
VALUES ('r1', 'pat', 'CABLE DESNUDO 4/0 AWG', '167/G1', 'C', '{"AREA SECA","AREA HUMEDA"}', '{"AREA SECA": "167/G1", "AREA HUMEDA": "008/3A"}'::jsonb, TRUE, 1)
ON CONFLICT (id) DO UPDATE SET 
    trigger = EXCLUDED.trigger, 
    default_detalle = EXCLUDED.default_detalle, 
    area_detalles = EXCLUDED.area_detalles,
    tag_prefix = EXCLUDED.tag_prefix;

INSERT INTO public.rule_area_detalles (rule_id, area, detalle_code) VALUES
('r1', 'AREA SECA', '167/G1'),
('r1', 'AREA HUMEDA', '008/3A')
ON CONFLICT (rule_id, area) DO UPDATE SET detalle_code = EXCLUDED.detalle_code;

INSERT INTO public.rule_items (id, rule_id, order_index, descripcion, unit, material, base_qty, formula) VALUES
('r1-s1', 'r1', 1, 'CABLE DESNUDO 4/0 AWG', 'm', 'P', 'Var.', 'qty'),
('r1-s2', 'r1', 2, 'CINTA AMARILLA', 'm', 'C', 'Var.', 'qty'),
('r1-s3', 'r1', 3, 'TIERRA DE CULTIVO', 'm3', 'C', 'length x 0.375 x 0.5', 'length * 0.375 * 0.5'),
('r1-s4', 'r1', 4, 'CEMENTO GEM (11.3 Kg x bls)', 'kg', 'C', 'length x 11.3 / 2', 'length * 11.3 / 2')
ON CONFLICT (id) DO NOTHING;

-- Rule r2: CABLE DESNUDO 2/0 AWG
-- Seca: 151 | Húmeda: 008/05
INSERT INTO public.takeoff_rules (id, section, trigger, default_detalle, tag_prefix, allowed_areas, area_detalles, allow_detalle_edit, order_index)
VALUES ('r2', 'pat', 'CABLE DESNUDO 2/0 AWG', '151', 'M', '{"AREA SECA","AREA HUMEDA"}', '{"AREA SECA": "151", "AREA HUMEDA": "008/05"}'::jsonb, TRUE, 2)
ON CONFLICT (id) DO UPDATE SET 
    trigger = EXCLUDED.trigger, 
    default_detalle = EXCLUDED.default_detalle, 
    area_detalles = EXCLUDED.area_detalles,
    tag_prefix = EXCLUDED.tag_prefix;

INSERT INTO public.rule_area_detalles (rule_id, area, detalle_code) VALUES
('r2', 'AREA SECA', '151'),
('r2', 'AREA HUMEDA', '008/05')
ON CONFLICT (rule_id, area) DO UPDATE SET detalle_code = EXCLUDED.detalle_code;

INSERT INTO public.rule_items (id, rule_id, order_index, descripcion, unit, material, base_qty, formula, optional) VALUES
('r2-s1', 'r2', 1, 'CABLE DESNUDO 2/0 AWG', 'm', 'P', '1', 'count * 1', FALSE),
('r2-s2', 'r2', 2, 'TUBERIA PVC SCH 80 Ø3/4"', 'm', 'C', '1', 'count * 1', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Rule r3: POZO CON CAJA REGISTRO
INSERT INTO public.takeoff_rules (id, section, trigger, default_detalle, tag_prefix, allowed_areas, area_detalles, allow_detalle_edit, order_index)
VALUES ('r3', 'pat', 'POZO CON CAJA REGISTRO', '010/17A', 'PC', '{"AREA SECA","AREA HUMEDA"}', '{"AREA SECA": "010/17A", "AREA HUMEDA": "010/17A"}'::jsonb, TRUE, 3)
ON CONFLICT (id) DO UPDATE SET 
    trigger = EXCLUDED.trigger, 
    default_detalle = EXCLUDED.default_detalle, 
    area_detalles = EXCLUDED.area_detalles,
    tag_prefix = EXCLUDED.tag_prefix;

INSERT INTO public.rule_area_detalles (rule_id, area, detalle_code) VALUES
('r3', 'AREA SECA', '010/17A'),
('r3', 'AREA HUMEDA', '010/17A')
ON CONFLICT (rule_id, area) DO UPDATE SET detalle_code = EXCLUDED.detalle_code;

INSERT INTO public.rule_items (id, rule_id, order_index, descripcion, unit, material, base_qty, formula) VALUES
('r3-s1', 'r3', 1, 'POZO CON CAJA REGISTRO', 'und', 'P', '1', 'count'),
('r3-s2', 'r3', 2, 'CEMENTO GEM (11.3 kg x bls)', 'kg', 'C', '1', 'count * 1'),
('r3-s3', 'r3', 3, 'CAJA REGISTRO 400 x 400 x 300 mm', 'und', 'C', '1', 'count * 1'),
('r3-s4', 'r3', 4, 'VARILLA COPPERWELD 3/4"X2.4M', 'und', 'C', '1', 'count * 1'),
('r3-s5', 'r3', 5, 'CONECTOR GK 1429', 'und', 'C', '1', 'count * 1'),
('r3-s6', 'r3', 6, 'TIERRA DE CULTIVO', 'm3', 'C', '4.71', 'count * 4.71')
ON CONFLICT (id) DO NOTHING;

-- Rule r4: POZO SIN CAJA REGISTRO
INSERT INTO public.takeoff_rules (id, section, trigger, default_detalle, tag_prefix, allowed_areas, area_detalles, allow_detalle_edit, order_index)
VALUES ('r4', 'pat', 'POZO SIN CAJA REGISTRO', '010/17D', 'PS', '{"AREA SECA","AREA HUMEDA"}', '{"AREA SECA": "010/17D", "AREA HUMEDA": "010/17D"}'::jsonb, TRUE, 4)
ON CONFLICT (id) DO UPDATE SET 
    trigger = EXCLUDED.trigger, 
    default_detalle = EXCLUDED.default_detalle, 
    area_detalles = EXCLUDED.area_detalles,
    tag_prefix = EXCLUDED.tag_prefix;

INSERT INTO public.rule_area_detalles (rule_id, area, detalle_code) VALUES
('r4', 'AREA SECA', '010/17D'),
('r4', 'AREA HUMEDA', '010/17D')
ON CONFLICT (rule_id, area) DO UPDATE SET detalle_code = EXCLUDED.detalle_code;

INSERT INTO public.rule_items (id, rule_id, order_index, descripcion, unit, material, base_qty, formula) VALUES
('r4-s1', 'r4', 1, 'POZO SIN CAJA REGISTRO', 'und', 'P', '1', 'count'),
('r4-s2', 'r4', 2, 'CEMENTO GEM (11.3 kg x bls)', 'kg', 'C', '1', 'count * 1'),
('r4-s3', 'r4', 3, 'VARILLA COPPERWELD 3/4"X2.4M', 'und', 'C', '1', 'count * 1'),
('r4-s4', 'r4', 4, 'SOLDADURA GT', 'und', 'C', '1', 'count * 1'),
('r4-s5', 'r4', 5, 'CARGA 115', 'und', 'C', '1', 'count * 1'),
('r4-s6', 'r4', 6, 'MOLDE M-561', 'und', 'C', '0.0167', 'count * 0.0167'),
('r4-s7', 'r4', 7, 'TIERRA DE CULTIVO', 'm3', 'C', '4.71', 'count * 4.71')
ON CONFLICT (id) DO NOTHING;

-- Rule r5: SOLDADURA T 4/0
-- Seca: 167/X1 | Húmeda: 008/4T1
INSERT INTO public.takeoff_rules (id, section, trigger, default_detalle, tag_prefix, allowed_areas, area_detalles, allow_detalle_edit, order_index)
VALUES ('r5', 'pat', 'SOLDADURA T 4/0', '167/X1', 'TT', '{"AREA SECA","AREA HUMEDA"}', '{"AREA SECA": "167/X1", "AREA HUMEDA": "008/4T1"}'::jsonb, TRUE, 5)
ON CONFLICT (id) DO UPDATE SET 
    trigger = EXCLUDED.trigger, 
    default_detalle = EXCLUDED.default_detalle, 
    area_detalles = EXCLUDED.area_detalles,
    tag_prefix = EXCLUDED.tag_prefix;

INSERT INTO public.rule_area_detalles (rule_id, area, detalle_code) VALUES
('r5', 'AREA SECA', '167/X1'),
('r5', 'AREA HUMEDA', '008/4T1')
ON CONFLICT (rule_id, area) DO UPDATE SET detalle_code = EXCLUDED.detalle_code;

INSERT INTO public.rule_items (id, rule_id, order_index, descripcion, unit, material, base_qty, formula) VALUES
('r5-s1', 'r5', 1, 'SOLDADURA T 4/0', 'und', 'P', '1', 'count'),
('r5-s2', 'r5', 2, 'CARGA 150', 'und', 'C', '1', 'count * 1'),
('r5-s3', 'r5', 3, 'MOLDE TAC2Q2Q', 'und', 'C', '0.0167', 'count * 0.0167')
ON CONFLICT (id) DO NOTHING;

-- Rule r6: SOLDADURA T 4/0 -2/0
-- Seca: 167/X2 | Húmeda: 008/4T2
INSERT INTO public.takeoff_rules (id, section, trigger, default_detalle, tag_prefix, allowed_areas, area_detalles, allow_detalle_edit, order_index)
VALUES ('r6', 'pat', 'SOLDADURA T 4/0 -2/0', '167/X2', 'TT', '{"AREA SECA","AREA HUMEDA"}', '{"AREA SECA": "167/X2", "AREA HUMEDA": "008/4T2"}'::jsonb, TRUE, 6)
ON CONFLICT (id) DO UPDATE SET 
    trigger = EXCLUDED.trigger, 
    default_detalle = EXCLUDED.default_detalle, 
    area_detalles = EXCLUDED.area_detalles,
    tag_prefix = EXCLUDED.tag_prefix;

INSERT INTO public.rule_area_detalles (rule_id, area, detalle_code) VALUES
('r6', 'AREA SECA', '167/X2'),
('r6', 'AREA HUMEDA', '008/4T2')
ON CONFLICT (rule_id, area) DO UPDATE SET detalle_code = EXCLUDED.detalle_code;

INSERT INTO public.rule_items (id, rule_id, order_index, descripcion, unit, material, base_qty, formula) VALUES
('r6-s1', 'r6', 1, 'SOLDADURA T 4/0 -2/0', 'und', 'P', '1', 'count'),
('r6-s2', 'r6', 2, 'CARGA 90', 'und', 'C', '1', 'count * 1'),
('r6-s3', 'r6', 3, 'MOLDE TAC2Q2G', 'und', 'C', '0.0167', 'count * 0.0167')
ON CONFLICT (id) DO NOTHING;

-- Rule r8: BARRA POT
-- Seca: 166A | Húmeda: 010/17A
INSERT INTO public.takeoff_rules (id, section, trigger, default_detalle, tag_prefix, allowed_areas, area_detalles, allow_detalle_edit, order_index)
VALUES ('r8', 'pat', 'BARRA POT', '166A', 'BP', '{"AREA SECA","AREA HUMEDA"}', '{"AREA SECA": "166A", "AREA HUMEDA": "010/17A"}'::jsonb, TRUE, 8)
ON CONFLICT (id) DO UPDATE SET 
    trigger = EXCLUDED.trigger, 
    default_detalle = EXCLUDED.default_detalle, 
    area_detalles = EXCLUDED.area_detalles,
    tag_prefix = EXCLUDED.tag_prefix;

INSERT INTO public.rule_area_detalles (rule_id, area, detalle_code) VALUES
('r8', 'AREA SECA', '166A'),
('r8', 'AREA HUMEDA', '010/17A')
ON CONFLICT (rule_id, area) DO UPDATE SET detalle_code = EXCLUDED.detalle_code;

INSERT INTO public.rule_items (id, rule_id, order_index, descripcion, unit, material, base_qty, formula) VALUES
('r8-s1', 'r8', 1, 'BARRA POT', 'und', 'P', '1', 'count')
ON CONFLICT (id) DO NOTHING;

-- Rule r9: BARRA INST
-- Seca: 166C | Húmeda: 010/17C
INSERT INTO public.takeoff_rules (id, section, trigger, default_detalle, tag_prefix, allowed_areas, area_detalles, allow_detalle_edit, order_index)
VALUES ('r9', 'pat', 'BARRA INST', '166C', 'BI', '{"AREA SECA","AREA HUMEDA"}', '{"AREA SECA": "166C", "AREA HUMEDA": "010/17C"}'::jsonb, TRUE, 9)
ON CONFLICT (id) DO UPDATE SET 
    trigger = EXCLUDED.trigger, 
    default_detalle = EXCLUDED.default_detalle, 
    area_detalles = EXCLUDED.area_detalles,
    tag_prefix = EXCLUDED.tag_prefix;

INSERT INTO public.rule_area_detalles (rule_id, area, detalle_code) VALUES
('r9', 'AREA SECA', '166C'),
('r9', 'AREA HUMEDA', '010/17C')
ON CONFLICT (rule_id, area) DO UPDATE SET detalle_code = EXCLUDED.detalle_code;

INSERT INTO public.rule_items (id, rule_id, order_index, descripcion, unit, material, base_qty, formula) VALUES
('r9-s1', 'r9', 1, 'BARRA INST', 'und', 'P', '1', 'count'),
('r9-s2', 'r9', 2, 'AISLADOR DE RESINA TIPO BARRIL', 'und', 'C', '1', 'count * 1')
ON CONFLICT (id) DO NOTHING;

-- Rule r-001-2b-x1-can: DET.001/2B-X1 (Universal rule with width dimension parameter)
INSERT INTO public.takeoff_rules (id, section, trigger, default_detalle, tag_prefix, allowed_areas, area_detalles, allow_detalle_edit, has_dimension_param, dimension_param_name, order_index)
VALUES ('r-001-2b-x1-can', 'canalizado', 'DET.001/2B-X1', '001/2B-X1', 'SE', '{"AREA SECA","AREA HUMEDA"}', '{"AREA SECA": "001/2B-X1", "AREA HUMEDA": "001/2B-X1"}'::jsonb, TRUE, TRUE, 'Ancho Bandeja', 10)
ON CONFLICT (id) DO UPDATE SET 
    trigger = EXCLUDED.trigger, 
    default_detalle = EXCLUDED.default_detalle, 
    area_detalles = EXCLUDED.area_detalles,
    tag_prefix = EXCLUDED.tag_prefix,
    has_dimension_param = TRUE,
    dimension_param_name = 'Ancho Bandeja';

INSERT INTO public.rule_area_detalles (rule_id, area, detalle_code) VALUES
('r-001-2b-x1-can', 'AREA SECA', '001/2B-X1'),
('r-001-2b-x1-can', 'AREA HUMEDA', '001/2B-X1')
ON CONFLICT (rule_id, area) DO UPDATE SET detalle_code = EXCLUDED.detalle_code;

INSERT INTO public.rule_items (id, rule_id, order_index, descripcion, unit, material, base_qty, formula) VALUES
('can-s1', 'r-001-2b-x1-can', 1, 'RIEL PREFORMADO STRUT 41X41 MM, ACERO INOXIDABLE 316', 'm', 'C', '0.76', 'width_multiplier * count'),
('can-s2', 'r-001-2b-x1-can', 2, 'TUERCA CON RESORTE 1/2",  ACERO INOXIDABLE 316', 'und', 'C', '2', 'count * 2'),
('can-s3', 'r-001-2b-x1-can', 3, 'MORDAZA DE FIJACION ESCALERILLA, 3/8" X 2 1/4", ACERO INOXIDABLE 316', 'und', 'C', '2', 'count * 2'),
('can-s4', 'r-001-2b-x1-can', 4, 'PERNO MAQUINADO,  1/2" Ø X 1" CABEZA REDONDA 13 UNC Y DOS ARANDELAS (PLANA Y PRESION), ACERO INOXIDABLE 316', 'und', 'C', '2', 'count * 2')
ON CONFLICT (id) DO NOTHING;

-- Parameter options for Cable Tray Widths (900mm: 1.20m, 600mm: 0.76m, 450mm: 0.61m, 300mm: 0.46m)
INSERT INTO public.rule_parameter_options (id, rule_id, param_key, option_label, option_value, multiplier_map) VALUES
('can-opt-900', 'r-001-2b-x1-can', 'width', '900 mm', '900', '{"can-s1": 1.20}'::jsonb),
('can-opt-600', 'r-001-2b-x1-can', 'width', '600 mm', '600', '{"can-s1": 0.76}'::jsonb),
('can-opt-450', 'r-001-2b-x1-can', 'width', '450 mm', '450', '{"can-s1": 0.61}'::jsonb),
('can-opt-300', 'r-001-2b-x1-can', 'width', '300 mm', '300', '{"can-s1": 0.46}'::jsonb)
ON CONFLICT (id) DO NOTHING;
