import { getSupabaseClient } from './supabaseService';
import { createNonConformity } from './nonConformitiesStore';
import { parsePlanoGroups, flattenPlanoGroups, matchCantidadesToGroups } from './fieldPlanoGroups';

const PHOTO_BUCKET = 'field-inspection-photos';
const PHOTO_URL_TTL_SECONDS = 6 * 60 * 60;
const PHOTO_URL_REUSE_MARGIN_MS = 10 * 60 * 1000;
const BULK_INSERT_CHUNK_SIZE = 500;

export interface FieldInspection {
  id: string;
  processSlug: string;
  fecha: string;
  areaProceso: string;
  op: string;
  planoOpc: string | null;
  disenoReferencia: string | null;
  cantTotal: number;
  cantRetenida: number;
  estado: string;
  defecto: string;
  reviso: string | null;
  responsable: string | null;
  accionCorrectiva: string | null;
  observacionSugerida: string | null;
  observacion: string | null;
  photoStoragePath: string | null;
  alertLevel: 'None' | 'Warning' | 'Critical';
  aiMetadata: Record<string, unknown> | null;
  createdAt: string;
}

function mapRow(row: any): FieldInspection {
  return {
    id: row.id,
    processSlug: row.process_slug,
    fecha: row.fecha,
    areaProceso: row.area_proceso,
    op: row.op,
    planoOpc: row.plano_opc || null,
    disenoReferencia: row.diseno_referencia || null,
    cantTotal: row.cant_total ?? 0,
    cantRetenida: row.cant_retenida ?? 0,
    estado: row.estado,
    defecto: row.defecto,
    reviso: row.reviso || null,
    responsable: row.responsable || null,
    accionCorrectiva: row.accion_correctiva || null,
    observacionSugerida: row.observacion_sugerida || null,
    observacion: row.observacion || null,
    photoStoragePath: row.photo_storage_path || null,
    alertLevel: row.alert_level || 'None',
    aiMetadata: row.ai_metadata || null,
    createdAt: row.created_at
  };
}

/**
 * "1-5, 8, 10" -> ['1','2','3','4','5','8','10'] — mismo formato de rango
 * de planos/ítems del proyecto de referencia. Cada número expandido genera
 * un registro de inspección independiente en el mismo envío. Ver
 * ./fieldPlanoGroups para la lógica real (compartida con el emparejamiento
 * de cantidades por grupo).
 */
export function parsePlanNumbers(input: string): string[] {
  return flattenPlanoGroups(parsePlanoGroups(input));
}

export interface FieldInspectionInput {
  fecha: string;
  areaProceso: string;
  op: string;
  planoOpc?: string;
  disenoReferencia?: string;
  /**
   * Acepta un número simple (comportamiento clásico) o, cuando "Plano/Ítems"
   * trae varios grupos separados por coma, una cantidad por grupo separada
   * por coma en el mismo orden (ej. planoOpc="1-5, 8, 9" y cantTotal="1,2,1").
   */
  cantTotal: number | string;
  cantRetenida: number;
  estado: string;
  defecto: string;
  reviso?: string;
  responsable?: string;
  accionCorrectiva?: string;
  observacionSugerida?: string;
  observacion?: string;
  photoStoragePath?: string;
  alertLevel?: 'None' | 'Warning' | 'Critical';
  aiMetadata?: Record<string, unknown>;
}

function toDbRow(input: FieldInspectionInput, planoOpc: string | undefined, createdBy?: string, cantTotalOverride?: number) {
  return {
    process_slug: 'control-calidad',
    fecha: input.fecha || new Date().toISOString().split('T')[0],
    area_proceso: (input.areaProceso || '').toUpperCase(),
    op: (input.op || '').toUpperCase(),
    plano_opc: (planoOpc ?? input.planoOpc ?? '').toString().toUpperCase() || null,
    diseno_referencia: (input.disenoReferencia || '').toUpperCase() || null,
    cant_total: cantTotalOverride ?? (Number(input.cantTotal) || 0),
    cant_retenida: Number(input.cantRetenida) || 0,
    estado: input.estado || 'Aprobado',
    defecto: (input.defecto || 'NINGUNO').toUpperCase(),
    reviso: input.reviso || null,
    responsable: (input.responsable || '').toUpperCase() || null,
    accion_correctiva: (input.accionCorrectiva || 'NA').toUpperCase(),
    observacion_sugerida: (input.observacionSugerida || '').toUpperCase() || null,
    observacion: input.observacion || 'NA',
    photo_storage_path: input.photoStoragePath || null,
    alert_level: input.alertLevel || 'None',
    ai_metadata: input.aiMetadata || null,
    created_by: createdBy || null
  };
}

