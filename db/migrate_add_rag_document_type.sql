-- ============================================================
-- Migración: categorización de documentos PDF del motor RAG.
--
-- Agrega la columna document_type a rag_custom_documents para poder
-- agrupar la "Documentación del Proceso" en carpetas por tipo (Instructivo,
-- Manual, Ficha Técnica, Ficha de Troquelado) en vez de una lista plana. La
-- categoría se asigna al subir el archivo desde el Portal de Administración
-- (/crm/documentos). Los documentos ya existentes, subidos antes de esta
-- funcionalidad, quedan clasificados como 'otro' hasta que se editen.
--
-- Ejecuta este script una sola vez en el SQL Editor de Supabase. Es seguro
-- volver a correrlo (usa IF NOT EXISTS).
-- ============================================================

ALTER TABLE rag_custom_documents
  ADD COLUMN IF NOT EXISTS document_type VARCHAR(30) NOT NULL DEFAULT 'otro';

CREATE INDEX IF NOT EXISTS idx_rag_custom_documents_document_type
  ON rag_custom_documents(document_type);
