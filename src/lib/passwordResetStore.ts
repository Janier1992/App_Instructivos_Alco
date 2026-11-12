import { createHash, randomBytes } from 'crypto';
import { getSupabaseClient } from './supabaseService';

/**
 * Tokens de un solo uso para restablecer la contraseña del CRM. En la base
 * solo se guarda el hash SHA-256: quien lea la tabla no puede reconstruir el
 * enlace. Vencen a los 30 minutos y solo hay uno vigente por usuario.
 */

const TOKEN_TTL_MS = 30 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Crea un token nuevo e invalida los anteriores del usuario. Devuelve el token en claro. */
export async function createPasswordResetToken(userId: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  await supabase.from('admin_password_resets').delete().eq('user_id', userId).is('used_at', null);

  const token = randomBytes(32).toString('hex');
  const { error } = await supabase.from('admin_password_resets').insert({
    user_id: userId,
    token_hash: hashToken(token),
    expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString()
  });

  if (error) {
    console.error('❌ Error guardando token de restablecimiento (¿corriste db/migrate_add_password_resets.sql?):', error.message);
    return null;
  }
  return token;
}

/** Marca el token como usado y devuelve el usuario dueño, o null si es inválido, vencido o ya usado. */
export async function consumePasswordResetToken(token: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('admin_password_resets')
    .update({ used_at: new Date().toISOString() })
    .eq('token_hash', hashToken(token))
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('user_id')
    .maybeSingle();

  if (error || !data) return null;
  return data.user_id as string;
}
