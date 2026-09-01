-- ============================================================
-- Tarjetas de tarea estilo Trello: comentarios, adjuntos (imágenes,
-- máx. 3 MB) e historial de responsables por proceso.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query. Idempotente.
-- ============================================================

-- Comentarios de una tarea.
CREATE TABLE IF NOT EXISTS quality_task_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES quality_tasks(id) ON DELETE CASCADE,
  author_name VARCHAR(255) NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quality_task_comments_task_id ON quality_task_comments(task_id);
ALTER TABLE quality_task_comments ENABLE ROW LEVEL SECURITY;

-- Adjuntos (imágenes, máx. 3 MB) de una tarea. El archivo real vive en
-- Supabase Storage (bucket quality-task-attachments); esta tabla solo
-- guarda metadatos, igual que process_videos.
CREATE TABLE IF NOT EXISTS quality_task_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES quality_tasks(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_size INT,
  content_type VARCHAR(100),
  storage_path VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quality_task_attachments_task_id ON quality_task_attachments(task_id);
ALTER TABLE quality_task_attachments ENABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('quality-task-attachments', 'quality-task-attachments', false, 3145728)
ON CONFLICT (id) DO NOTHING;

-- Historial de responsables por proceso: cada nombre usado como
-- "Responsable" de una tarea queda guardado aquí, para que el campo se
-- autocomplete con nombres ya usados en vez de escribirlos de cero cada
-- vez (ver qualityTaskAssigneesStore.ts).
CREATE TABLE IF NOT EXISTS quality_task_assignees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  process_slug VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (process_slug, name)
);
CREATE INDEX IF NOT EXISTS idx_quality_task_assignees_process_slug ON quality_task_assignees(process_slug);
ALTER TABLE quality_task_assignees ENABLE ROW LEVEL SECURITY;
