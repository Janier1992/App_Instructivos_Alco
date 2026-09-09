import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/src/lib/supabaseService';

const BUCKET = 'field-inspection-photos';

/**
 * Pública — signed upload URL para que cualquier colaborador registre la
 * evidencia fotográfica desde el módulo de Control Calidad, sin pasar por
 * el CRM. Mismo patrón que la versión del CRM (src/app/api/crm/field-inspections/upload-url).
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

    const id = `insp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
