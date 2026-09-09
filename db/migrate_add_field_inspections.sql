-- ============================================================
-- Inspecciones en Campo: módulo de Control Calidad portado desde el
-- proyecto de referencia (arquitectura equivalente, adaptado a Supabase).
-- Registro de inspecciones de calidad en planta — foto, defecto técnico,
-- estado SGC, acción correctiva — con disparo automático de No
-- Conformidad cuando el estado queda "Rechazado". Consulta pública de
-- solo lectura; crear/editar/eliminar requiere sesión del CRM.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query. Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS field_inspections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  process_slug VARCHAR(100) NOT NULL DEFAULT 'control-calidad',
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  area_proceso VARCHAR(100) NOT NULL,
  op VARCHAR(100) NOT NULL,
  plano_opc VARCHAR(50),
  diseno_referencia VARCHAR(100),
  cant_total INT NOT NULL DEFAULT 0,
  cant_retenida INT NOT NULL DEFAULT 0,
  estado VARCHAR(30) NOT NULL DEFAULT 'Aprobado',
  defecto VARCHAR(60) NOT NULL DEFAULT 'NINGUNO',
  reviso VARCHAR(255),
  responsable VARCHAR(255),
  accion_correctiva VARCHAR(30) DEFAULT 'NA',
  observacion_sugerida VARCHAR(255),
  observacion TEXT,
  photo_storage_path VARCHAR(255),
  alert_level VARCHAR(10) DEFAULT 'None' CHECK (alert_level IN ('None', 'Warning', 'Critical')),
  ai_metadata JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_field_inspections_process_slug ON field_inspections(process_slug);
CREATE INDEX IF NOT EXISTS idx_field_inspections_estado ON field_inspections(estado);
CREATE INDEX IF NOT EXISTS idx_field_inspections_created_at ON field_inspections(created_at);
ALTER TABLE field_inspections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_users')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints
       WHERE constraint_name = 'field_inspections_created_by_fkey'
     ) THEN
    ALTER TABLE field_inspections
      ADD CONSTRAINT field_inspections_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Bucket privado para las fotos de inspección (el proyecto de referencia
-- las guardaba como base64 dentro de la fila — aquí se sirven igual que
-- el resto de adjuntos de la app, con URL firmada de Storage).
INSERT INTO storage.buckets (id, name, public)
VALUES ('field-inspection-photos', 'field-inspection-photos', false)
ON CONFLICT (id) DO NOTHING;

-- No Conformidad: se crea automáticamente cuando una inspección queda en
-- estado "Rechazado" — alcance mínimo (registro + estado), no es el
-- módulo completo de "No Conformidades y CAPA" del proyecto de
-- referencia (eso no se pidió integrar). rca queda listo por si más
-- adelante se construye el flujo de 5 Porqués sobre este mismo registro.
CREATE TABLE IF NOT EXISTS non_conformities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  serial_id VARCHAR(40) NOT NULL,
  title VARCHAR(255) NOT NULL,
  process_area VARCHAR(100),
  project_reference VARCHAR(100),
  severity VARCHAR(20) NOT NULL DEFAULT 'Mayor',
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'Abierta',
  rca JSONB,
  source_field_inspection_id UUID REFERENCES field_inspections(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_non_conformities_status ON non_conformities(status);
ALTER TABLE non_conformities ENABLE ROW LEVEL SECURITY;

-- Enlaces externos embebidos (formularios/tableros externos que Calidad
-- quiere abrir dentro de la app, dentro de un iframe a pantalla completa).
CREATE TABLE IF NOT EXISTS field_inspection_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  description VARCHAR(500),
  color VARCHAR(20) DEFAULT '#003366',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE field_inspection_links ENABLE ROW LEVEL SECURITY;
