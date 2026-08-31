-- ============================================================
-- Migración: bitácora liviana de preguntas hechas al Agente de IA por
-- proceso — se usa para mostrar como "sugerencias" rápidas del chat las
-- preguntas que de verdad hace la gente en planta/instalación en cada
-- proceso, en vez de las mismas 3 sugerencias fijas para los 8 procesos.
-- Solo texto (sin PDFs, sin binarios): impacto de almacenamiento mínimo.
--
-- Ejecuta este script una sola vez en el SQL Editor de Supabase. Es seguro
-- volver a correrlo (usa IF NOT EXISTS).
-- ============================================================

CREATE TABLE IF NOT EXISTS chat_queries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  process_slug VARCHAR(100) NOT NULL,
  question TEXT NOT NULL,
  question_normalized VARCHAR(300) NOT NULL,
  classification VARCHAR(60),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_queries_process_slug ON chat_queries(process_slug);
CREATE INDEX IF NOT EXISTS idx_chat_queries_process_normalized ON chat_queries(process_slug, question_normalized);
ALTER TABLE chat_queries ENABLE ROW LEVEL SECURITY;
