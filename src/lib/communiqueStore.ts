import { getSupabaseClient } from './supabaseService';
import type { PhotoMeta } from './photoMarks';
import { SUPPLIER_CLAIM_PHOTO_BUCKET } from './supplierClaimsStore';

export type CommuniqueKind = 'comunicado' | 'procedimiento' | 'divulgacion';

export interface CommuniqueStep {
  titulo: string;
  detalle: string;
}

export interface CommuniqueSigner {
  nombre: string;
  cargo: string;
}

export interface Communique {
  id: string;
  processSlug: string;
  tipo: CommuniqueKind;
  fecha: string;
  de: string;
  para: string;
  asunto: string;
  contexto: string;
  intro: string | null;
  pasos: CommuniqueStep[];
  cierre: string | null;
  firmantes: CommuniqueSigner[];
  fotoPaths: string[];
  /** Pie de foto y marcas por imagen, indexado por la ruta en Storage. */
  fotoMeta: Record<string, PhotoMeta>;
  createdAt: string;
}

export interface CommuniqueInput {
  tipo?: CommuniqueKind;
  fecha: string;
  de: string;
  para: string;
  asunto: string;
  contexto: string;
  intro?: string;
  pasos?: CommuniqueStep[];
  cierre?: string;
  firmantes?: CommuniqueSigner[];
  fotoPaths?: string[];
  fotoMeta?: Record<string, PhotoMeta>;
}

export function normalizeKind(value: unknown): CommuniqueKind {
  return value === 'procedimiento' || value === 'divulgacion' ? value : 'comunicado';
}

/** Devuelve el mensaje de error de validación, o null si el comunicado es válido. */
export function validateCommuniqueInput(body: Partial<CommuniqueInput>): string | null {
  if (!body.de?.trim() || !body.para?.trim() || !body.asunto?.trim()) return 'Se requiere De, Para y Asunto.';
  if (!body.contexto?.trim() && !body.intro?.trim()) return 'Describe qué se comunica (el cambio, la mejora o el producto nuevo) o adjunta un borrador.';
  return null;
}

function mapRow(row: any): Communique {
  return {
    id: row.id,
    processSlug: row.process_slug,
    tipo: normalizeKind(row.tipo),
    fecha: row.fecha,
    de: row.de,
    para: row.para,
    asunto: row.asunto,
    contexto: row.contexto,
    intro: row.intro || null,
    pasos: Array.isArray(row.pasos) ? row.pasos : [],
    cierre: row.cierre || null,
    firmantes: Array.isArray(row.firmantes) ? row.firmantes : [],
    fotoPaths: row.foto_paths || [],
    fotoMeta: row.foto_meta && typeof row.foto_meta === 'object' ? row.foto_meta : {},
    createdAt: row.created_at
  };
}

function toDbRow(input: CommuniqueInput) {
  return {
    process_slug: 'control-calidad',
    tipo: normalizeKind(input.tipo),
    fecha: input.fecha || new Date().toISOString().split('T')[0],
    de: input.de.trim(),
    para: input.para.trim(),
    asunto: input.asunto.trim(),
    contexto: (input.contexto || '').trim(),
    intro: input.intro?.trim() || null,
    pasos: input.pasos || [],
    cierre: input.cierre?.trim() || null,
    firmantes: input.firmantes || [],
    foto_paths: input.fotoPaths || [],
    foto_meta: input.fotoMeta || {}
  };
}

type Result = { success: boolean; communique?: Communique; error?: string };

/** Todos los comunicados, del más reciente al más antiguo. Lanza el error si falla la consulta. */
export async function getCommuniques(): Promise<Communique[]> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { data, error } = await supabase.from('communiques').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(`No se pudieron cargar los comunicados: ${error.message}`);
  return (data || []).map(mapRow);
}

export async function createCommunique(input: CommuniqueInput): Promise<Result> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };
  const { data, error } = await supabase.from('communiques').insert(toDbRow(input)).select().single();
  if (error || !data) return { success: false, error: error?.message || 'No se pudo guardar el comunicado.' };
  return { success: true, communique: mapRow(data) };
}

export async function updateCommunique(id: string, input: CommuniqueInput): Promise<Result> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };
  const patch = { ...toDbRow(input), updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from('communiques').update(patch).eq('id', id).select().single();
  if (error || !data) return { success: false, error: error?.message || 'No se pudo actualizar el comunicado.' };
  return { success: true, communique: mapRow(data) };
}

/** Elimina el comunicado y sus imágenes y documentos de Storage. */
export async function deleteCommunique(id: string): Promise<{ success: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false };

  const { data: row } = await supabase.from('communiques').select('foto_paths, documentos').eq('id', id).maybeSingle();
  const { error } = await supabase.from('communiques').delete().eq('id', id);
  if (error) {
    console.warn('⚠️ No se pudo eliminar el comunicado:', error.message);
    return { success: false };
  }

  // Los documentos de referencia ya no se guardan; esto limpia los de comunicados creados antes de ese cambio.
  const docPaths = (Array.isArray(row?.documentos) ? row.documentos : []).map((d: { path: string }) => d.path);
  const paths = [...(row?.foto_paths || []), ...docPaths];
  if (paths.length > 0) await supabase.storage.from(SUPPLIER_CLAIM_PHOTO_BUCKET).remove(paths);
  return { success: true };
}
