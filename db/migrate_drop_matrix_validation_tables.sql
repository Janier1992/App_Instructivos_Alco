-- ============================================================
-- Limpieza: revierte la migración anterior de Validación de Ficha de
-- Matriz (db/migrate_add_matrix_validation.sql, ya ejecutada). El diseño
-- cambió: ahora es un análisis puntual sin biblioteca de fichas ni
-- registro de inspecciones — no necesita persistencia en base de datos.
-- Corre esto una sola vez si ya ejecutaste la migración anterior.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query. Idempotente.
-- ============================================================

DROP TABLE IF EXISTS matrix_inspection_measurements;
DROP TABLE IF EXISTS matrix_inspections;
DROP TABLE IF EXISTS matrix_sheet_cotas;
DROP TABLE IF EXISTS matrix_technical_sheets;

-- Bucket que quedó sin uso (la biblioteca de fichas se eliminó). El
-- nuevo bucket "matrix-analysis-temp" se usa como intermediario
-- desechable, no como archivo permanente.
DELETE FROM storage.buckets WHERE id = 'matrix-sheets-source';
DELETE FROM storage.buckets WHERE id = 'matrix-inspection-photos';
