import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/src/lib/supabaseService';
import { SUPPLIER_CLAIM_PHOTO_BUCKET } from '@/src/lib/supplierClaimsStore';

const PATH_PATTERN = /^claim-[\w-]+\.(jpe?g|png|webp)$/;

/**
 * Pública — entrega una foto del informe desde el mismo origen de la app.
 * Se sirve aquí (y no con redirect a la URL firmada) para que el PDF, que se
 * arma en el navegador, pueda leer la imagen sin problemas de CORS.
 */
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path') || '';
  if (!PATH_PATTERN.test(path)) return NextResponse.json({ error: 'Ruta de foto inválida.' }, { status: 400 });

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase no está configurado.' }, { status: 500 });

  const { data, error } = await supabase.storage.from(SUPPLIER_CLAIM_PHOTO_BUCKET).download(path);
  if (error || !data) return NextResponse.json({ error: 'Foto no encontrada.' }, { status: 404 });

  return new NextResponse(await data.arrayBuffer(), {
    headers: { 'Content-Type': data.type || 'image/jpeg', 'Cache-Control': 'private, max-age=3600' }
  });
}
