import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/src/lib/supabaseService';
import { SUPPLIER_CLAIM_PHOTO_BUCKET } from '@/src/lib/supplierClaimsStore';

const DOCUMENT_EXTENSION = /\.(pdf|docx|jpe?g|png|webp|txt)$/i;
const TEMP_FILE_TTL_MS = 60 * 60 * 1000;

type Supabase = NonNullable<ReturnType<typeof getSupabaseClient>>;

/**
 * Los adjuntos de un comunicado son temporales: la generación los borra al leerlos. Si una generación se
 * interrumpe antes de borrarlos, este barrido elimina los que superen una hora para que no se acumulen.
 */
async function removeStaleTempFiles(supabase: Supabase): Promise<void> {
  try {
    const { data } = await supabase.storage.from(SUPPLIER_CLAIM_PHOTO_BUCKET).list('', { search: 'ref-', limit: 100 });
    const stale = (data || [])
      .filter(file => {
        const createdAt = Number(/^ref-(\d+)-/.exec(file.name)?.[1]);
        return createdAt && Date.now() - createdAt > TEMP_FILE_TTL_MS;
      })
      .map(file => file.name);
    if (stale.length > 0) await supabase.storage.from(SUPPLIER_CLAIM_PHOTO_BUCKET).remove(stale);
  } catch {
    /* el barrido es de mantenimiento: si falla no debe impedir la carga */
  }
}

/** Pública — signed upload URL para subir un adjunto temporal (ficha técnica o borrador: PDF, Word, imagen o texto) directo a Storage. */
export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase no está configurado en el servidor.' }, { status: 500 });

  try {
    const { fileName } = await request.json();
    if (!fileName || typeof fileName !== 'string' || !DOCUMENT_EXTENSION.test(fileName)) {
      return NextResponse.json({ error: 'Formato no admitido. Adjunta un PDF, un Word (DOCX), una imagen (JPG, PNG, WEBP) o un archivo de texto (TXT).' }, { status: 400 });
    }

    await removeStaleTempFiles(supabase);
    const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
    const storagePath = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`;

    const { data, error } = await supabase.storage.from(SUPPLIER_CLAIM_PHOTO_BUCKET).createSignedUploadUrl(storagePath);
    if (error || !data) return NextResponse.json({ error: error?.message || 'No se pudo generar el enlace de carga.' }, { status: 500 });

    return NextResponse.json({ success: true, storagePath, token: data.token });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
