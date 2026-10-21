import { getSupabaseClient } from './supabaseService';

export const SUPPLIER_CLAIM_PHOTO_BUCKET = 'supplier-claim-photos';

export interface SupplierClaimRejectItem {
  cantidad: number;
  acabado: string;
  medidaMm: string;
}

export interface SupplierClaimAction {
  titulo: string;
  detalle: string;
}

export interface SupplierClaim {
  id: string;
  processSlug: string;
  fechaInforme: string;
  proveedor: string;
  materiaPrima: string;
  referencias: string;
  lotes: string | null;
  defectoTitulo: string | null;
  observacionInspector: string;
  descripcionNc: string | null;
  observacionesTecnicas: string[];
  accionesCorrectivas: SupplierClaimAction[];
  rechazoItems: SupplierClaimRejectItem[];
  fotoEtiquetaPaths: string[];
  fotoDefectoPaths: string[];
  realizadoPor: string;
  cargo: string | null;
  createdAt: string;
}

export interface SupplierClaimInput {
  fechaInforme: string;
  proveedor: string;
  materiaPrima: string;
  referencias: string;
  lotes?: string;
  defectoTitulo?: string;
  observacionInspector: string;
  descripcionNc?: string;
  observacionesTecnicas?: string[];
  accionesCorrectivas?: SupplierClaimAction[];
  rechazoItems?: SupplierClaimRejectItem[];
  fotoEtiquetaPaths?: string[];
  fotoDefectoPaths?: string[];
  realizadoPor: string;
  cargo?: string;
}

/** Devuelve el mensaje de error de validación, o null si el informe es válido. */
export function validateClaimInput(body: Partial<SupplierClaimInput>): string | null {
  if (!body.proveedor?.trim() || !body.materiaPrima?.trim() || !body.referencias?.trim()) {
    return 'Se requiere proveedor, materia prima/insumo y referencia.';
  }
  if (!body.observacionInspector?.trim()) return 'Describe la novedad encontrada en la inspección.';
  if (!body.realizadoPor?.trim()) return 'Se requiere el nombre de quien realizó la inspección.';
  return null;
}

function mapRow(row: any): SupplierClaim {
  return {
    id: row.id,
    processSlug: row.process_slug,
    fechaInforme: row.fecha_informe,
    proveedor: row.proveedor,
    materiaPrima: row.materia_prima,
    referencias: row.referencias,
    lotes: row.lotes || null,
    defectoTitulo: row.defecto_titulo || null,
    observacionInspector: row.observacion_inspector,
    descripcionNc: row.descripcion_nc || null,
    observacionesTecnicas: Array.isArray(row.observaciones_tecnicas) ? row.observaciones_tecnicas : [],
    accionesCorrectivas: Array.isArray(row.acciones_correctivas) ? row.acciones_correctivas : [],
    rechazoItems: Array.isArray(row.rechazo_items) ? row.rechazo_items : [],
    fotoEtiquetaPaths: row.foto_etiqueta_paths || [],
    fotoDefectoPaths: row.foto_defecto_paths || [],
    realizadoPor: row.realizado_por,
    cargo: row.cargo || null,
    createdAt: row.created_at
  };
}

function toDbRow(input: SupplierClaimInput) {
  return {
    process_slug: 'control-calidad',
    fecha_informe: input.fechaInforme || new Date().toISOString().split('T')[0],
    proveedor: input.proveedor.trim().toUpperCase(),
    materia_prima: input.materiaPrima.trim(),
    referencias: input.referencias.trim().toUpperCase(),
    lotes: input.lotes?.trim() || null,
    defecto_titulo: input.defectoTitulo?.trim() || null,
    observacion_inspector: input.observacionInspector.trim(),
    descripcion_nc: input.descripcionNc?.trim() || null,
    observaciones_tecnicas: input.observacionesTecnicas || [],
    acciones_correctivas: input.accionesCorrectivas || [],
    rechazo_items: input.rechazoItems || [],
    foto_etiqueta_paths: input.fotoEtiquetaPaths || [],
    foto_defecto_paths: input.fotoDefectoPaths || [],
    realizado_por: input.realizadoPor.trim(),
    cargo: input.cargo?.trim() || null
  };
}

export async function getSupplierClaims(limit = 200): Promise<SupplierClaim[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from('supplier_claims').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) {
    console.warn('⚠️ No se pudieron cargar los reclamos a proveedores (¿corriste db/migrate_add_supplier_claims.sql?):', error.message);
    return [];
  }
  return (data || []).map(mapRow);
}

export async function createSupplierClaim(input: SupplierClaimInput): Promise<{ success: boolean; claim?: SupplierClaim; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  const { data, error } = await supabase.from('supplier_claims').insert(toDbRow(input)).select().single();
  if (error || !data) return { success: false, error: error?.message || 'No se pudo guardar el informe.' };
  return { success: true, claim: mapRow(data) };
}

export async function updateSupplierClaim(id: string, input: SupplierClaimInput): Promise<{ success: boolean; claim?: SupplierClaim; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  const patch = { ...toDbRow(input), updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from('supplier_claims').update(patch).eq('id', id).select().single();
  if (error || !data) return { success: false, error: error?.message || 'No se pudo actualizar el informe.' };
  return { success: true, claim: mapRow(data) };
}

/** Elimina el informe y sus fotos de Storage. */
export async function deleteSupplierClaim(id: string): Promise<{ success: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false };

  const { data: row } = await supabase.from('supplier_claims').select('foto_etiqueta_paths, foto_defecto_paths').eq('id', id).maybeSingle();
  const { error } = await supabase.from('supplier_claims').delete().eq('id', id);
  if (error) {
    console.warn('⚠️ No se pudo eliminar el reclamo a proveedor:', error.message);
    return { success: false };
  }

  const paths = [...(row?.foto_etiqueta_paths || []), ...(row?.foto_defecto_paths || [])];
  if (paths.length > 0) await supabase.storage.from(SUPPLIER_CLAIM_PHOTO_BUCKET).remove(paths);
  return { success: true };
}
