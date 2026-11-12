-- ============================================================
-- Migración: enlaces de un solo uso para restablecer la contraseña del
-- Portal de Administración (/crm). Solo se guarda el hash SHA-256 del
-- token; el token en claro viaja únicamente en el correo.
--
-- Ejecuta este script una sola vez en el SQL Editor de Supabase. Es seguro
-- volver a correrlo.
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_password_resets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON admin_password_resets(user_id);
ALTER TABLE admin_password_resets ENABLE ROW LEVEL SECURITY;
