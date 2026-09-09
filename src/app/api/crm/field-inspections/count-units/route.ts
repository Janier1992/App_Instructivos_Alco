import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/src/lib/adminAuth';
import { getSupabaseClient } from '@/src/lib/supabaseService';
import { countStackedUnits } from '@/src/lib/fieldInspectionVision';

const BUCKET = 'field-inspection-photos';

export const maxDuration = 30;

/** Cuenta unidades apiladas en una foto ya subida a Storage (ver upload-url). */
export async function POST(request: NextRequest) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase no está configurado.' }, { status: 500 });

  const { storagePath, contentType } = await request.json();
  if (!storagePath) return NextResponse.json({ error: 'Se requiere storagePath.' }, { status: 400 });

  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error || !data) {
    return NextResponse.json({ error: 'No se pudo leer la foto desde Storage.' }, { status: 500 });
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const result = await countStackedUnits(buffer, contentType || 'image/jpeg');
  if (!result) {
    return NextResponse.json({ error: 'No se pudo completar el conteo por IA. Intenta de nuevo.' }, { status: 502 });
  }

  return NextResponse.json({ success: true, result });
}
