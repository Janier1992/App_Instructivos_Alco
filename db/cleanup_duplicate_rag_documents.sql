-- ============================================================
-- LIMPIEZA DE DOCUMENTOS RAG DUPLICADOS
-- Ejecutar una sola vez en: Supabase Dashboard > SQL Editor > New Query
--
-- Causa: antes de este fix, un doble clic o un reintento de red al subir un
-- PDF (frecuente en celular con conexión lenta) podía disparar dos subidas
-- del mismo archivo. Cada una generaba un id distinto, así que no violaban
-- ninguna restricción y quedaban como filas duplicadas en
-- rag_custom_documents (y sus fragmentos en rag_document_chunks).
--
-- Esta consulta conserva, por cada combinación (process_slug, file_name), la
-- fila más reciente y borra el resto. Los fragmentos de las filas borradas
-- se eliminan solos por el ON DELETE CASCADE ya definido en el esquema.
-- ============================================================

-- 1) Vista previa: cuántas filas duplicadas hay antes de borrar nada.
SELECT process_slug, file_name, COUNT(*) AS copias
FROM rag_custom_documents
GROUP BY process_slug, file_name
HAVING COUNT(*) > 1
ORDER BY copias DESC;

-- 2) Borrado real de duplicados (deja solo la copia más reciente de cada uno).
DELETE FROM rag_custom_documents
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY process_slug, file_name
             ORDER BY created_at DESC
           ) AS rn
    FROM rag_custom_documents
  ) ranked
  WHERE rn > 1
);

-- 3) Verificación: no debería devolver ninguna fila.
SELECT process_slug, file_name, COUNT(*) AS copias
FROM rag_custom_documents
GROUP BY process_slug, file_name
HAVING COUNT(*) > 1;
