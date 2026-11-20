import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/src/lib/supabaseService';
import { normalizeKind } from '@/src/lib/communiqueStore';
import { generateCommuniqueDraft } from '@/src/lib/communiqueAi';
import { downloadFile, loadReferenceDocuments, mimeFromPath, parseDocumentRequests } from '@/src/lib/communiqueDocuments';

export const maxDuration = 60;

const PHOTO_PATTERN = /^claim-[\w-]+\.(jpe?g|png|webp)$/;
const MAX_IMAGES_FOR_AI = 4;

const strings = (value: unknown, max: number): string[] => (Array.isArray(value) ? value.filter((v: unknown): v is string => typeof v === 'string').slice(0, max) : []);

/** Borrador actual del formulario (texto ya escrito o generado), con topes de tamaño. */
function cleanDraft(raw: any): { intro: string; pasos: { titulo: string; detalle: string }[]; cierre: string } | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const text = (value: unknown, max: number) => (typeof value === 'string' ? value.slice(0, max) : '');
  return {
    intro: text(raw.intro, 4000),
    pasos: (Array.isArray(raw.pasos) ? raw.pasos : []).slice(0, 12).map((p: any) => ({ titulo: text(p?.titulo, 300), detalle: text(p?.detalle, 1500) })),
    cierre: text(raw.cierre, 500)
  };
}

/**
 * Pública — redacta el comunicado con Gemini a partir de lo que describe el colaborador, las imágenes ya subidas y los
 * documentos adjuntos (ficha técnica o borrador), que se leen una vez y se borran de Storage: no se guardan.
 */
export async function POST(request: NextRequest) {
  try {
    const { tipo, de, para, asunto, contexto, fotoPaths, piesFotos, documentos, borrador } = await request.json();
    const docRequests = parseDocumentRequests(documentos);
    const hasStarter = docRequests.some(d => d.rol === 'borrador') || Boolean(borrador?.intro?.trim());
    if (!de?.trim() || !para?.trim() || !asunto?.trim() || (!contexto?.trim() && !hasStarter)) {
      return NextResponse.json({ error: 'Se requiere De, Para, Asunto y lo que se comunica (o un borrador adjunto).' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const photoPaths = strings(fotoPaths, MAX_IMAGES_FOR_AI).filter(p => PHOTO_PATTERN.test(p));
    const pies = strings(piesFotos, MAX_IMAGES_FOR_AI);

    const [imageFiles, loaded] = supabase
      ? await Promise.all([Promise.all(photoPaths.map(async path => ({ buffer: await downloadFile(supabase, path), mimeType: mimeFromPath(path) }))), loadReferenceDocuments(supabase, docRequests)])
      : [[], { documents: [], omitidos: [] }];
    const images = imageFiles.filter((i): i is { buffer: Buffer; mimeType: string } => i.buffer !== null);

    // Qué fuentes leyó realmente la IA: se muestra en el formulario para que el colaborador sepa si su adjunto se tuvo en cuenta.
    const fuentes = { documentosLeidos: loaded.documents.map(d => d.nombre), documentosOmitidos: loaded.omitidos, imagenes: images.length };

    const draft = await generateCommuniqueDraft({
      tipo: normalizeKind(tipo), de, para, asunto, contexto: contexto || '',
      piesFotos: photoPaths.map((_, i) => pies[i] || ''),
      images, documents: loaded.documents, borrador: cleanDraft(borrador)
    });
    return NextResponse.json({ success: true, draft, fuentes });
  } catch (err: any) {
    console.error('Error generando comunicado:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
