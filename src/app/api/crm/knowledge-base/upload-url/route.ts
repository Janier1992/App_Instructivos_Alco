import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/src/lib/adminAuth';
import { getSupabaseClient } from '@/src/lib/supabaseService';

const BUCKET = 'knowledge-base-source';

/**
 * Genera una signed upload URL de Supabase Storage para que el navegador
 * suba el PDF directo, sin pasar por esta función serverless — las
 * funciones de Vercel rechazan requests de más de 4.5 MB antes de que
 * lleguen al código de la ruta, y los manuales/instructivos de Alco suelen
 * superar eso. El token que devuelve Storage solo autoriza subir a esta
 * ruta puntual, no da acceso general al bucket.
 */
export async function POST(request: NextRequest) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase no está configurado en el servidor.' }, { status: 500 });
  }

  try {
    const { processSlug } = await request.json();
    if (!processSlug || typeof processSlug !== 'string') {
      return NextResponse.json({ error: 'Se requiere processSlug.' }, { status: 400 });
    }

    const docId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // La clave de Storage no admite tildes ni caracteres especiales de un
    // nombre de archivo real — se usa un id generado; el nombre original
    // del PDF se guarda aparte, solo para mostrarlo en la UI.
    const storagePath = `${processSlug}/${docId}.pdf`;

    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(storagePath);
    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'No se pudo generar el enlace de carga.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      storagePath,
      signedUrl: data.signedUrl,
      token: data.token
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
