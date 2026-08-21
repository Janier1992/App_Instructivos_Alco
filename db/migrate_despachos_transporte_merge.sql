-- ============================================================
-- MIGRACIÓN: unificar los procesos "Despachos" y "Transporte" en uno solo
-- ("Despachos-Transporte", slug despachos-transporte).
-- Ejecutar UNA VEZ en: Supabase Dashboard > SQL Editor > New Query
--
-- El código ya no reconoce los slugs "despachos" ni "transporte" por
-- separado (PROCESSES ahora solo tiene "despachos-transporte") — sin este
-- paso, cualquier documento/video/circular/asignación de autonomía que
-- haya quedado etiquetado con el slug viejo deja de ser visible en la app,
-- porque ningún proceso existente coincide con ese slug.
-- ============================================================

-- 1) Vista previa: qué filas se van a mover (revisa antes de aplicar el UPDATE).
SELECT 'rag_custom_documents' AS tabla, id, title, process_slug FROM rag_custom_documents WHERE process_slug IN ('despachos', 'transporte')
UNION ALL
SELECT 'rag_document_chunks', id::text, document_title, process_slug FROM rag_document_chunks WHERE process_slug IN ('despachos', 'transporte')
UNION ALL
SELECT 'process_videos', id::text, title, process_slug FROM process_videos WHERE process_slug IN ('despachos', 'transporte')
UNION ALL
SELECT 'autonomy_role_assignments', level, collaborator_name, process_slug FROM autonomy_role_assignments WHERE process_slug IN ('despachos', 'transporte');

-- 2) Migración real.
UPDATE rag_custom_documents SET process_slug = 'despachos-transporte' WHERE process_slug IN ('despachos', 'transporte');
UPDATE rag_document_chunks SET process_slug = 'despachos-transporte' WHERE process_slug IN ('despachos', 'transporte');
UPDATE process_videos SET process_slug = 'despachos-transporte' WHERE process_slug IN ('despachos', 'transporte');

-- autonomy_role_assignments tiene PRIMARY KEY (process_slug, level): si ya
-- existiera una asignación para el mismo nivel en ambos procesos viejos, no
-- se puede tener dos filas con la misma llave tras el UPDATE — se descartan
-- los duplicados quedándose con el registro más reciente antes de mover.
DELETE FROM autonomy_role_assignments a
WHERE a.process_slug IN ('despachos', 'transporte')
  AND EXISTS (
    SELECT 1 FROM autonomy_role_assignments b
    WHERE b.process_slug IN ('despachos', 'transporte')
      AND b.level = a.level
      AND b.updated_at > a.updated_at
  );
UPDATE autonomy_role_assignments SET process_slug = 'despachos-transporte' WHERE process_slug IN ('despachos', 'transporte');

-- circulares usa un arreglo (process_slugs TEXT[]): se reemplazan los slugs
-- viejos por el nuevo, evitando duplicarlo si por algún motivo una circular
-- ya tenía ambos slugs a la vez.
UPDATE circulares
SET process_slugs = (
  SELECT ARRAY(
    SELECT DISTINCT CASE WHEN s IN ('despachos', 'transporte') THEN 'despachos-transporte' ELSE s END
    FROM unnest(process_slugs) AS s
  )
)
WHERE process_slugs && ARRAY['despachos', 'transporte'];

-- 3) Verificación: no debería devolver ninguna fila.
SELECT 'rag_custom_documents' AS tabla, id FROM rag_custom_documents WHERE process_slug IN ('despachos', 'transporte')
UNION ALL
SELECT 'rag_document_chunks', id::text FROM rag_document_chunks WHERE process_slug IN ('despachos', 'transporte')
UNION ALL
SELECT 'process_videos', id::text FROM process_videos WHERE process_slug IN ('despachos', 'transporte')
UNION ALL
SELECT 'autonomy_role_assignments', level FROM autonomy_role_assignments WHERE process_slug IN ('despachos', 'transporte');
