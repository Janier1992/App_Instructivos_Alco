import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/src/lib/supabaseService';
import { SUPPLIER_CLAIM_PHOTO_BUCKET } from '@/src/lib/supplierClaimsStore';

const DOCUMENT_EXTENSION = /\.(pdf|jpe?g|png|webp|txt)$/i;

/** Pública — signed upload URL para subir un documento de referencia (ficha técnica, PDF, imagen o texto) directo a Storage. */
export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase no está configurado en el servidor.' }, { status: 500 });

  try {
    const { fileName } = await request.json();
    if (!fileName || typeof fileName !== 'string' || !DOCUMENT_EXTENSION.test(fileName)) {
      return NextResponse.json({ error: 'Formato no admitido. Adjunta un PDF, una imagen (JPG, PNG, WEBP) o un archivo de texto (TXT).' }, { status: 400 });
    }

    const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
    const storagePath = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`;

    const { data, error } = await supabase.storage.from(SUPPLIER_CLAIM_PHOTO_BUCKET).createSignedUploadUrl(storagePath);
    if (error || !data) return NextResponse.json({ error: error?.message || 'No se pudo generar el enlace de carga.' }, { status: 500 });

    return NextResponse.json({ success: true, storagePath, token: data.token });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
