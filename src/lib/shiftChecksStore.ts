import { getSupabaseClient } from './supabaseService';

/**
 * Autocontrol por turno: el propio proceso se audita a sí mismo con un
 * checklist corto (2-5 ítems definidos por Calidad) al iniciar o cerrar
 * turno, en vez de esperar a que Calidad encuentre el problema. Dos tablas:
 * shift_check_items (qué se pregunta, configurado desde el CRM) y
 * shift_checks (cada respuesta real, enviada desde la app pública). Se lee
 * poco por proceso, así que no mantiene caché en memoria — consulta
 * Supabase directo, igual que collaboratorCompetenciesStore.ts.
 */

export type Shift = 'manana' | 'tarde' | 'noche';

export interface ShiftCheckItem {
  id: string;
  processSlug: string;
  label: string;
  displayOrder: number;
  active: boolean;
}

export interface ShiftCheckResult {
  itemId: string;
  label: string;
  passed: boolean;
}

export interface ShiftCheck {
  id: string;
  processSlug: string;
  shift: Shift;
  collaboratorName: string;
  results: ShiftCheckResult[];
  allPassed: boolean;
  notes?: string;
  createdAt: string;
}

function mapItemRow(row: any): ShiftCheckItem {
  return {
    id: row.id,
    processSlug: row.process_slug,
    label: row.label,
    displayOrder: row.display_order,
    active: !!row.active
  };
}

function mapCheckRow(row: any): ShiftCheck {
  return {
    id: row.id,
    processSlug: row.process_slug,
    shift: row.shift,
    collaboratorName: row.collaborator_name,
    results: row.results || [],
    allPassed: !!row.all_passed,
    notes: row.notes || undefined,
    createdAt: row.created_at
  };
}

export async function getShiftCheckItems(processSlug: string, onlyActive: boolean = true): Promise<ShiftCheckItem[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    let query = supabase.from('shift_check_items').select('*').eq('process_slug', processSlug).order('display_order', { ascending: true });
    if (onlyActive) query = query.eq('active', true);

    const { data, error } = await query;
    if (error) {
      console.warn('⚠️ No se pudieron cargar los ítems de autocontrol:', error.message);
      return [];
    }
    return (data || []).map(mapItemRow);
  } catch (err: any) {
    console.warn('⚠️ Error cargando ítems de autocontrol:', err?.message || err);
    return [];
  }
}

export async function createShiftCheckItem(params: {
  processSlug: string;
  label: string;
  displayOrder?: number;
  createdBy?: string;
}): Promise<{ success: boolean; item?: ShiftCheckItem; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  try {
    const { data, error } = await supabase
      .from('shift_check_items')
      .insert({
        process_slug: params.processSlug,
        label: params.label.trim(),
        display_order: params.displayOrder ?? 0,
        created_by: params.createdBy || null
      })
      .select()
      .single();

    if (error || !data) {
      console.warn('⚠️ No se pudo crear el ítem de autocontrol:', error?.message);
      return { success: false, error: error?.message || 'Error desconocido.' };
    }
    return { success: true, item: mapItemRow(data) };
  } catch (err: any) {
    console.warn('⚠️ Error creando ítem de autocontrol:', err?.message || err);
    return { success: false, error: err?.message || 'Error desconocido.' };
  }
}

export async function setShiftCheckItemActive(id: string, active: boolean): Promise<{ success: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false };

  try {
    const { error } = await supabase.from('shift_check_items').update({ active }).eq('id', id);
    if (error) {
      console.warn('⚠️ No se pudo actualizar el ítem de autocontrol:', error.message);
      return { success: false };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('⚠️ Error actualizando ítem de autocontrol:', err?.message || err);
    return { success: false };
  }
}

export async function deleteShiftCheckItem(id: string): Promise<{ success: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false };

  try {
    const { error } = await supabase.from('shift_check_items').delete().eq('id', id);
    if (error) {
      console.warn('⚠️ No se pudo eliminar el ítem de autocontrol:', error.message);
      return { success: false };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('⚠️ Error eliminando ítem de autocontrol:', err?.message || err);
    return { success: false };
  }
}

export async function recordShiftCheck(params: {
  processSlug: string;
  shift: Shift;
  collaboratorName: string;
  results: ShiftCheckResult[];
  notes?: string;
}): Promise<{ success: boolean; check?: ShiftCheck; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  const allPassed = params.results.every(r => r.passed);

  try {
    const { data, error } = await supabase
      .from('shift_checks')
      .insert({
        process_slug: params.processSlug,
        shift: params.shift,
        collaborator_name: params.collaboratorName.trim(),
        results: params.results,
        all_passed: allPassed,
        notes: params.notes?.trim() || null
      })
      .select()
      .single();

    if (error || !data) {
      console.warn('⚠️ No se pudo registrar el autocontrol:', error?.message);
      return { success: false, error: error?.message || 'Error desconocido.' };
    }
    return { success: true, check: mapCheckRow(data) };
  } catch (err: any) {
    console.warn('⚠️ Error registrando autocontrol:', err?.message || err);
    return { success: false, error: err?.message || 'Error desconocido.' };
  }
}

/** Último autocontrol registrado — refuerza visibilidad pública de si el proceso ya se auditó hoy. */
export async function getLatestShiftCheck(processSlug: string): Promise<ShiftCheck | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('shift_checks')
      .select('*')
      .eq('process_slug', processSlug)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return mapCheckRow(data);
  } catch (err: any) {
    console.warn('⚠️ Error obteniendo el último autocontrol:', err?.message || err);
    return null;
  }
}

/** Historial reciente para el CRM — todos los procesos o uno solo, más recientes primero. */
export async function getShiftChecks(processSlug?: string, limit: number = 100): Promise<ShiftCheck[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    let query = supabase.from('shift_checks').select('*').order('created_at', { ascending: false }).limit(limit);
    if (processSlug) query = query.eq('process_slug', processSlug);

    const { data, error } = await query;
    if (error) {
      console.warn('⚠️ No se pudo cargar el historial de autocontrol:', error.message);
      return [];
    }
    return (data || []).map(mapCheckRow);
  } catch (err: any) {
    console.warn('⚠️ Error cargando historial de autocontrol:', err?.message || err);
    return [];
  }
}
