import { getSupabaseClient } from './supabaseService';
import { validateSignature } from './communiqueStore';
import { DEFAULT_SESSION, objectiveFromCommunique } from './divulgacionShared';

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
  /** Código del enlace público de registro (/asistencia/<código>); null si falta ejecutar la migración. */
  registroToken: string | null;
  createdAt: string;
}

/** Lo único que ve quien abre el enlace público: el tema de cada divulgación o comunicado reciente, sin datos de ningún asistente. */
export interface DivulgacionPublic {
  /** Identifica la opción en el enlace público (nunca el id interno de la divulgación): el código de una divulgación ya creada, o `comunicado:<id>` si todavía no tiene planilla. */
  token: string;
  procesoArea: string;
  tema: string;
  fecha: string;
  tipo: DivulgacionKind;
  responsable: string;
}

/** Días hacia atrás en los que una divulgación o un comunicado siguen apareciendo en el enlace público de registro. */
export const REGISTRATION_WINDOW_DAYS = 60;
const COMMUNIQUE_PREFIX = 'comunicado:';

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
    registroToken: row.registro_token || null,
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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const toPublic = (row: any): DivulgacionPublic => ({ token: row.registro_token, procesoArea: row.proceso_area || '', tema: row.tema, fecha: row.fecha, tipo: normalizeKind(row.tipo), responsable: row.responsable });

