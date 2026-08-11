-- ============================================================
-- ESQUEMA DE BASE DE DATOS - Control de Procesos de Calidad Alco S.A.S.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query
-- Es idempotente (CREATE TABLE IF NOT EXISTS): se puede volver a correr sin romper nada.
-- ============================================================

-- Documentos PDF cargados al motor RAG por proceso (src/lib/customRagStore.ts)
CREATE TABLE IF NOT EXISTS rag_custom_documents (
  id VARCHAR(100) PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  file_size INT,
  process_slug VARCHAR(100) DEFAULT 'general',
  title VARCHAR(255) NOT NULL,
  code VARCHAR(100),
  extracted_text TEXT,
  page_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rag_custom_documents_process_slug ON rag_custom_documents(process_slug);

-- RLS: el backend usa SUPABASE_SERVICE_ROLE_KEY, que ignora RLS.
-- Se habilita sin policies para bloquear acceso directo desde el navegador con la anon key.
ALTER TABLE rag_custom_documents ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- NOTA: si tu proyecto de Supabase ya tenía las tablas whatsapp_* de una
-- version anterior de la app (whatsapp_webhook_events, whatsapp_contacts,
-- whatsapp_conversations, whatsapp_messages, whatsapp_appointments), ya
-- no las usa el código. Puedes borrarlas manualmente si quieres limpiar
-- tu base de datos, no es obligatorio:
--
-- DROP TABLE IF EXISTS whatsapp_webhook_events;
-- DROP TABLE IF EXISTS whatsapp_messages;
-- DROP TABLE IF EXISTS whatsapp_appointments;
-- DROP TABLE IF EXISTS whatsapp_conversations;
-- DROP TABLE IF EXISTS whatsapp_contacts;
-- ============================================================
