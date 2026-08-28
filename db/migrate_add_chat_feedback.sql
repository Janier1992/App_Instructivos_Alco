-- ============================================================
-- Migración: retroalimentación del colaborador sobre cada respuesta del
-- Agente de IA de Calidad (👍/👎) — cierra el ciclo entre lo que responde
-- el agente y si de verdad le sirvió a quien preguntó en planta. Calidad
-- puede revisar los 👎 (con su motivo) desde el CRM para corregir criterios
-- mal fundamentados o completar instructivos.
--
-- Ejecuta este script una sola vez en el SQL Editor de Supabase. Es seguro
-- volver a correrlo (usa IF NOT EXISTS).
-- ============================================================

CREATE TABLE IF NOT EXISTS chat_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  process_slug VARCHAR(100) NOT NULL,
  question TEXT NOT NULL,
  reply TEXT NOT NULL,
  classification VARCHAR(60),
  escalation_required BOOLEAN DEFAULT FALSE,
  rating VARCHAR(10) NOT NULL CHECK (rating IN ('up', 'down')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_process_slug ON chat_feedback(process_slug);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_rating ON chat_feedback(rating);
ALTER TABLE chat_feedback ENABLE ROW LEVEL SECURITY;