/**
 * Crea una o varias inspecciones en un solo envío (si planoOpc trae un
 * rango tipo "1-5, 8" se expande a un registro por cada plano/ítem — igual
 * que el proyecto de referencia). "Cant. Total" puede traer una sola
 * cantidad (se aplica a todos los planos) o una cantidad por cada grupo de
 * plano separado por coma, en el mismo orden — ver ./fieldPlanoGroups. Si
 * el estado queda "Rechazado", abre automáticamente un borrador de No
 * Conformidad sobre el primer registro creado.
 */
export async function createFieldInspections(
  input: FieldInspectionInput,
  createdBy?: string
): Promise<{ success: boolean; inspections?: FieldInspection[]; nonConformityCreated?: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  const planGroups = input.planoOpc ? parsePlanoGroups(input.planoOpc) : [];
  const cantidadMatch = matchCantidadesToGroups(String(input.cantTotal ?? ''), planGroups.length);
  if (!cantidadMatch.success || !cantidadMatch.cantidadesPorGrupo) {
    return { success: false, error: cantidadMatch.error || 'Cantidad inválida.' };
  }

  const rows =
    planGroups.length > 0
      ? planGroups.flatMap((group, idx) => group.planos.map(plano => toDbRow(input, plano, createdBy, cantidadMatch.cantidadesPorGrupo![idx])))
      : [toDbRow(input, input.planoOpc, createdBy, cantidadMatch.cantidadesPorGrupo[0])];

  try {
    const { data, error } = await supabase.from('field_inspections').insert(rows).select();
    if (error || !data) {
      return { success: false, error: error?.message || 'No se pudieron guardar las inspecciones.' };
    }

    const inspections = data.map(mapRow);

    let nonConformityCreated = false;
    if (input.estado === 'Rechazado' && inspections[0]) {
      const first = inspections[0];
      const result = await createNonConformity({
        title: `NC AUTOMÁTICA: RECHAZO EN ${first.areaProceso}`.toUpperCase(),
        processArea: first.areaProceso,
        projectReference: first.op,
        description: `Hallazgo generado automáticamente por inspección rechazada. Defecto: ${first.defecto}. Observación: ${first.observacion || ''}`,
        sourceFieldInspectionId: first.id
      });
      nonConformityCreated = result.success;
    }

    return { success: true, inspections, nonConformityCreated };
  } catch (err: any) {
    console.warn('⚠️ Error guardando inspecciones de campo:', err?.message || err);
    return { success: false, error: err?.message || 'Error desconocido.' };
  }
}

/** Carga masiva (Excel) — inserta N filas ya validadas por el cliente, sin expandir rangos de plano. */
export async function bulkCreateFieldInspections(
  inputs: FieldInspectionInput[],
  createdBy?: string
): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, count: 0, error: 'Supabase no está configurado.' };
  if (inputs.length === 0) return { success: false, count: 0, error: 'No hay filas para insertar.' };

  // Defensa adicional a la validación del cliente: nunca insertar en
  // silencio una fila sin OP ni Área (síntoma de un archivo mal mapeado).
  const withoutOpOrArea = inputs.filter(i => !i.op?.trim() || !i.areaProceso?.trim()).length;
  if (withoutOpOrArea > 0) {
    return {
      success: false,
      count: 0,
      error: `${withoutOpOrArea} de ${inputs.length} fila(s) no tienen OP o Área — probablemente el archivo no se mapeó correctamente. Ninguna fila fue insertada.`
    };
  }

  const rows = inputs.map(input => toDbRow(input, undefined, createdBy));

  // Sin límite de filas: se inserta en lotes para que un archivo grande no
  // falle por el tamaño de un único INSERT (parámetros de Postgres, tiempo
  // de respuesta). Si un lote falla a mitad de camino, se informa cuántas
  // filas sí quedaron guardadas en vez de fingir que no pasó nada.
  let inserted = 0;
  try {
    for (let i = 0; i < rows.length; i += BULK_INSERT_CHUNK_SIZE) {
      const chunk = rows.slice(i, i + BULK_INSERT_CHUNK_SIZE);
      const { error } = await supabase.from('field_inspections').insert(chunk);
      if (error) {
        return {
          success: inserted > 0,
          count: inserted,
          error: inserted > 0
            ? `${error.message} (se insertaron ${inserted} de ${rows.length} filas antes del error).`
            : error.message
        };
      }
      inserted += chunk.length;
    }
    return { success: true, count: inserted };
  } catch (err: any) {
    return { success: inserted > 0, count: inserted, error: err?.message || 'Error desconocido.' };
  }
}

