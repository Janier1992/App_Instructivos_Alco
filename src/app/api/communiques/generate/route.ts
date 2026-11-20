import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/src/lib/supabaseService';
import { SUPPLIER_CLAIM_PHOTO_BUCKET } from '@/src/lib/supplierClaimsStore';
import { normalizeKind } from '@/src/lib/communiqueStore';
import { MAX_REFERENCE_DOCUMENTS } from '@/src/lib/communiqueShared';
import { generateCommuniqueDraft } from '@/src/lib/communiqueAi';

export const maxDuration = 60;

const PHOTO_PATTERN = /^claim-[\w-]+\.(jpe?g|png|webp)$/;
const DOCUMENT_PATTERN = /^ref-[\w-]+\.(pdf|jpe?g|png|webp|txt)$/;
const MAX_IMAGES_FOR_AI = 4;
// Gemini admite hasta ~20 MB por solicitud: los documentos grandes se omiten en lugar de romper la generación.
const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

function mimeFromPath(path: string): string {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'txt') return 'text/plain';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

async function download(supabase: NonNullable<ReturnType<typeof getSupabaseClient>>, path: string): Promise<Buffer | null> {
  const { data } = await supabase.storage.from(SUPPLIER_CLAIM_PHOTO_BUCKET).download(path);
  return data ? Buffer.from(await data.arrayBuffer()) : null;
}

const strings = (value: unknown, max: number): string[] => (Array.isArray(value) ? value.filter((v: unknown): v is string => typeof v === 'string').slice(0, max) : []);

/** Pública — redacta el comunicado con Gemini a partir de lo que describe el colaborador, las imágenes y los documentos de referencia ya subidos. */
export async function POST(request: NextRequest) {
  try {
    const { tipo, de, para, asunto, contexto, fotoPaths, piesFotos, documentos } = await request.json();
    if (!de?.trim() || !para?.trim() || !asunto?.trim() || !contexto?.trim()) {
      return NextResponse.json({ error: 'Se requiere De, Para, Asunto y lo que se comunica.' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const photoPaths = strings(fotoPaths, MAX_IMAGES_FOR_AI).filter(p => PHOTO_PATTERN.test(p));
    const pies = strings(piesFotos, MAX_IMAGES_FOR_AI);
    const docList: { path: string; nombre: string }[] = Array.isArray(documentos)
      ? documentos.filter((d: any) => typeof d?.path === 'string' && DOCUMENT_PATTERN.test(d.path)).slice(0, MAX_REFERENCE_DOCUMENTS).map((d: any) => ({ path: d.path, nombre: String(d.nombre || d.path) }))
      : [];

    const images = supabase
      ? (await Promise.all(photoPaths.map(async path => ({ buffer: await download(supabase, path), mimeType: mimeFromPath(path) })))).filter((i): i is { buffer: Buffer; mimeType: string } => i.buffer !== null)
      : [];
    const documents = supabase
      ? (await Promise.all(docList.map(async d => ({ buffer: await download(supabase, d.path), mimeType: mimeFromPath(d.path), nombre: d.nombre }))))
          .filter((d): d is { buffer: Buffer; mimeType: string; nombre: string } => d.buffer !== null && d.buffer.length <= MAX_DOCUMENT_BYTES)
      : [];

    const draft = await generateCommuniqueDraft({
      tipo: normalizeKind(tipo), de, para, asunto, contexto,
      piesFotos: photoPaths.map((_, i) => pies[i] || ''),
      images, documents
    });
    return NextResponse.json({ success: true, draft });
  } catch (err: any) {
    console.error('Error generando comunicado:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
