-- ============================================================
-- Arquitectura de procesos: cerrar el ciclo, causa raíz y
-- competencia verificada del equipo (ILUO).
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query.
-- Es idempotente: se puede volver a correr sin romper nada.
-- ============================================================

-- 1) Causa raíz de una respuesta del Agente de IA que escaló o que el
-- colaborador calificó como no útil — para que Calidad sepa si el problema
-- de fondo es falta de criterio documentado, falta de capacitación,
-- material no conforme, etc., y no solo "cuántas veces pasó".
ALTER TABLE chat_feedback ADD COLUMN IF NOT EXISTS root_cause VARCHAR(40);

-- 2) Cerrar el ciclo real: cuando Calidad resuelve una pregunta que escaló
-- porque no había criterio documentado, puede convertir esa resolución en
-- un criterio nuevo — visible de inmediato en la Documentación del Proceso
-- y citado por el propio Agente de IA, sin esperar la próxima actualización
-- del PDF oficial.
CREATE TABLE IF NOT EXISTS dynamic_criteria (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  process_slug VARCHAR(100) NOT NULL,
  parameter VARCHAR(255) NOT NULL,
  acceptance TEXT NOT NULL,
  rejection TEXT NOT NULL,
  required_action TEXT NOT NULL,
  source_question TEXT,
  source_feedback_id UUID,
  -- Sin REFERENCES admin_users aquí a propósito: se agrega abajo solo si esa
  -- tabla existe, para que este script nunca falle por eso al correrse solo.
  created_by UUID,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dynamic_criteria_process_slug ON dynamic_criteria(process_slug);
CREATE INDEX IF NOT EXISTS idx_dynamic_criteria_active ON dynamic_criteria(active);
ALTER TABLE dynamic_criteria ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_users')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints
       WHERE constraint_name = 'dynamic_criteria_created_by_fkey'
     ) THEN
    ALTER TABLE dynamic_criteria
      ADD CONSTRAINT dynamic_criteria_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3) Autonomía ligada a competencia verificada (marco ILUO, estándar en
-- plantas certificadas IATF-16949): I = en inducción (no autorizado a
-- ejecutar solo), L = en aprendizaje supervisado, U = capacitado para
-- trabajar sin supervisión, O = puede entrenar a otros. Es un registro
-- adicional al nombre asignado por nivel (autonomy_role_assignments):
-- permite llevar el roster completo del equipo de un proceso, no solo un
-- nombre por nivel.
CREATE TABLE IF NOT EXISTS collaborator_competencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  process_slug VARCHAR(100) NOT NULL,
  collaborator_name VARCHAR(255) NOT NULL,
  iluo_level VARCHAR(4) NOT NULL DEFAULT 'I' CHECK (iluo_level IN ('I','L','U','O')),
  notes TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (process_slug, collaborator_name)
);
CREATE INDEX IF NOT EXISTS idx_collaborator_competencies_process_slug ON collaborator_competencies(process_slug);
ALTER TABLE collaborator_competencies ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_users')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints
       WHERE constraint_name = 'collaborator_competencies_updated_by_fkey'
     ) THEN
    ALTER TABLE collaborator_competencies
      ADD CONSTRAINT collaborator_competencies_updated_by_fkey
      FOREIGN KEY (updated_by) REFERENCES admin_users(id) ON DELETE SET NULL;
  END IF;
END $$;