export async function getFieldInspections(filters?: { estado?: string; areaProceso?: string; limit?: number }): Promise<FieldInspection[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    let query = supabase.from('field_inspections').select('*').order('created_at', { ascending: false }).limit(filters?.limit || 500);
    if (filters?.estado) query = query.eq('estado', filters.estado);
    if (filters?.areaProceso) query = query.eq('area_proceso', filters.areaProceso);

    const { data, error } = await query;
    if (error) {
      console.warn('⚠️ No se pudieron cargar las inspecciones de campo:', error.message);
      return [];
    }
    return (data || []).map(mapRow);
  } catch (err: any) {
    console.warn('⚠️ Error cargando inspecciones de campo:', err?.message || err);
    return [];
  }
}

export async function getFieldInspectionById(id: string): Promise<FieldInspection | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from('field_inspections').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapRow(data);
}

export async function updateFieldInspection(
  id: string,
  input: FieldInspectionInput
): Promise<{ success: boolean; inspection?: FieldInspection; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  // La edición actúa sobre un único registro ya existente — "Cant. Total"
  // debe ser un solo número aquí (la sintaxis de varias cantidades por
  // grupo solo aplica al crear varios planos en un mismo envío).
  if (String(input.cantTotal ?? '').includes(',')) {
    return { success: false, error: 'Al editar un registro, "Cant. Total" debe ser un solo número.' };
  }

  const patch = toDbRow(input, input.planoOpc);
  delete (patch as any).created_by;
  (patch as any).updated_at = new Date().toISOString();

  try {
    const { data, error } = await supabase.from('field_inspections').update(patch).eq('id', id).select().single();
    if (error || !data) return { success: false, error: error?.message || 'No se pudo actualizar.' };
    return { success: true, inspection: mapRow(data) };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error desconocido.' };
  }
}

export async function deleteFieldInspections(ids: string[]): Promise<{ success: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase || ids.length === 0) return { success: false };

  const { error } = await supabase.from('field_inspections').delete().in('id', ids);
  if (error) {
    console.warn('⚠️ No se pudieron eliminar las inspecciones:', error.message);
    return { success: false };
  }
  return { success: true };
}

const SEARCHABLE_COLUMNS = ['op', 'plano_opc', 'area_proceso', 'diseno_referencia', 'responsable', 'reviso', 'defecto'];

/**
 * Borra TODOS los registros que coincidan con `search` (mismos campos que el
 * buscador del CRM), o toda la tabla si `search` viene vacío — a diferencia
 * de deleteFieldInspections, no depende de los ids ya cargados en el
 * navegador (limitados a 500 por getFieldInspections).
 */
export async function deleteFieldInspectionsMatching(search?: string): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, count: 0, error: 'Supabase no está configurado.' };

  try {
    const idSet = new Set<string>();
    const trimmed = search?.trim();

    if (!trimmed) {
      const { data, error } = await supabase.from('field_inspections').select('id');
      if (error) return { success: false, count: 0, error: error.message };
      (data || []).forEach((row: any) => idSet.add(row.id));
    } else {
      const pattern = `%${trimmed}%`;
      for (const column of SEARCHABLE_COLUMNS) {
        const { data, error } = await supabase.from('field_inspections').select('id').ilike(column, pattern);
        if (error) return { success: false, count: 0, error: error.message };
        (data || []).forEach((row: any) => idSet.add(row.id));
      }
    }

    const ids = Array.from(idSet);
    if (ids.length === 0) return { success: true, count: 0 };

    for (let i = 0; i < ids.length; i += BULK_INSERT_CHUNK_SIZE) {
      const chunk = ids.slice(i, i + BULK_INSERT_CHUNK_SIZE);
      const { error } = await supabase.from('field_inspections').delete().in('id', chunk);
      if (error) return { success: false, count: i, error: `${error.message} (se eliminaron ${i} de ${ids.length} antes del error).` };
    }
    return { success: true, count: ids.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || 'Error desconocido.' };
  }
}

const playbackUrlCache = new Map<string, { url: string; expiresAtMs: number }>();

/**
 * URL firmada reutilizable para la foto de una inspección — mismo patrón
 * que Principal/Videos: se cachea en memoria mientras no esté por vencer,
 * para que el navegador pueda servirla desde su caché en vez de volver a
 * descargarla cada vez.
 */
export async function getFieldInspectionPhotoUrl(inspection: FieldInspection): Promise<string | null> {
  if (!inspection.photoStoragePath) return null;

  const cached = playbackUrlCache.get(inspection.photoStoragePath);
  if (cached && cached.expiresAtMs > Date.now() + PHOTO_URL_REUSE_MARGIN_MS) return cached.url;

  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(inspection.photoStoragePath, PHOTO_URL_TTL_SECONDS);
  if (error || !data) return null;

  playbackUrlCache.set(inspection.photoStoragePath, { url: data.signedUrl, expiresAtMs: Date.now() + PHOTO_URL_TTL_SECONDS * 1000 });
  return data.signedUrl;
}
