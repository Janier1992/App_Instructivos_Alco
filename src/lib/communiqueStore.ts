import { getSupabaseClient } from './supabaseService';
import type { PhotoMeta } from './photoMarks';
import { SUPPLIER_CLAIM_PHOTO_BUCKET } from './supplierClaimsStore';

export type CommuniqueKind = 'comunicado' | 'procedimiento';

export interface CommuniqueStep {
  titulo: string;
  detalle: string;
}

export interface CommuniqueSigner {
  nombre: string;
  cargo: string;
  /** Firma dibujada en la app (imagen PNG en data URL). Solo se cambia con la acción de firmar, no al editar el comunicado. */
  firma?: string;
  firmadoEn?: string;
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
  /** true cuando el contenido cambió después de firmar: se descartan las firmas para que no avalen un texto distinto. */
  resetFirmas?: boolean;
}

export function normalizeKind(value: unknown): CommuniqueKind {
  return value === 'procedimiento' ? value : 'comunicado';
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

/** Conserva las firmas ya registradas (por nombre y cargo) en la lista de firmantes que llega del formulario. */
function keepSignatures(incoming: CommuniqueSigner[], saved: CommuniqueSigner[]): CommuniqueSigner[] {
  return incoming.map(({ nombre, cargo }) => {
    const match = saved.find(s => s.firma && s.nombre === nombre && s.cargo === cargo);
    return match ? { nombre, cargo, firma: match.firma, firmadoEn: match.firmadoEn } : { nombre, cargo };
  });
}

export async function updateCommunique(id: string, input: CommuniqueInput): Promise<Result> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  // Las firmas no se aceptan desde el formulario: se conservan las guardadas, salvo que el contenido haya cambiado.
  const { data: current } = await supabase.from('communiques').select('firmantes').eq('id', id).maybeSingle();
  const saved: CommuniqueSigner[] = Array.isArray(current?.firmantes) ? current.firmantes : [];
  const firmantes = input.resetFirmas ? (input.firmantes || []).map(({ nombre, cargo }) => ({ nombre, cargo })) : keepSignatures(input.firmantes || [], saved);
  const patch = { ...toDbRow({ ...input, firmantes }), updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from('communiques').update(patch).eq('id', id).select().single();
  if (error || !data) return { success: false, error: error?.message || 'No se pudo actualizar el comunicado.' };
  return { success: true, communique: mapRow(data) };
}

const SIGNATURE_PATTERN = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;
// Una firma dibujada pesa pocos KB; el tope evita que se guarde una imagen cualquiera en la base de datos.
export const MAX_SIGNATURE_CHARS = 60000;

export function validateSignature(firma: unknown): string | null {
  if (firma === null) return null;
  if (typeof firma !== 'string' || !SIGNATURE_PATTERN.test(firma)) return 'La firma no es válida.';
  return firma.length > MAX_SIGNATURE_CHARS ? 'La firma es demasiado grande.' : null;
}

/** Registra (o quita, con null) la firma de un solo firmante sin tocar el resto del comunicado ni las firmas de los demás. */
export async function signCommunique(id: string, index: number, firma: string | null): Promise<Result> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  const { data: row } = await supabase.from('communiques').select('*').eq('id', id).maybeSingle();
  if (!row) return { success: false, error: 'No se encontró el comunicado.' };
  const firmantes: CommuniqueSigner[] = Array.isArray(row.firmantes) ? [...row.firmantes] : [];
  if (!Number.isInteger(index) || index < 0 || index >= firmantes.length) return { success: false, error: 'No se encontró al firmante.' };

  const { firma: _anterior, firmadoEn: _fecha, ...signer } = firmantes[index];
  firmantes[index] = firma ? { ...signer, firma, firmadoEn: new Date().toISOString() } : signer;

  const { data, error } = await supabase.from('communiques').update({ firmantes, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error || !data) return { success: false, error: error?.message || 'No se pudo guardar la firma.' };
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
