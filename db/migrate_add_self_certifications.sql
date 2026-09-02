-- ============================================================
-- Autocertificación por unidad: el propio colaborador certifica, con su
-- nombre y contra los criterios reales del proceso, que la pieza que acaba
-- de producir cumple — antes de que Calidad la revise. Solo queda exenta de
-- revisión obligatoria de Calidad si el colaborador está verificado en
-- nivel U u O (marco ILUO, ver collaborator_competencies); si no está
-- verificado o algún criterio no cumple, queda marcada para revisión.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query. Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS self_certifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  process_slug VARCHAR(100) NOT NULL,
  order_reference VARCHAR(255) NOT NULL,
  collaborator_name VARCHAR(255) NOT NULL,
  competency_level VARCHAR(4),
  results JSONB NOT NULL,
  all_passed BOOLEAN NOT NULL DEFAULT TRUE,
  requires_quality_review BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  quality_reviewed_at TIMESTAMPTZ,
  quality_reviewed_by UUID,
  quality_review_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_self_certifications_process_slug ON self_certifications(process_slug);
CREATE INDEX IF NOT EXISTS idx_self_certifications_requires_review ON self_certifications(requires_quality_review);
CREATE INDEX IF NOT EXISTS idx_self_certifications_created_at ON self_certifications(created_at);
ALTER TABLE self_certifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_users')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints
       WHERE constraint_name = 'self_certifications_quality_reviewed_by_fkey'
     ) THEN
    ALTER TABLE self_certifications
      ADD CONSTRAINT self_certifications_quality_reviewed_by_fkey
      FOREIGN KEY (quality_reviewed_by) REFERENCES admin_users(id) ON DELETE SET NULL;
  END IF;
END $$;
