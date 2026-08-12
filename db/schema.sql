-- ============================================================
-- ESQUEMA DE BASE DE DATOS - Control de Procesos de Calidad Alco S.A.S.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query
-- Es idempotente: se puede volver a correr sin romper nada.
-- ============================================================

-- Extensión de Postgres para búsqueda semántica (embeddings) de los PDFs cargados
CREATE EXTENSION IF NOT EXISTS vector;

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

ALTER TABLE rag_custom_documents ADD COLUMN IF NOT EXISTS chunk_count INT DEFAULT 1;
ALTER TABLE rag_custom_documents ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE rag_custom_documents ADD COLUMN IF NOT EXISTS storage_path VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_rag_custom_documents_process_slug ON rag_custom_documents(process_slug);

-- RLS: el backend usa SUPABASE_SERVICE_ROLE_KEY, que ignora RLS.
-- Se habilita sin policies para bloquear acceso directo desde el navegador con la anon key.
ALTER TABLE rag_custom_documents ENABLE ROW LEVEL SECURITY;

-- Fragmentos (chunks) de cada PDF con su embedding, para búsqueda semántica real
-- en vez de volcar el documento completo en cada consulta.
CREATE TABLE IF NOT EXISTS rag_document_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id VARCHAR(100) REFERENCES rag_custom_documents(id) ON DELETE CASCADE,
  process_slug VARCHAR(100) NOT NULL,
  document_title VARCHAR(255) NOT NULL,
  document_code VARCHAR(100),
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(768),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_process_slug ON rag_document_chunks(process_slug);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding ON rag_document_chunks USING hnsw (embedding vector_cosine_ops);
ALTER TABLE rag_document_chunks ENABLE ROW LEVEL SECURITY;

-- Búsqueda por similitud coseno: retorna los fragmentos más relevantes de un
-- proceso (más los marcados como "general") para el embedding de una pregunta.
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding VECTOR(768),
  target_process_slug VARCHAR,
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (document_title VARCHAR, document_code VARCHAR, content TEXT, similarity FLOAT)
LANGUAGE sql STABLE AS $$
  SELECT document_title, document_code, content,
         1 - (embedding <=> query_embedding) AS similarity
  FROM rag_document_chunks
  WHERE (process_slug = target_process_slug OR process_slug = 'general')
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Bucket privado de Storage para guardar el archivo PDF original de cada
-- documento — permite visualizarlo embebido dentro de la app (no solo el
-- texto extraído, que es ilegible para una persona). El backend siempre usa
-- SUPABASE_SERVICE_ROLE_KEY, así que no necesita policies públicas.
INSERT INTO storage.buckets (id, name, public)
VALUES ('rag-pdfs', 'rag-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Nombre real del colaborador de planta asignado a cada nivel de autonomía
-- de cada proceso (ej. "Nivel 2 de Corte y Perfilería" -> "Juan Pérez"), para
-- que la Matriz de Autonomía y el agente de IA citen a la persona real, no
-- solo el rol genérico. Se llena desde la propia interfaz, nunca se inventa.
CREATE TABLE IF NOT EXISTS autonomy_role_assignments (
  process_slug VARCHAR(100) NOT NULL,
  level VARCHAR(20) NOT NULL,
  collaborator_name VARCHAR(255) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (process_slug, level)
);
ALTER TABLE autonomy_role_assignments ENABLE ROW LEVEL SECURITY;

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
