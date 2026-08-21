import { getSupabaseClient } from './supabaseService';
import { AdminRole, hashPassword } from './adminAuth';

/**
 * Usuarios del CRM. A diferencia del resto de stores del proyecto (que
 * cachean en memoria y se hidratan una vez por cold start), este siempre lee
 * directo de Supabase — son datos sensibles de seguridad (rol, is_active) y
 * una caché desactualizada podría dejar activo a un usuario que se acaba de
 * desactivar.
 */

export interface AdminUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export type AdminUserPublic = Omit<AdminUserRecord, 'passwordHash'>;

function mapRow(row: any): AdminUserRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    fullName: row.full_name,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at
  };
}

function toPublic(user: AdminUserRecord): AdminUserPublic {
  const { passwordHash, ...rest } = user;
  return rest;
}

export async function findAdminUserById(id: string): Promise<AdminUserRecord | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from('admin_users').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapRow(data);
}

export async function findAdminUserByEmail(email: string): Promise<AdminUserRecord | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (error) {
    console.warn('⚠️ Error consultando admin_users (¿corriste el último db/schema.sql?):', error.message);
    return null;
  }
  if (!data) return null;
  return mapRow(data);
}

export async function updateLastLogin(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.from('admin_users').update({ last_login_at: new Date().toISOString() }).eq('id', userId);
}

export async function listAdminUsers(): Promise<AdminUserPublic[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from('admin_users').select('*').order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((row: any) => toPublic(mapRow(row)));
}

export async function createAdminUser(params: {
  email: string;
  password: string;
  fullName: string;
  role: AdminRole;
}): Promise<{ success: boolean; error?: string; user?: AdminUserPublic }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  const existing = await findAdminUserByEmail(params.email);
  if (existing) return { success: false, error: 'Ya existe un usuario del CRM con ese correo.' };

  const passwordHash = await hashPassword(params.password);
  const { data, error } = await supabase
    .from('admin_users')
    .insert({
      email: params.email.trim().toLowerCase(),
      password_hash: passwordHash,
      full_name: params.fullName.trim(),
      role: params.role
    })
    .select('*')
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'No se pudo crear el usuario.' };
  }

  return { success: true, user: toPublic(mapRow(data)) };
}

export async function setAdminUserActive(userId: string, isActive: boolean): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase.from('admin_users').update({ is_active: isActive }).eq('id', userId);
  return !error;
}

/** Cuántos Administradores activos hay, sin contar a userId — para no dejar el CRM sin nadie que administre. */
export async function countOtherActiveAdministrators(excludeUserId: string): Promise<number> {
  const supabase = getSupabaseClient();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from('admin_users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'administrador')
    .eq('is_active', true)
    .neq('id', excludeUserId);

  if (error) return 0;
  return count || 0;
}

export async function updateAdminUser(
  userId: string,
  updates: { fullName?: string; email?: string; role?: AdminRole; password?: string }
): Promise<{ success: boolean; error?: string; user?: AdminUserPublic }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  const patch: Record<string, unknown> = {};

  if (updates.fullName !== undefined) patch.full_name = updates.fullName.trim();

  if (updates.email !== undefined) {
    const normalizedEmail = updates.email.trim().toLowerCase();
    const existing = await findAdminUserByEmail(normalizedEmail);
    if (existing && existing.id !== userId) {
      return { success: false, error: 'Ya existe otro usuario del CRM con ese correo.' };
    }
    patch.email = normalizedEmail;
  }

  if (updates.role !== undefined) patch.role = updates.role;
  if (updates.password) patch.password_hash = await hashPassword(updates.password);

  if (Object.keys(patch).length === 0) {
    return { success: false, error: 'No hay cambios para guardar.' };
  }

  const { data, error } = await supabase.from('admin_users').update(patch).eq('id', userId).select('*').single();
  if (error || !data) {
    return { success: false, error: error?.message || 'No se pudo actualizar el usuario.' };
  }
  return { success: true, user: toPublic(mapRow(data)) };
}

/**
 * Elimina el perfil definitivamente. Los registros históricos que lo
 * referencian (auditoría, circulares creadas, comentarios revisados) se
 * conservan — el esquema los deja en NULL en vez de bloquear o borrar en
 * cascada (ver db/migrate_admin_users_delete_fk.sql).
 */
export async function deleteAdminUser(userId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase.from('admin_users').delete().eq('id', userId);
  if (error) {
    console.warn('⚠️ Error eliminando usuario del CRM:', error.message);
    return false;
  }
  return true;
}
