-- ============================================================
-- Migración: permitir subir el archivo de video directo a la app (además
-- del enlace externo tipo YouTube que ya existía), guardando el binario en
-- Supabase Storage — NUNCA en una columna de la base de datos — para no
-- saturar el almacenamiento de Postgres. La tabla process_videos solo
-- guarda metadatos (ruta del archivo, nombre, tamaño).
--
-- Ejecuta este script una sola vez en el SQL Editor de Supabase. Es seguro
-- volver a correrlo (usa IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- ============================================================

ALTER TABLE process_videos
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) NOT NULL DEFAULT 'link';
ALTER TABLE process_videos
  ADD COLUMN IF NOT EXISTS storage_path VARCHAR(255);
ALTER TABLE process_videos
  ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
ALTER TABLE process_videos
  ADD COLUMN IF NOT EXISTS file_size INT;

-- video_url era NOT NULL porque antes todo video era un enlace externo;
-- un video subido como archivo no tiene enlace, solo storage_path.
ALTER TABLE process_videos ALTER COLUMN video_url DROP NOT NULL;

-- Bucket privado para los archivos de video subidos — el acceso siempre
-- pasa por /api/videos/[id]/file, que genera una URL firmada de corta
-- duración en vez de exponer el bucket públicamente.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('process-videos', 'process-videos', false, 104857600) -- 100 MB
ON CONFLICT (id) DO UPDATE SET file_size_limit = 104857600;
