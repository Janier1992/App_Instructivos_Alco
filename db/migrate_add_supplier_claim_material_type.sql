-- ============================================================
-- Reclamos a Proveedores: tipo de material del informe
-- ('materia_prima', 'accesorio' o 'insumo'). Define los rótulos del
-- documento y el enfoque con el que la IA redacta el texto. Los informes
-- existentes quedan como 'materia_prima'.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query. Idempotente.
-- ============================================================

ALTER TABLE supplier_claims ADD COLUMN IF NOT EXISTS tipo_material TEXT NOT NULL DEFAULT 'materia_prima';
