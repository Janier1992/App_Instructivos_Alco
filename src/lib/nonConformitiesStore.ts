import { getSupabaseClient } from './supabaseService';

/**
 * No Conformidad — alcance mínimo: se crea automáticamente cuando una
 * inspección de campo queda "Rechazada" (ver fieldInspectionsStore).
 * Esto NO es el módulo completo de "No Conformidades y CAPA" del proyecto
 * de referencia (5 Porqués, plan de acción, cierre) — eso no se pidió
 * integrar. Aquí solo queda el registro visible y con estado editable,
 * para que no sea un dato huérfano.
 */
export interface NonConformity {
  id: string;
  serialId: string;
  title: string;
  processArea: string | null;
  projectReference: string | null;
  severity: string;
  description: string | null;
  status: string;
  rca: Record<string, string> | null;
  sourceFieldInspectionId: string | null;
  createdAt: string;
}

function mapRow(row: any): NonConformity {
  return {
    id: row.id,
    serialId: row.serial_id,
    title: row.title,
    processArea: row.process_area || null,
    projectReference: row.project_reference || null,
    severity: row.severity,
    description: row.description || null,
    status: row.status,
    rca: row.rca || null,
    sourceFieldInspectionId: row.source_field_inspection_id || null,
    createdAt: row.created_at
  };
}

export async function createNonConformity(params: {
  title: string;
  processArea?: string;
  projectReference?: string;
  description?: string;
  sourceFieldInspectionId?: string;
}): Promise<{ success: boolean; nonConformity?: NonConformity }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false };

  const serialId = `NC-AUTO-${Date.now().toString().slice(-6)}`;

  try {
    const { data, error } = await supabase
      .from('non_conformities')
      .insert({
        serial_id: serialId,
        title: params.title,
        process_area: params.processArea || null,
        project_reference: params.projectReference || null,
        severity: 'Mayor',
        description: params.description || null,
        status: 'Abierta',
        rca: { why1: '', why2: '', why3: '', why4: '', why5: '', rootCause: '' },
        source_field_inspection_id: params.sourceFieldInspectionId || null
      })
      .select()
      .single();

    if (error || !data) {
      console.warn('⚠️ No se pudo crear la No Conformidad automática:', error?.message);
      return { success: false };
    }
    return { success: true, nonConformity: mapRow(data) };
  } catch (err: any) {
    console.warn('⚠️ Error creando No Conformidad automática:', err?.message || err);
    return { success: false };
  }
}

export async function getNonConformities(limit: number = 200): Promise<NonConformity[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from('non_conformities').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) {
    console.warn('⚠️ No se pudieron cargar las No Conformidades:', error.message);
    return [];
  }
  return (data || []).map(mapRow);
}

export async function updateNonConformityStatus(id: string, status: string): Promise<{ success: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false };

  const { error } = await supabase.from('non_conformities').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) {
    console.warn('⚠️ No se pudo actualizar el estado de la No Conformidad:', error.message);
    return { success: false };
  }
  return { success: true };
}
