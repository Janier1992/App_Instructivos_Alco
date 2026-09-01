-- ============================================================
-- Módulo "Control Calidad": formularios de inspección embebidos
-- (Microsoft Forms) y tablero de tareas del equipo de Calidad.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query. Idempotente.
-- ============================================================

-- Formularios de inspección — el enlace guardado debe ser el de "Insertar
-- código" (embed) de Microsoft Forms, no el enlace normal de compartir: es
-- el único pensado por Microsoft para abrirse dentro de un iframe. Se
-- gestionan desde el CRM (/crm/formularios), igual que Documentos y Videos.
CREATE TABLE IF NOT EXISTS inspection_forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  process_slug VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  embed_url TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inspection_forms_process_slug ON inspection_forms(process_slug);
ALTER TABLE inspection_forms ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_users')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints
       WHERE constraint_name = 'inspection_forms_created_by_fkey'
     ) THEN
    ALTER TABLE inspection_forms
      ADD CONSTRAINT inspection_forms_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Tablero de tareas (Kanban) del equipo de Calidad — se gestiona
-- directamente desde la tarjeta pública de Control Calidad, sin necesidad
-- de pasar por el CRM: es la herramienta operativa de uso diario del área.
CREATE TABLE IF NOT EXISTS quality_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  process_slug VARCHAR(100) NOT NULL DEFAULT 'control-calidad',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assignee VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_progreso', 'hecha')),
  due_date DATE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quality_tasks_process_slug ON quality_tasks(process_slug);
CREATE INDEX IF NOT EXISTS idx_quality_tasks_status ON quality_tasks(status);
ALTER TABLE quality_tasks ENABLE ROW LEVEL SECURITY;
