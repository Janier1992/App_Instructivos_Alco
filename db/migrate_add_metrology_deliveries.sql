-- ============================================================
-- Metrología Pro — Entrega de Equipos: primer submódulo de
-- "Metrología Pro" dentro de Control Calidad, portado desde el
-- proyecto de referencia (arquitectura equivalente, adaptado a
-- Supabase). Acta de entrega de herramientas/equipos de medición,
-- con firma digital de quien entrega y quien recibe. Consulta y
-- registro públicos; editar/eliminar requiere sesión del CRM.
-- Las firmas se guardan como PNG base64 (igual que el proyecto de
-- referencia): son pequeñas y se insertan directo en el PDF
-- exportado sin pasos adicionales de descarga, a diferencia de
-- fotos/videos que sí van a Storage.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query. Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS metrology_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  process_slug VARCHAR(100) NOT NULL DEFAULT 'control-calidad',
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  area VARCHAR(100) NOT NULL,
  sede VARCHAR(60) NOT NULL,
  receptor_nombre VARCHAR(255) NOT NULL,
  receptor_cedula VARCHAR(40) NOT NULL,
  receptor_cargo VARCHAR(150),
  items JSONB NOT NULL DEFAULT '[]',
  firma_entrega TEXT,
  firma_recibe TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_metrology_deliveries_process_slug ON metrology_deliveries(process_slug);
CREATE INDEX IF NOT EXISTS idx_metrology_deliveries_created_at ON metrology_deliveries(created_at);
ALTER TABLE metrology_deliveries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_users')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints
       WHERE constraint_name = 'metrology_deliveries_created_by_fkey'
     ) THEN
    ALTER TABLE metrology_deliveries
      ADD CONSTRAINT metrology_deliveries_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL;
  END IF;
END $$;