const windowStart = () => new Date(Date.now() - REGISTRATION_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

/** Comunicado reciente que aún no tiene planilla: se ofrece igual, y la planilla se crea sola con el primer registro. */
const communiqueToPublic = (row: any): DivulgacionPublic => ({
  token: `${COMMUNIQUE_PREFIX}${row.id}`,
  procesoArea: DEFAULT_SESSION.procesoArea,
  tema: row.asunto,
  fecha: row.fecha,
  tipo: DEFAULT_SESSION.tipo,
  responsable: DEFAULT_SESSION.responsable
});

/**
 * Opciones del enlace público de registro, de la más reciente a la más antigua: las divulgaciones recientes (puede haber
 * varias planillas de un mismo comunicado, por ejemplo una por proceso) y los comunicados recientes que todavía no tienen
 * planilla. Solo tema, fecha y responsable; nunca datos de los asistentes.
 */
export async function getRecentDivulgacionesPublic(): Promise<DivulgacionPublic[]> {
  const since = windowStart();
  const supabase = client();
  const [sessions, communiques, linked] = await Promise.all([
    supabase.from('divulgaciones').select('*').gte('fecha', since).order('fecha', { ascending: false }).order('created_at', { ascending: false }).limit(40),
    supabase.from('communiques').select('id, asunto, fecha, created_at').gte('fecha', since).order('fecha', { ascending: false }).order('created_at', { ascending: false }).limit(40),
    supabase.from('divulgaciones').select('comunicado_id').not('comunicado_id', 'is', null)
  ]);
  if (sessions.error) throw new Error(`No se pudieron cargar las divulgaciones: ${sessions.error.message}`);
  if (communiques.error) throw new Error(`No se pudieron cargar los comunicados: ${communiques.error.message}`);

  const withSheet = new Set((linked.data || []).map(row => row.comunicado_id));
  const fromSheets = (sessions.data || []).filter(row => row.registro_token).map(toPublic);
  const fromCommuniques = (communiques.data || []).filter(row => !withSheet.has(row.id)).map(communiqueToPublic);
  return [...fromSheets, ...fromCommuniques].sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/** Planilla más antigua de un comunicado, si ya tiene alguna. */
async function firstDivulgacionOfCommunique(supabase: Supabase, communiqueId: string): Promise<string | null> {
  const { data } = await supabase.from('divulgaciones').select('id').eq('comunicado_id', communiqueId).order('created_at', { ascending: true }).limit(1).maybeSingle();
  return data?.id ?? null;
}

/** Crea la planilla de un comunicado con los datos predefinidos (tema, objetivo, responsable, proceso, duración). */
async function createDivulgacionFromCommunique(supabase: Supabase, communiqueId: string): Promise<string | null> {
  const { data: c } = await supabase.from('communiques').select('id, asunto, intro').eq('id', communiqueId).maybeSingle();
  if (!c) return null;
  const input: DivulgacionInput = { fecha: new Date().toISOString().split('T')[0], tema: c.asunto, objetivo: objectiveFromCommunique(c.intro), ...DEFAULT_SESSION, comunicadoId: c.id };
  const { data, error } = await supabase.from('divulgaciones').insert(toDbRow(input)).select('id').single();
  if (error || !data) return null;
  // Si dos personas fueron las primeras al mismo tiempo, se queda una sola planilla: la más antigua.
  const winner = (await firstDivulgacionOfCommunique(supabase, communiqueId)) ?? data.id;
  if (winner !== data.id) await supabase.from('divulgaciones').delete().eq('id', data.id);
  return winner;
}

/** Id interno de la planilla a la que pertenece una opción del enlace público; si es un comunicado sin planilla, la crea. Null si no existe. */
export async function resolveDivulgacionId(token: string): Promise<string | null> {
  const supabase = client();
  if (token.startsWith(COMMUNIQUE_PREFIX)) {
    const communiqueId = token.slice(COMMUNIQUE_PREFIX.length);
    if (!UUID_PATTERN.test(communiqueId)) return null;
    return (await firstDivulgacionOfCommunique(supabase, communiqueId)) ?? (await createDivulgacionFromCommunique(supabase, communiqueId));
  }
  if (!UUID_PATTERN.test(token)) return null;
  const { data } = await supabase.from('divulgaciones').select('id').eq('registro_token', token).maybeSingle();
  return data?.id ?? null;
}

type Result = { success: boolean; divulgacion?: Divulgacion; error?: string };

const asistenteRow = (divulgacionId: string, a: AsistenteInput) => ({
  divulgacion_id: divulgacionId,
  nombre: a.nombre.trim(),
  cedula: a.cedula.trim(),
  proceso_seccion: (a.procesoSeccion || '').trim(),
  firma: a.firma
});

/** Texto del error de la base de datos al registrar asistentes (la cédula repetida se explica en lenguaje claro). */
const asistenteError = (error: { code?: string; message: string }) => (error.code === '23505' ? 'Hay una cédula repetida en la lista de asistentes.' : error.message);

/** Crea la divulgación con las personas que ya se ingresaron en el formulario; si falla el registro de asistentes, no queda una planilla a medias. */
export async function createDivulgacion(input: DivulgacionInput, asistentes: AsistenteInput[] = []): Promise<Result> {
  const supabase = client();
  const { data, error } = await supabase.from('divulgaciones').insert(toDbRow(input)).select().single();
  if (error || !data) return { success: false, error: error?.message || 'No se pudo guardar la divulgación.' };

  if (asistentes.length > 0) {
    const { error: insertError } = await supabase.from('divulgacion_asistentes').insert(asistentes.map(a => asistenteRow(data.id, a)));
    if (insertError) {
      await supabase.from('divulgaciones').delete().eq('id', data.id);
      return { success: false, error: asistenteError(insertError) };
    }
  }
  return { success: true, divulgacion: (await getDivulgacion(data.id)) ?? mapRow(data, []) };
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
  const { error } = await client().from('divulgacion_asistentes').insert(asistenteRow(divulgacionId, input));
  if (error) return { success: false, error: error.code === '23505' ? 'Esa cédula ya está registrada en esta divulgación.' : error.message };
  return { success: true, divulgacion: (await getDivulgacion(divulgacionId)) ?? undefined };
}

export async function deleteAsistente(divulgacionId: string, asistenteId: string): Promise<{ success: boolean; divulgacion?: Divulgacion }> {
  const { error } = await client().from('divulgacion_asistentes').delete().eq('id', asistenteId).eq('divulgacion_id', divulgacionId);
  if (error) return { success: false };
  return { success: true, divulgacion: (await getDivulgacion(divulgacionId)) ?? undefined };
}
