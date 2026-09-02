-- ============================================================
-- Base de Conocimiento: módulo separado del sistema de Documentos actual.
-- Convierte cada PDF subido a Markdown (texto normal + transcripción por
-- visión de Gemini en las páginas con poco texto — diagramas, cortes de
-- sección) antes de indexarlo, para no perder datos que la extracción de
-- texto plana de un PDF pierde en tablas y planos técnicos. Calidad revisa
-- y edita el Markdown antes de publicarlo; solo entonces se fragmenta y
-- se embebe para que el Agente de IA lo use.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query. Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  process_slug VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  file_name VARCHAR(255),
  file_size INT,
  storage_path VARCHAR(255),
  markdown_content TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  page_count INT,
  vision_pages_used INT DEFAULT 0,
  chunk_count INT DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_process_slug ON knowledge_documents(process_slug);
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_users')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints
       WHERE constraint_name = 'knowledge_documents_created_by_fkey'
     ) THEN
    ALTER TABLE knowledge_documents
      ADD CONSTRAINT knowledge_documents_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Bucket privado para el PDF original de cada documento (se conserva como
-- referencia; el Agente de IA nunca lee el PDF directo, solo el Markdown).
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-base-source', 'knowledge-base-source', false)
ON CONFLICT (id) DO NOTHING;

-- Fragmentos con embedding del Markdown ya publicado — misma mecánica de
-- búsqueda por similitud que rag_document_chunks, pero en una tabla propia
-- para mantener este módulo separado del sistema de Documentos actual.
CREATE TABLE IF NOT EXISTS knowledge_document_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  process_slug VARCHAR(100) NOT NULL,
  document_title VARCHAR(255) NOT NULL,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(768),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_process_slug ON knowledge_document_chunks(process_slug);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding ON knowledge_document_chunks USING hnsw (embedding vector_cosine_ops);
ALTER TABLE knowledge_document_chunks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding VECTOR(768),
  target_process_slug VARCHAR,
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (document_title VARCHAR, content TEXT, similarity FLOAT)
LANGUAGE sql STABLE AS $$
  SELECT document_title, content,
         1 - (embedding <=> query_embedding) AS similarity
  FROM knowledge_document_chunks
  WHERE process_slug = target_process_slug
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
