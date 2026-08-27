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
-- Categoría asignada al subir el documento (instructivo, manual, ficha_tecnica,
-- ficha_troquelado, otro) — agrupa la Documentación del Proceso en carpetas.
ALTER TABLE rag_custom_documents ADD COLUMN IF NOT EXISTS document_type VARCHAR(30) NOT NULL DEFAULT 'otro';

CREATE INDEX IF NOT EXISTS idx_rag_custom_documents_process_slug ON rag_custom_documents(process_slug);
CREATE INDEX IF NOT EXISTS idx_rag_custom_documents_document_type ON rag_custom_documents(document_type);

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

-- Búsqueda por similitud coseno: retorna los fragmentos más relevantes,
-- aislados estrictamente al proceso indicado (sin fallback a documentos
-- "general" de otros procesos — cada agente solo debe ver lo que se cargó
-- específicamente en su propio módulo).
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
  WHERE process_slug = target_process_slug
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

-- Enlaces a videos explicativos por proceso (ej. grabaciones de OneDrive
-- mostrando cómo se ejecuta una operación) — se ven embebidos dentro de la
-- app, en la pestaña "Documentos" de cada proceso, debajo de los PDF.
CREATE TABLE IF NOT EXISTS process_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  process_slug VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  video_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_process_videos_process_slug ON process_videos(process_slug);
ALTER TABLE process_videos ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PORTAL DE ADMINISTRACIÓN / CRM RESTRINGIDO
-- Toda operación administrativa (subir/eliminar documentos, videos,
-- circulares, asignar autonomía) se valida en backend contra estas tablas
-- (ver middleware.ts + src/lib/adminAuth.ts) — nunca solo ocultando UI.
-- ============================================================

-- Usuarios del CRM. Contraseñas siempre con hash bcrypt, nunca en texto
-- plano. El primer usuario se crea con scripts/seed-admin-user.mjs (no hay
-- endpoint público de registro); los siguientes se crean desde el propio CRM.
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('administrador','editor')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Si tu proyecto de Supabase ya existía antes de que las llaves foráneas de
-- abajo (circulares.created_by, admin_audit_log.admin_user_id,
-- circular_comments.reviewed_by) tuvieran ON DELETE SET NULL, corre además
-- db/migrate_admin_users_delete_fk.sql — si no, eliminar un usuario del CRM
-- con historial (auditoría, publicaciones, comentarios revisados) falla.

-- Circulares informativas: texto y/o adjunto, asociadas a uno o varios
-- procesos (arreglo vacío = aplica a todas las áreas). La app pública solo
-- debe mostrar las que tengan status = 'published'.
CREATE TABLE IF NOT EXISTS circulares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body_text TEXT,
  attachment_storage_path VARCHAR(255),
  attachment_file_name VARCHAR(255),
  process_slugs TEXT[] NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_circulares_status ON circulares(status);
ALTER TABLE circulares ENABLE ROW LEVEL SECURITY;

-- Módulo "Principal" (pestaña por defecto de cada proceso): reutiliza esta
-- misma tabla — mismo dato, presentación nueva (carrusel con imagen
-- protagonista y orden de visualización).
ALTER TABLE circulares ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0;
ALTER TABLE circulares ADD COLUMN IF NOT EXISTS attachment_content_type VARCHAR(100);

-- Enlace embebible (Power BI "Publicar en la Web", YouTube, u otra
-- plataforma que permita iframe): si está presente, la pestaña Principal lo
-- muestra embebido e interactivo en vez de la imagen. Los enlaces de
-- YouTube se normalizan igual que en process_videos (normalizeVideoEmbedUrl).
ALTER TABLE circulares ADD COLUMN IF NOT EXISTS embed_url TEXT;

-- Adjuntos de circulares (PDF/imagen), bucket privado igual que rag-pdfs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('circular-attachments', 'circular-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Auditoría de toda operación administrativa (crear/editar/publicar/
-- despublicar/eliminar/login) ejecutada desde el CRM.
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  admin_email VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON admin_audit_log(created_at DESC);
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- NOTIFICACIONES PUSH Y COMENTARIOS EN PRINCIPAL
-- ============================================================

-- Suscripciones a notificaciones push por proceso, sin cuenta de usuario:
-- el navegador mantiene una sola suscripción por origen; suscribirse a
-- varios procesos desde el mismo dispositivo guarda esa misma suscripción
-- varias veces, una fila por proceso.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  process_slug VARCHAR(100) NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (process_slug, endpoint)
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_process_slug ON push_subscriptions(process_slug);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Comentarios de gestión sobre una publicación de Principal. Como la app
-- pública no tiene cuentas, cualquiera puede comentar dando su nombre, pero
-- el comentario nace oculto ('pending') hasta que un Administrador lo
-- aprueba desde el CRM.
CREATE TABLE IF NOT EXISTS circular_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  circular_id UUID REFERENCES circulares(id) ON DELETE CASCADE,
  author_name VARCHAR(255) NOT NULL,
  comment_text TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_circular_comments_circular_id ON circular_comments(circular_id);
CREATE INDEX IF NOT EXISTS idx_circular_comments_status ON circular_comments(status);
ALTER TABLE circular_comments ENABLE ROW LEVEL SECURITY;

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
