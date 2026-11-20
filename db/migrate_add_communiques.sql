-- ============================================================
-- Control Calidad — Comunicados y Procedimientos: comunicados internos de
-- Calidad Producción (formato "COMUNICADO CALIDAD PRODUCCIÓN") dirigidos a
-- las áreas por implementaciones, mejoras de diseño o integración de
-- nuevos productos. El colaborador describe el cambio y adjunta imágenes y
-- documentos de referencia (por ejemplo una ficha técnica); Gemini redacta
-- el texto y el documento se exporta a Word y PDF con la plantilla oficial.
-- Las imágenes se guardan en el bucket 'supplier-claim-photos' (ya creado por
-- migrate_add_supplier_claims.sql). Los documentos de referencia (ficha
-- técnica o borrador) solo se usan para generar el texto: se suben de forma
-- temporal, se borran al leerlos y no se guardan en la base de datos (la
-- columna 'documentos' ya no se usa).
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query. Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS communiques (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  process_slug VARCHAR(100) NOT NULL DEFAULT 'control-calidad',
  tipo VARCHAR(20) NOT NULL DEFAULT 'comunicado',
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  de VARCHAR(255) NOT NULL,
  para VARCHAR(255) NOT NULL,
  asunto VARCHAR(500) NOT NULL,
  contexto TEXT NOT NULL,
  intro TEXT,
  pasos JSONB NOT NULL DEFAULT '[]'::jsonb,
  cierre TEXT,
  firmantes JSONB NOT NULL DEFAULT '[]'::jsonb,
  foto_paths TEXT[] NOT NULL DEFAULT '{}',
  foto_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  documentos JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_communiques_process_slug ON communiques(process_slug);
CREATE INDEX IF NOT EXISTS idx_communiques_created_at ON communiques(created_at);
ALTER TABLE communiques ENABLE ROW LEVEL SECURITY;
