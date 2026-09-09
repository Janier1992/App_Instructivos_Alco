import { getSupabaseClient } from './supabaseService';

export interface MetrologyReplacement {
  id: string;
  processSlug: string;
  fechaRegistro: string;
  nombreEquipo: string;
  marca: string | null;
  codigo: string;
  areaUso: string;
  nombreResponsable: string;
  motivoReposicion: string;
  devuelveEquipoAnterior: 'SI' | 'NO' | '';
  descripcionBaja: string | null;
  seCobraEquipo: 'SI' | 'NO' | '';
  nombreResponsableCalidad: string | null;
  firmaResponsableArea: string | null;
  firmaResponsableCalidad: string | null;
  createdAt: string;
}

function mapRow(row: any): MetrologyReplacement {
  return {
    id: row.id,
    processSlug: row.process_slug,
    fechaRegistro: row.fecha_registro,
    nombreEquipo: row.nombre_equipo,
    marca: row.marca || null,
    codigo: row.codigo,
    areaUso: row.area_uso,
    nombreResponsable: row.nombre_responsable,
    motivoReposicion: row.motivo_reposicion,
    devuelveEquipoAnterior: row.devuelve_equipo_anterior || '',
    descripcionBaja: row.descripcion_baja || null,
    seCobraEquipo: row.se_cobra_equipo || '',
    nombreResponsableCalidad: row.nombre_responsable_calidad || null,
    firmaResponsableArea: row.firma_responsable_area || null,
    firmaResponsableCalidad: row.firma_responsable_calidad || null,
    createdAt: row.created_at
  };
}

export interface MetrologyReplacementInput {
  fechaRegistro: string;
  nombreEquipo: string;
  marca?: string;
  codigo: string;
  areaUso: string;
  nombreResponsable: string;
  motivoReposicion: string;
  devuelveEquipoAnterior?: 'SI' | 'NO' | '';
  descripcionBaja?: string;
  seCobraEquipo?: 'SI' | 'NO' | '';
  nombreResponsableCalidad?: string;
  firmaResponsableArea?: string;
  firmaResponsableCalidad?: string;
}

function toDbRow(input: MetrologyReplacementInput, createdBy?: string) {
  return {
    process_slug: 'control-calidad',
    fecha_registro: input.fechaRegistro || new Date().toISOString().split('T')[0],
    nombre_equipo: (input.nombreEquipo || '').toUpperCase(),
    marca: (input.marca || '').toUpperCase() || null,
    codigo: (input.codigo || '').toUpperCase(),
    area_uso: (input.areaUso || '').toUpperCase(),
    nombre_responsable: (input.nombreResponsable || '').toUpperCase(),
    motivo_reposicion: input.motivoReposicion || '',
    devuelve_equipo_anterior: input.devuelveEquipoAnterior || null,
    descripcion_baja: input.descripcionBaja || null,
    se_cobra_equipo: input.seCobraEquipo || null,
    nombre_responsable_calidad: (input.nombreResponsableCalidad || '').toUpperCase() || null,
    firma_responsable_area: input.firmaResponsableArea || null,
    firma_responsable_calidad: input.firmaResponsableCalidad || null,
    created_by: createdBy || null
  };
}

export async function createMetrologyReplacement(
  input: MetrologyReplacementInput,
  createdBy?: string
): Promise<{ success: boolean; replacement?: MetrologyReplacement; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  try {
    const { data, error } = await supabase.from('metrology_replacements').insert(toDbRow(input, createdBy)).select().single();
    if (error || !data) return { success: false, error: error?.message || 'No se pudo guardar el registro.' };
    return { success: true, replacement: mapRow(data) };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error desconocido.' };
  }
}

export async function getMetrologyReplacements(limit = 500): Promise<MetrologyReplacement[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase.from('metrology_replacements').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) {
      console.warn('⚠️ No se pudieron cargar los registros de reposición/baja:', error.message);
      return [];
    }
    return (data || []).map(mapRow);
  } catch (err: any) {
    console.warn('⚠️ Error cargando registros de reposición/baja:', err?.message || err);
    return [];
  }
}

export async function getMetrologyReplacementById(id: string): Promise<MetrologyReplacement | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from('metrology_replacements').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapRow(data);
}

export async function updateMetrologyReplacement(
  id: string,
  input: MetrologyReplacementInput
): Promise<{ success: boolean; replacement?: MetrologyReplacement; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  const patch = toDbRow(input);
  delete (patch as any).created_by;
  (patch as any).updated_at = new Date().toISOString();

  try {
    const { data, error } = await supabase.from('metrology_replacements').update(patch).eq('id', id).select().single();
    if (error || !data) return { success: false, error: error?.message || 'No se pudo actualizar.' };
    return { success: true, replacement: mapRow(data) };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error desconocido.' };
  }
}

export async function deleteMetrologyReplacement(id: string): Promise<{ success: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false };

  const { error } = await supabase.from('metrology_replacements').delete().eq('id', id);
  if (error) {
    console.warn('⚠️ No se pudo eliminar el registro de reposición/baja:', error.message);
    return { success: false };
  }
  return { success: true };
}
