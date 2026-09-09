-- ============================================================
-- Metrología Pro — Reposición y Baja: segundo submódulo de
-- "Metrología Pro" dentro de Control Calidad, portado desde el
-- proyecto de referencia (arquitectura equivalente, adaptado a
-- Supabase). Registro del ciclo de vida (baja/reposición) de un
-- equipo de medición, con firma del responsable del área y del
-- responsable de Calidad. Consulta y registro públicos;
-- editar/eliminar requiere sesión del CRM.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query. Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS metrology_replacements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  process_slug VARCHAR(100) NOT NULL DEFAULT 'control-calidad',
  fecha_registro DATE NOT NULL DEFAULT CURRENT_DATE,
  nombre_equipo VARCHAR(255) NOT NULL,
  marca VARCHAR(100),
  codigo VARCHAR(100) NOT NULL,
  area_uso VARCHAR(100) NOT NULL,
  nombre_responsable VARCHAR(255) NOT NULL,
  motivo_reposicion TEXT NOT NULL,
  devuelve_equipo_anterior VARCHAR(5),
  descripcion_baja TEXT,
  se_cobra_equipo VARCHAR(5),
  nombre_responsable_calidad VARCHAR(255),
  firma_responsable_area TEXT,
  firma_responsable_calidad TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_metrology_replacements_process_slug ON metrology_replacements(process_slug);
CREATE INDEX IF NOT EXISTS idx_metrology_replacements_created_at ON metrology_replacements(created_at);
ALTER TABLE metrology_replacements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_users')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints
       WHERE constraint_name = 'metrology_replacements_created_by_fkey'
     ) THEN
    ALTER TABLE metrology_replacements
      ADD CONSTRAINT metrology_replacements_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL;
  END IF;
END $$;
