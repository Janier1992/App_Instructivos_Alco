import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/src/lib/adminAuth';
import { getSupabaseClient } from '@/src/lib/supabaseService';

const PROCESS_VIDEOS_BUCKET = 'process-videos';

/**
 * Genera una signed upload URL de Supabase Storage para que el navegador
 * suba el archivo de video directo, sin pasar por esta función serverless
 * — las funciones de Vercel rechazan requests de más de 4.5 MB antes de que
 * lleguen al código de la ruta, y prácticamente todo video supera eso. El
 * token que devuelve Storage solo autoriza subir a esta ruta puntual, no da
 * acceso general al bucket.
 */
export async function POST(request: NextRequest) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase no está configurado en el servidor.' }, { status: 500 });
  }

  try {
    const { fileName, processSlug } = await request.json();
    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json({ error: 'Se requiere el nombre del archivo.' }, { status: 400 });
    }

    const docId = `vid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const extension = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '.mp4';
    const storagePath = `${processSlug || 'general'}/${docId}${extension}`;

    const { data, error } = await supabase.storage.from(PROCESS_VIDEOS_BUCKET).createSignedUploadUrl(storagePath);
    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'No se pudo generar el enlace de carga.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      docId,
      storagePath,
      signedUrl: data.signedUrl,
      token: data.token
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
