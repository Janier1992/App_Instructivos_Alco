-- ============================================================
-- Agrega la "Vista de Registros" opcional a cada Formulario de Inspección:
-- una segunda URL de embed (Excel Online / SharePoint) donde viven las
-- respuestas reales del formulario. El aplicativo nunca guarda esos datos
-- — solo embebe la vista, igual que ya hace con el formulario mismo.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query. Idempotente.
-- ============================================================

ALTER TABLE inspection_forms ADD COLUMN IF NOT EXISTS records_embed_url TEXT;
