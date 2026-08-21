-- ============================================================
-- Migración: permitir eliminar un usuario del CRM sin que falle por sus
-- rastros históricos (a quién se le atribuye una circular, un comentario
-- aprobado/rechazado, una entrada de auditoría). Por defecto esas llaves
-- foráneas bloquean el DELETE (RESTRICT); se cambian a ON DELETE SET NULL
-- para conservar esos registros con la referencia en NULL en vez de
-- impedir borrar el perfil o borrar en cascada su historial.
--
-- Ejecuta este script una sola vez en el SQL Editor de Supabase. Es seguro
-- volver a correrlo (los DROP CONSTRAINT usan IF EXISTS).
-- ============================================================

ALTER TABLE circulares DROP CONSTRAINT IF EXISTS circulares_created_by_fkey;
ALTER TABLE circulares
  ADD CONSTRAINT circulares_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL;

ALTER TABLE admin_audit_log DROP CONSTRAINT IF EXISTS admin_audit_log_admin_user_id_fkey;
ALTER TABLE admin_audit_log
  ADD CONSTRAINT admin_audit_log_admin_user_id_fkey
  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE SET NULL;

ALTER TABLE circular_comments DROP CONSTRAINT IF EXISTS circular_comments_reviewed_by_fkey;
ALTER TABLE circular_comments
  ADD CONSTRAINT circular_comments_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES admin_users(id) ON DELETE SET NULL;
