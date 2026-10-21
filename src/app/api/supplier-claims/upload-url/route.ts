import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/src/lib/supabaseService';
import { SUPPLIER_CLAIM_PHOTO_BUCKET } from '@/src/lib/supplierClaimsStore';

/** Pública — signed upload URL para subir las fotos del informe directo a Storage (evita el límite de tamaño de la función). */
export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase no está configurado en el servidor.' }, { status: 500 });

  try {
    const { fileName } = await request.json();
    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json({ error: 'Se requiere el nombre del archivo.' }, { status: 400 });
    }

    const extension = /\.(jpe?g|png|webp)$/i.test(fileName) ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase() : '.jpg';
    const storagePath = `claim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`;

    const { data, error } = await supabase.storage.from(SUPPLIER_CLAIM_PHOTO_BUCKET).createSignedUploadUrl(storagePath);
    if (error || !data) return NextResponse.json({ error: error?.message || 'No se pudo generar el enlace de carga.' }, { status: 500 });

    return NextResponse.json({ success: true, storagePath, token: data.token });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
