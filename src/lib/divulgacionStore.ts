import { getSupabaseClient } from './supabaseService';
import { validateSignature } from './communiqueStore';

export type DivulgacionKind = 'capacitacion' | 'divulgacion' | 'charla';

export interface DivulgacionAsistente {
  id: string;
  nombre: string;
  cedula: string;
  procesoSeccion: string;
  /** Firma dibujada en la app (PNG en data URL). */
  firma: string | null;
  createdAt: string;
}

export interface Divulgacion {
  id: string;
  processSlug: string;
  fecha: string;
  tema: string;
  objetivo: string;
  responsable: string;
  procesoArea: string;
  duracion: string;
  tipo: DivulgacionKind;
  /** Comunicado del que parte la divulgación, si se eligió uno. */
  comunicadoId: string | null;
  evaluacionDias: string;
  evaluador: string;
  resultados: string;
  /** Filas de asistencia, en el orden en que se registraron. En la lista general viene vacío (solo se cuenta). */
  asistentes: DivulgacionAsistente[];
  asistentesCount: number;
  createdAt: string;
}

export interface DivulgacionInput {
  fecha: string;
  tema: string;
  objetivo?: string;
  responsable: string;
  procesoArea?: string;
  duracion?: string;
  tipo?: DivulgacionKind;
  comunicadoId?: string | null;
  evaluacionDias?: string;
  evaluador?: string;
  resultados?: string;
}

export interface AsistenteInput {
  nombre: string;
  cedula: string;
  procesoSeccion?: string;
  firma: string;
}

type Supabase = NonNullable<ReturnType<typeof getSupabaseClient>>;

export function normalizeKind(value: unknown): DivulgacionKind {
  return value === 'capacitacion' || value === 'charla' ? value : 'divulgacion';
}

export function validateDivulgacionInput(body: Partial<DivulgacionInput>): string | null {
  if (!body.tema?.trim() || !body.responsable?.trim()) return 'Se requiere el tema y el responsable del tema.';
  return null;
}

export function validateAsistenteInput(body: Partial<AsistenteInput>): string | null {
  if (!body.nombre?.trim() || !body.cedula?.trim()) return 'Se requiere el nombre y la cédula.';
  if (!body.firma) return 'Falta la firma.';
  return validateSignature(body.firma);
}

function mapAsistente(row: any): DivulgacionAsistente {
  return { id: row.id, nombre: row.nombre, cedula: row.cedula, procesoSeccion: row.proceso_seccion || '', firma: row.firma || null, createdAt: row.created_at };
}

function mapRow(row: any, asistentes: DivulgacionAsistente[], count = asistentes.length): Divulgacion {
  return {
    id: row.id,
    processSlug: row.process_slug,
    fecha: row.fecha,
    tema: row.tema,
    objetivo: row.objetivo || '',
    responsable: row.responsable,
    procesoArea: row.proceso_area || '',
    duracion: row.duracion || '',
    tipo: normalizeKind(row.tipo),
    comunicadoId: row.comunicado_id || null,
    evaluacionDias: row.evaluacion_dias || '',
    evaluador: row.evaluador || '',
    resultados: row.resultados || '',
    asistentes,
    asistentesCount: count,
    createdAt: row.created_at
  };
}

function toDbRow(input: DivulgacionInput) {
  return {
    process_slug: 'control-calidad',
    fecha: input.fecha || new Date().toISOString().split('T')[0],
    tema: input.tema.trim(),
    objetivo: (input.objetivo || '').trim(),
    responsable: input.responsable.trim(),
    proceso_area: (input.procesoArea || '').trim(),
    duracion: (input.duracion || '').trim(),
    tipo: normalizeKind(input.tipo),
    comunicado_id: input.comunicadoId || null,
    evaluacion_dias: (input.evaluacionDias || '').trim(),
    evaluador: (input.evaluador || '').trim(),
    resultados: (input.resultados || '').trim()
  };
}

function client(): Supabase {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase no está configurado.');
  return supabase;
}

/** Todas las divulgaciones, de la más reciente a la más antigua, con su número de asistentes (sin firmas, para que la lista sea liviana). */
export async function getDivulgaciones(): Promise<Divulgacion[]> {
  const supabase = client();
  const [{ data, error }, { data: counts }] = await Promise.all([
    supabase.from('divulgaciones').select('*').order('created_at', { ascending: false }),
    supabase.from('divulgacion_asistentes').select('divulgacion_id')
  ]);
  if (error) throw new Error(`No se pudieron cargar las divulgaciones: ${error.message}`);
  const countById = new Map<string, number>();
  (counts || []).forEach((row: any) => countById.set(row.divulgacion_id, (countById.get(row.divulgacion_id) || 0) + 1));
  return (data || []).map(row => mapRow(row, [], countById.get(row.id) || 0));
}

/** Una divulgación con todas sus filas de asistencia y firmas. */
export async function getDivulgacion(id: string): Promise<Divulgacion | null> {
  const supabase = client();
  const { data: row } = await supabase.from('divulgaciones').select('*').eq('id', id).maybeSingle();
  if (!row) return null;
  const { data: attendees } = await supabase.from('divulgacion_asistentes').select('*').eq('divulgacion_id', id).order('created_at', { ascending: true });
  return mapRow(row, (attendees || []).map(mapAsistente));
}

type Result = { success: boolean; divulgacion?: Divulgacion; error?: string };

export async function createDivulgacion(input: DivulgacionInput): Promise<Result> {
  const { data, error } = await client().from('divulgaciones').insert(toDbRow(input)).select().single();
  if (error || !data) return { success: false, error: error?.message || 'No se pudo guardar la divulgación.' };
  return { success: true, divulgacion: mapRow(data, []) };
}

export async function updateDivulgacion(id: string, input: DivulgacionInput): Promise<Result> {
  const { data, error } = await client().from('divulgaciones').update({ ...toDbRow(input), updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error || !data) return { success: false, error: error?.message || 'No se pudo actualizar la divulgación.' };
  return { success: true, divulgacion: (await getDivulgacion(id)) ?? mapRow(data, []) };
}

/** Elimina la divulgación; sus filas de asistencia se borran en cascada. */
export async function deleteDivulgacion(id: string): Promise<{ success: boolean }> {
  const { error } = await client().from('divulgaciones').delete().eq('id', id);
  if (error) console.warn('⚠️ No se pudo eliminar la divulgación:', error.message);
  return { success: !error };
}

/** Registra la fila de un asistente. Una misma cédula se registra una sola vez por divulgación. */
export async function addAsistente(divulgacionId: string, input: AsistenteInput): Promise<{ success: boolean; divulgacion?: Divulgacion; error?: string }> {
  const { error } = await client().from('divulgacion_asistentes').insert({
    divulgacion_id: divulgacionId,
    nombre: input.nombre.trim(),
    cedula: input.cedula.trim(),
    proceso_seccion: (input.procesoSeccion || '').trim(),
    firma: input.firma
  });
  if (error) return { success: false, error: error.code === '23505' ? 'Esa cédula ya está registrada en esta divulgación.' : error.message };
  return { success: true, divulgacion: (await getDivulgacion(divulgacionId)) ?? undefined };
}

export async function deleteAsistente(divulgacionId: string, asistenteId: string): Promise<{ success: boolean; divulgacion?: Divulgacion }> {
  const { error } = await client().from('divulgacion_asistentes').delete().eq('id', asistenteId).eq('divulgacion_id', divulgacionId);
  if (error) return { success: false };
  return { success: true, divulgacion: (await getDivulgacion(divulgacionId)) ?? undefined };
}
