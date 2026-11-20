import mammoth from 'mammoth';
import { getSupabaseClient } from './supabaseService';
import { SUPPLIER_CLAIM_PHOTO_BUCKET } from './supplierClaimsStore';
import { MAX_REFERENCE_DOCUMENTS, ReferenceRole, normalizeRole } from './communiqueShared';

/**
 * Documentos adjuntos al generar un comunicado (ficha técnica o borrador).
 * Solo sirven para redactar el texto: se suben de forma temporal, se leen una
 * vez y se borran de Storage de inmediato. No se guardan en la base de datos.
 */

type Supabase = NonNullable<ReturnType<typeof getSupabaseClient>>;

export const DOCUMENT_PATTERN = /^ref-[\w-]+\.(pdf|docx|jpe?g|png|webp|txt)$/;
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
// Gemini admite hasta ~20 MB por solicitud: los documentos grandes se omiten en lugar de romper la generación.
export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_CHARS = 30000;

export interface ReferenceDocumentRequest {
  path: string;
  nombre: string;
  rol: ReferenceRole;
}

export interface LoadedDocument {
  buffer: Buffer;
  mimeType: string;
  nombre: string;
  rol: ReferenceRole;
}

export function mimeFromPath(path: string): string {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'docx') return DOCX_MIME;
  if (ext === 'txt') return 'text/plain';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

export function parseDocumentRequests(raw: unknown): ReferenceDocumentRequest[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((d: any) => typeof d?.path === 'string' && DOCUMENT_PATTERN.test(d.path))
    .slice(0, MAX_REFERENCE_DOCUMENTS)
    .map((d: any) => ({ path: d.path, nombre: String(d.nombre || d.path), rol: normalizeRole(d.rol) }));
}

export async function downloadFile(supabase: Supabase, path: string): Promise<Buffer | null> {
  const { data } = await supabase.storage.from(SUPPLIER_CLAIM_PHOTO_BUCKET).download(path);
  return data ? Buffer.from(await data.arrayBuffer()) : null;
}

/** Texto de un documento Word; null si no se puede leer o no tiene texto. */
async function extractDocxText(buffer: Buffer): Promise<Buffer | null> {
  try {
    const { value } = await mammoth.extractRawText({ buffer });
    const text = value.replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_TEXT_CHARS);
    return text ? Buffer.from(text, 'utf-8') : null;
  } catch {
    return null;
  }
}

async function toLoadedDocument(request: ReferenceDocumentRequest, buffer: Buffer | null): Promise<{ document?: LoadedDocument; omitido?: string }> {
  if (!buffer) return { omitido: `${request.nombre} (no se pudo leer)` };
  if (buffer.length > MAX_DOCUMENT_BYTES) return { omitido: `${request.nombre} (pesa más de ${MAX_DOCUMENT_BYTES / 1024 / 1024} MB)` };

  const mimeType = mimeFromPath(request.path);
  if (mimeType !== DOCX_MIME) return { document: { buffer, mimeType, nombre: request.nombre, rol: request.rol } };

  const text = await extractDocxText(buffer);
  return text ? { document: { buffer: text, mimeType: 'text/plain', nombre: request.nombre, rol: request.rol } } : { omitido: `${request.nombre} (no se pudo leer el contenido del Word)` };
}

/** Descarga los adjuntos, los borra de Storage y devuelve su contenido listo para la IA. */
export async function loadReferenceDocuments(supabase: Supabase, requests: ReferenceDocumentRequest[]): Promise<{ documents: LoadedDocument[]; omitidos: string[] }> {
  const downloaded = await Promise.all(requests.map(async request => ({ request, buffer: await downloadFile(supabase, request.path) })));
  if (requests.length > 0) await supabase.storage.from(SUPPLIER_CLAIM_PHOTO_BUCKET).remove(requests.map(r => r.path));

  const results = await Promise.all(downloaded.map(d => toLoadedDocument(d.request, d.buffer)));
  return {
    documents: results.flatMap(r => (r.document ? [r.document] : [])),
    omitidos: results.flatMap(r => (r.omitido ? [r.omitido] : []))
  };
}
