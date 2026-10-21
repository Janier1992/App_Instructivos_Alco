-- ============================================================
-- Reclamos a Proveedores: comentario y marcas (círculo, recuadro, flecha)
-- por foto. Se guarda como un mapa JSON { "<ruta de la foto>": {
-- "comentario": "...", "marcas": [...] } }; las marcas son vectores
-- normalizados (0 a 1), por eso la foto original no se altera y se pueden
-- editar después.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query. Idempotente.
-- ============================================================

ALTER TABLE supplier_claims ADD COLUMN IF NOT EXISTS foto_meta JSONB NOT NULL DEFAULT '{}'::jsonb;
