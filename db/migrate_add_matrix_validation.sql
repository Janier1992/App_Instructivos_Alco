-- ============================================================
-- Validación de Ficha de Matriz: compara las cotas de la materia
-- prima (perfiles de aluminio) contra la ficha técnica de extrusión.
--
-- Calidad publica una biblioteca de fichas (una vez por matriz) — el
-- sistema extrae automáticamente las cotas y tolerancias de la foto
-- del plano. En planta, el inspector selecciona la ficha, fotografía
-- el perfil físico (solo para un chequeo de FORMA/identidad, nunca de
-- medida — no hay referencia de escala en esa foto) y digita o
-- fotografía la lectura real de su calibrador para cada cota. La
-- comparación numérica de conformidad siempre usa esa medición real,
-- nunca una estimación de la foto del perfil.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query. Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS matrix_technical_sheets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  process_slug VARCHAR(100) NOT NULL,
  matrix_code VARCHAR(100) NOT NULL,
  profile_name VARCHAR(255) NOT NULL,
  source_image_storage_path VARCHAR(255),
  flatness_tolerance_mm NUMERIC(6,3),
  eccentricity_tolerance_mm NUMERIC(6,3),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_matrix_sheets_process_slug ON matrix_technical_sheets(process_slug);
ALTER TABLE matrix_technical_sheets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_users')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints
       WHERE constraint_name = 'matrix_technical_sheets_created_by_fkey'
     ) THEN
    ALTER TABLE matrix_technical_sheets
      ADD CONSTRAINT matrix_technical_sheets_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Bucket privado para la foto/escaneo original de cada ficha de matriz.
INSERT INTO storage.buckets (id, name, public)
VALUES ('matrix-sheets-source', 'matrix-sheets-source', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket privado para las fotos tomadas en planta (perfil + calibrador).
INSERT INTO storage.buckets (id, name, public)
VALUES ('matrix-inspection-photos', 'matrix-inspection-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Cotas extraídas de cada ficha (editable por Calidad antes de publicar).
CREATE TABLE IF NOT EXISTS matrix_sheet_cotas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_id UUID REFERENCES matrix_technical_sheets(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  nominal_value_mm NUMERIC(8,3) NOT NULL,
  tolerance_plus_mm NUMERIC(6,3) NOT NULL DEFAULT 0,
  tolerance_minus_mm NUMERIC(6,3) NOT NULL DEFAULT 0,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_matrix_sheet_cotas_sheet_id ON matrix_sheet_cotas(sheet_id);
ALTER TABLE matrix_sheet_cotas ENABLE ROW LEVEL SECURITY;

-- Una inspección realizada en planta contra una ficha publicada.
CREATE TABLE IF NOT EXISTS matrix_inspections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_id UUID REFERENCES matrix_technical_sheets(id) ON DELETE SET NULL,
  process_slug VARCHAR(100) NOT NULL,
  matrix_code VARCHAR(100) NOT NULL,
  inspector_name VARCHAR(255) NOT NULL,
  profile_photo_storage_path VARCHAR(255),
  shape_check_result VARCHAR(20) CHECK (shape_check_result IN ('coincide', 'no_coincide', 'no_concluyente')),
  shape_check_notes TEXT,
  overall_result VARCHAR(20) NOT NULL CHECK (overall_result IN ('conforme', 'no_conforme')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_matrix_inspections_process_slug ON matrix_inspections(process_slug);
CREATE INDEX IF NOT EXISTS idx_matrix_inspections_sheet_id ON matrix_inspections(sheet_id);
ALTER TABLE matrix_inspections ENABLE ROW LEVEL SECURITY;

-- Medición real (calibrador) por cota, dentro de una inspección. Los
-- valores de la cota se copian aquí al momento de inspeccionar (no se
-- referencian en vivo) para que un registro histórico no cambie si
-- luego Calidad edita la ficha.
CREATE TABLE IF NOT EXISTS matrix_inspection_measurements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID REFERENCES matrix_inspections(id) ON DELETE CASCADE,
  cota_id UUID REFERENCES matrix_sheet_cotas(id) ON DELETE SET NULL,
  cota_label VARCHAR(255) NOT NULL,
  nominal_value_mm NUMERIC(8,3) NOT NULL,
  tolerance_plus_mm NUMERIC(6,3) NOT NULL DEFAULT 0,
  tolerance_minus_mm NUMERIC(6,3) NOT NULL DEFAULT 0,
  measured_value_mm NUMERIC(8,3) NOT NULL,
  deviation_mm NUMERIC(8,3) NOT NULL,
  within_tolerance BOOLEAN NOT NULL,
  measurement_photo_storage_path VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_matrix_measurements_inspection_id ON matrix_inspection_measurements(inspection_id);
ALTER TABLE matrix_inspection_measurements ENABLE ROW LEVEL SECURITY;
