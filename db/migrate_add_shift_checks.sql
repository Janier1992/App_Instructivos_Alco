-- ============================================================
-- Autocontrol por turno: cada proceso se audita a sí mismo antes de que
-- Calidad tenga que encontrar el problema. Ejecutar en:
-- Supabase Dashboard > SQL Editor > New Query. Es idempotente.
-- ============================================================

-- Ítems del checklist de autocontrol, definidos por Calidad por proceso
-- (2-5 ítems cortos recomendados). No se basan en datos estáticos porque
-- no todos los procesos tienen QUALITY_CONTROLS en el código — algunos
-- documentan todo vía PDF cargado al RAG.
CREATE TABLE IF NOT EXISTS shift_check_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  process_slug VARCHAR(100) NOT NULL,
  label VARCHAR(300) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shift_check_items_process_slug ON shift_check_items(process_slug);
ALTER TABLE shift_check_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_users')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints
       WHERE constraint_name = 'shift_check_items_created_by_fkey'
     ) THEN
    ALTER TABLE shift_check_items
      ADD CONSTRAINT shift_check_items_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Un registro de autocontrol por turno: el propio proceso deja constancia,
-- sin necesidad de que Calidad venga a revisar primero.
CREATE TABLE IF NOT EXISTS shift_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  process_slug VARCHAR(100) NOT NULL,
  shift VARCHAR(20) NOT NULL CHECK (shift IN ('manana', 'tarde', 'noche')),
  collaborator_name VARCHAR(255) NOT NULL,
  results JSONB NOT NULL,
  all_passed BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shift_checks_process_slug ON shift_checks(process_slug);
CREATE INDEX IF NOT EXISTS idx_shift_checks_created_at ON shift_checks(created_at);
ALTER TABLE shift_checks ENABLE ROW LEVEL SECURITY;
