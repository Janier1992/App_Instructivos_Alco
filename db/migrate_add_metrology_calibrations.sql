-- ============================================================
-- Metrología Pro — Control Calibración: tercer y último submódulo de
-- "Metrología Pro" dentro de Control Calidad, portado desde el
-- proyecto de referencia (arquitectura equivalente, adaptado a
-- Supabase). Cronograma maestro de calibración de instrumentos de
-- medición: vigencia, próximo vencimiento y certificado adjunto
-- (PDF o imagen). A diferencia del proyecto de referencia (que
-- guardaba el certificado como base64 dentro de la fila), acá el
-- archivo va a Storage con URL firmada — mismo patrón que el resto
-- de adjuntos de la app. Consulta y registro públicos;
-- editar/eliminar requiere sesión del CRM.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query. Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS metrology_calibrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  process_slug VARCHAR(100) NOT NULL DEFAULT 'control-calidad',
  tool VARCHAR(255) NOT NULL,
  code VARCHAR(100) NOT NULL,
  last_date DATE,
  due_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'Vigente' CHECK (status IN ('Vigente', 'Vencido', 'Próximo', 'Mantenimiento')),
  certificate_number VARCHAR(100),
  certificate_storage_path VARCHAR(255),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_metrology_calibrations_process_slug ON metrology_calibrations(process_slug);
CREATE INDEX IF NOT EXISTS idx_metrology_calibrations_due_date ON metrology_calibrations(due_date);
ALTER TABLE metrology_calibrations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_users')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints
       WHERE constraint_name = 'metrology_calibrations_created_by_fkey'
     ) THEN
    ALTER TABLE metrology_calibrations
      ADD CONSTRAINT metrology_calibrations_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Bucket privado para los certificados de calibración (PDF o imagen).
INSERT INTO storage.buckets (id, name, public)
VALUES ('metrology-calibration-certificates', 'metrology-calibration-certificates', false)
ON CONFLICT (id) DO NOTHING;
