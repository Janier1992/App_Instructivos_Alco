import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/src/lib/supabaseService';
import { readCaliperDisplay } from '@/src/lib/matrixInspectionVision';

const BUCKET = 'matrix-inspection-photos';

/**
 * Lee el número mostrado en la foto de la pantalla de un calibrador ya
 * subida a Storage — el inspector siempre puede corregir el valor
 * detectado antes de enviar la inspección, esto solo le ahorra digitarlo.
 */
export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase no está configurado.' }, { status: 500 });

  try {
    const { storagePath, contentType } = await request.json();
    if (!storagePath) return NextResponse.json({ error: 'Se requiere storagePath.' }, { status: 400 });

    const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
    if (error || !data) {
      return NextResponse.json({ error: 'No se pudo leer la imagen desde Storage.' }, { status: 500 });
    }
    const buffer = Buffer.from(await data.arrayBuffer());
    const value = await readCaliperDisplay(buffer, contentType || 'image/jpeg');

    return NextResponse.json({ success: true, value });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
