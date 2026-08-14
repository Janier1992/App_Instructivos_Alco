import { getSupabaseClient } from './supabaseService';

/**
 * Auditoría de operaciones administrativas del CRM. A diferencia del resto
 * de escrituras "best effort" del proyecto, un fallo aquí se reporta siempre
 * con console.error (nunca en silencio) porque es información de
 * cumplimiento — aunque, igual que el resto de la app, no revierte la
 * operación principal si el log no se pudo guardar.
 */

export interface AuditEventInput {
  adminUserId: string;
  adminEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditEvent {
  id: string;
  adminEmail: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export async function recordAuditEvent(event: AuditEventInput): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('❌ No se registró auditoría (Supabase no configurado):', event.action, event.entityType, event.entityId);
    return;
  }

  try {
    const { error } = await supabase.from('admin_audit_log').insert({
      admin_user_id: event.adminUserId,
      admin_email: event.adminEmail,
      action: event.action,
      entity_type: event.entityType,
      entity_id: event.entityId,
      metadata: event.metadata || null
    });

    if (error) {
      console.error('❌ Error registrando evento de auditoría:', error.message, event);
    }
  } catch (err: any) {
    console.error('❌ Error registrando evento de auditoría:', err?.message || err, event);
  }
}

export async function listAuditEvents(limit = 200): Promise<AuditEvent[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    adminEmail: row.admin_email,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata,
    createdAt: row.created_at
  }));
}
