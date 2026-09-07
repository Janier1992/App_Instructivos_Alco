import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/src/lib/supabaseService';

const BUCKET = 'matrix-analysis-temp';

/**
 * Signed upload URL pública (sin cuenta de usuario) para subir la foto de
 * la ficha o del perfil directo a Storage — el archivo es solo un
 * intermediario temporal para que el servidor pueda leerlo y analizarlo;
 * /api/matrix-analysis lo borra apenas termina, no queda ningún registro.
 */
export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase no está configurado en el servidor.' }, { status: 500 });
  }

  try {
    const { fileName } = await request.json();
    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json({ error: 'Se requiere el nombre del archivo.' }, { status: 400 });
    }

    const id = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const extension = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '.jpg';
    const storagePath = `${id}${extension}`;

    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(storagePath);
    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'No se pudo generar el enlace de carga.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, storagePath, signedUrl: data.signedUrl, token: data.token });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
