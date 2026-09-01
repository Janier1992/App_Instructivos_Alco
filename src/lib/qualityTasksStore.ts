import { getSupabaseClient } from './supabaseService';

/**
 * Tablero de tareas (Kanban) del equipo de Calidad — se gestiona
 * directamente desde la tarjeta pública de Control Calidad, sin cuenta de
 * usuario, igual que el Buzón de Mejora y el Autocontrol por Turno: es la
 * herramienta operativa de uso diario del área, no una configuración
 * administrativa. Sin caché en memoria — se lee cada vez que se abre la
 * pestaña "Tareas".
 */

export type QualityTaskStatus = 'pendiente' | 'en_progreso' | 'hecha';

export interface QualityTask {
  id: string;
  processSlug: string;
  title: string;
  description?: string;
  assignee?: string;
  status: QualityTaskStatus;
  dueDate?: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

function mapRow(row: any): QualityTask {
  return {
    id: row.id,
    processSlug: row.process_slug,
    title: row.title,
    description: row.description || undefined,
    assignee: row.assignee || undefined,
    status: row.status,
    dueDate: row.due_date || undefined,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function getQualityTasks(processSlug: string): Promise<QualityTask[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('quality_tasks')
      .select('*')
      .eq('process_slug', processSlug)
      .order('display_order', { ascending: true });
    if (error) {
      console.warn('⚠️ No se pudieron cargar las tareas de Calidad:', error.message);
      return [];
    }
    return (data || []).map(mapRow);
  } catch (err: any) {
    console.warn('⚠️ Error cargando tareas de Calidad:', err?.message || err);
    return [];
  }
}

export async function createQualityTask(params: {
  processSlug: string;
  title: string;
  description?: string;
  assignee?: string;
  dueDate?: string;
}): Promise<{ success: boolean; task?: QualityTask; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  try {
    const { data, error } = await supabase
      .from('quality_tasks')
      .insert({
        process_slug: params.processSlug,
        title: params.title.trim(),
        description: params.description?.trim() || null,
        assignee: params.assignee?.trim() || null,
        due_date: params.dueDate || null
      })
      .select()
      .single();

    if (error || !data) {
      console.warn('⚠️ No se pudo crear la tarea de Calidad:', error?.message);
      return { success: false, error: error?.message || 'Error desconocido.' };
    }
    return { success: true, task: mapRow(data) };
  } catch (err: any) {
    console.warn('⚠️ Error creando tarea de Calidad:', err?.message || err);
    return { success: false, error: err?.message || 'Error desconocido.' };
  }
}

export async function updateQualityTask(
  id: string,
  updates: Partial<{ title: string; description: string; assignee: string; status: QualityTaskStatus; dueDate: string | null; displayOrder: number }>
): Promise<{ success: boolean; task?: QualityTask; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) patch.title = updates.title.trim();
  if (updates.description !== undefined) patch.description = updates.description?.trim() || null;
  if (updates.assignee !== undefined) patch.assignee = updates.assignee?.trim() || null;
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.dueDate !== undefined) patch.due_date = updates.dueDate || null;
  if (updates.displayOrder !== undefined) patch.display_order = updates.displayOrder;

  try {
    const { data, error } = await supabase.from('quality_tasks').update(patch).eq('id', id).select().single();
    if (error || !data) {
      console.warn('⚠️ No se pudo actualizar la tarea de Calidad:', error?.message);
      return { success: false, error: error?.message || 'Error desconocido.' };
    }
    return { success: true, task: mapRow(data) };
  } catch (err: any) {
    console.warn('⚠️ Error actualizando tarea de Calidad:', err?.message || err);
    return { success: false, error: err?.message || 'Error desconocido.' };
  }
}

export async function deleteQualityTask(id: string): Promise<{ success: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false };

  try {
    const { error } = await supabase.from('quality_tasks').delete().eq('id', id);
    if (error) {
      console.warn('⚠️ No se pudo eliminar la tarea de Calidad:', error.message);
      return { success: false };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('⚠️ Error eliminando tarea de Calidad:', err?.message || err);
    return { success: false };
  }
}
