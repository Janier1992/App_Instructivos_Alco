-- ============================================================
-- Control Calidad — Reclamos a Proveedores: informe de No Conformidades
-- de abastecimiento (formato "INFORME CALIDAD ABASTECIMIENTO NO
-- CONFORMIDADES PROVEEDOR"). El colaborador registra la inspección con
-- fotos y su análisis; Gemini redacta el informe y el PDF se genera en el
-- navegador con la misma plantilla. Consulta, registro, edición y
-- eliminación se hacen desde el módulo de Control Calidad.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query. Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS supplier_claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  process_slug VARCHAR(100) NOT NULL DEFAULT 'control-calidad',
  fecha_informe DATE NOT NULL DEFAULT CURRENT_DATE,
  proveedor VARCHAR(255) NOT NULL,
  materia_prima VARCHAR(255) NOT NULL,
  referencias VARCHAR(255) NOT NULL,
  lotes VARCHAR(255),
  defecto_titulo VARCHAR(255),
  observacion_inspector TEXT NOT NULL,
  descripcion_nc TEXT,
  observaciones_tecnicas JSONB NOT NULL DEFAULT '[]'::jsonb,
  acciones_correctivas JSONB NOT NULL DEFAULT '[]'::jsonb,
  rechazo_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  foto_etiqueta_paths TEXT[] NOT NULL DEFAULT '{}',
  foto_defecto_paths TEXT[] NOT NULL DEFAULT '{}',
  realizado_por VARCHAR(255) NOT NULL,
  cargo VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplier_claims_process_slug ON supplier_claims(process_slug);
CREATE INDEX IF NOT EXISTS idx_supplier_claims_created_at ON supplier_claims(created_at);
ALTER TABLE supplier_claims ENABLE ROW LEVEL SECURITY;

-- Bucket privado para las fotos (etiqueta y defecto). El navegador sube con
-- una signed upload URL y las fotos se leen siempre a través del servidor.
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-claim-photos', 'supplier-claim-photos', false)
ON CONFLICT (id) DO NOTHING;
