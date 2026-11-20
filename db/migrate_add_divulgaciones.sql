-- ============================================================
-- Control Calidad — Divulgaciones: planilla "ASISTENCIA A CAPACITACIÓN,
-- DIVULGACIÓN Y CHARLA" (transversal a los procesos). Cada divulgación,
-- capacitación o charla se registra con su tema, objetivo, responsable,
-- proceso, duración y evaluación, y puede partir de un comunicado ya creado.
-- Cada asistente registra su propia fila (nombre, cédula, proceso o sección
-- y firma dibujada en la app); las filas viven en una tabla aparte para que
-- varias personas puedan registrarse a la vez sin pisarse entre sí.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query. Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS divulgaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  process_slug VARCHAR(100) NOT NULL DEFAULT 'control-calidad',
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  tema VARCHAR(500) NOT NULL,
  objetivo TEXT NOT NULL DEFAULT '',
  responsable VARCHAR(255) NOT NULL,
  proceso_area VARCHAR(255) NOT NULL DEFAULT '',
  duracion VARCHAR(100) NOT NULL DEFAULT '',
  tipo VARCHAR(20) NOT NULL DEFAULT 'divulgacion',
  comunicado_id UUID,
  evaluacion_dias VARCHAR(50) NOT NULL DEFAULT '',
  evaluador VARCHAR(255) NOT NULL DEFAULT '',
  resultados TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_divulgaciones_process_slug ON divulgaciones(process_slug);
CREATE INDEX IF NOT EXISTS idx_divulgaciones_created_at ON divulgaciones(created_at);
ALTER TABLE divulgaciones ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS divulgacion_asistentes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  divulgacion_id UUID NOT NULL REFERENCES divulgaciones(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  cedula VARCHAR(50) NOT NULL,
  proceso_seccion VARCHAR(255) NOT NULL DEFAULT '',
  -- Firma dibujada en la app: PNG recortado a su trazo, en data URL (unos 10 a 25 KB).
  firma TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_divulgacion_asistentes_divulgacion ON divulgacion_asistentes(divulgacion_id);
-- Una misma cédula se registra una sola vez por divulgación (evita filas duplicadas por doble clic).
CREATE UNIQUE INDEX IF NOT EXISTS idx_divulgacion_asistentes_cedula ON divulgacion_asistentes(divulgacion_id, cedula);
ALTER TABLE divulgacion_asistentes ENABLE ROW LEVEL SECURITY;
