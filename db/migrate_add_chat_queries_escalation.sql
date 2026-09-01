-- ============================================================
-- Migración: agrega si la consulta terminó en escalamiento a Calidad a la
-- bitácora de preguntas del chat (chat_queries) — es lo que alimenta el
-- semáforo público de salud de cada proceso ("andon" digital): 🟢 el
-- proceso resuelve solo casi siempre / 🟡 escala algo / 🔴 escala mucho.
--
-- Ejecuta este script una sola vez en el SQL Editor de Supabase. Es seguro
-- volver a correrlo (usa IF NOT EXISTS).
-- ============================================================

ALTER TABLE chat_queries
  ADD COLUMN IF NOT EXISTS escalation_required BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_chat_queries_created_at ON chat_queries(created_at);
