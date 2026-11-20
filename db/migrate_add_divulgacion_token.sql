-- ============================================================
-- Control Calidad — Divulgaciones: enlace público de registro de asistencia.
-- Cada divulgación recibe un código aleatorio propio (registro_token) que
-- se usa en el enlace /asistencia/<código> que se comparte con los
-- colaboradores. El enlace NO usa el id interno de la divulgación: con el
-- código solo se puede ver el tema de la sesión y registrar la asistencia,
-- nunca la lista de asistentes con sus cédulas y firmas.
-- Las divulgaciones que ya existen reciben su propio código al ejecutar el script.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query. Idempotente.
-- ============================================================

ALTER TABLE divulgaciones ADD COLUMN IF NOT EXISTS registro_token UUID NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_divulgaciones_registro_token ON divulgaciones(registro_token);
