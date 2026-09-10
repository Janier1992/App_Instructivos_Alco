-- ============================================================
-- Inspecciones en Campo: cant_total y cant_retenida pasan de INT a
-- NUMERIC(10,3). Las áreas de Vidrio Crudo y Vidrio Templado registran
-- cantidades en metros cuadrados con decimales (ej. 1.056) — la columna
-- entera las rechazaba con "invalid input syntax for type integer" al
-- intentar la carga masiva de datos históricos reales.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query. Idempotente.
-- ============================================================

ALTER TABLE field_inspections
  ALTER COLUMN cant_total TYPE NUMERIC(10,3),
  ALTER COLUMN cant_retenida TYPE NUMERIC(10,3);
