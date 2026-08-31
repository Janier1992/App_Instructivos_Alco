-- ============================================================
-- Migración: buzón de mejora digital ("Kaizen") por proceso — cualquier
-- colaborador puede proponer una mejora a un criterio o al proceso en
-- general, directo desde la app. Calidad la revisa desde el CRM y le
-- cambia el estado (propuesta → en revisión → implementada/rechazada).
--
-- Ejecuta este script una sola vez en el SQL Editor de Supabase. Es seguro
-- volver a correrlo (usa IF NOT EXISTS).
-- ============================================================

CREATE TABLE IF NOT EXISTS process_improvements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  process_slug VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  related_criterion VARCHAR(255),
  author_name VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'in_review', 'implemented', 'rejected')),
  admin_note TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_process_improvements_process_slug ON process_improvements(process_slug);
CREATE INDEX IF NOT EXISTS idx_process_improvements_status ON process_improvements(status);
ALTER TABLE process_improvements ENABLE ROW LEVEL SECURITY;
