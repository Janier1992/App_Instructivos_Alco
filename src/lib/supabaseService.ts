import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  try {
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
    return supabaseInstance;
  } catch (err) {
    console.error('Error inicializando Supabase Client:', err);
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

// SQL DDL Helper para generar la tabla en Supabase
export const SUPABASE_SQL_SCHEMA = `-- ESQUEMA DE BASE DE DATOS EN SUPABASE PARA CALIDAD ALCO S.A.S.

-- Extensión de Postgres para búsqueda semántica (embeddings) de los PDFs cargados
CREATE EXTENSION IF NOT EXISTS vector;

-- Documentos PDF cargados al motor RAG
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
ALTER TABLE rag_custom_documents ENABLE ROW LEVEL SECURITY;

-- Fragmentos (chunks) de cada PDF con su embedding, para búsqueda semántica real
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

-- Búsqueda por similitud coseno de los fragmentos más relevantes para una pregunta
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
-- documento — permite visualizarlo embebido dentro de la app.
INSERT INTO storage.buckets (id, name, public)
VALUES ('rag-pdfs', 'rag-pdfs', false)
ON CONFLICT (id) DO NOTHING;
`;
