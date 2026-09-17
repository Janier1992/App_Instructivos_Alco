import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/src/lib/supabaseService';
import { checkProfileShapeMatch } from '@/src/lib/matrixInspectionVision';

const BUCKET = 'matrix-analysis-temp';

// Un solo chequeo de forma (no dos llamadas de visión en paralelo como el
// análisis completo) — se llama repetidamente mientras el inspector apunta
// la cámara, así que debe responder rápido.
export const maxDuration = 15;

/**
 * Chequeo EN VIVO de la Validación de Ficha de Matriz: recibe un cuadro de
 * la cámara (ya comprimido a JPEG en el cliente) y lo compara contra la
 * ficha de matriz que ya se subió a Storage al inicio del flujo (ver
 * upload-url + ProcessMatrixValidationPanel) — se llama repetidamente
 * mientras el inspector apunta la cámara al corte transversal del perfil,
 * para darle una señal en vivo de si ya está encuadrando el perfil
 * correcto antes de capturar la foto final. No borra la ficha de Storage
 * (se sigue usando en la próxima llamada); eso lo hace el análisis final
 * en /api/matrix-analysis.
 */
export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase no está configurado.' }, { status: 500 });

  const { frameBase64, sheetStoragePath, sheetContentType } = await request.json();
  if (!frameBase64 || !sheetStoragePath) {
    return NextResponse.json({ error: 'Se requiere el cuadro de la cámara y la ficha ya cargada.' }, { status: 400 });
  }

  try {
    const sheetDownload = await supabase.storage.from(BUCKET).download(sheetStoragePath);
    if (sheetDownload.error || !sheetDownload.data) {
      return NextResponse.json({ error: 'No se pudo leer la foto de la ficha desde Storage.' }, { status: 500 });
    }
    const sheetBuffer = Buffer.from(await sheetDownload.data.arrayBuffer());
    const frameBuffer = Buffer.from(frameBase64, 'base64');

    const shapeCheck = await checkProfileShapeMatch(frameBuffer, 'image/jpeg', sheetBuffer, sheetContentType || 'image/jpeg');
    return NextResponse.json({ success: true, shapeCheck });
  } catch (err: any) {
    console.error('Error en chequeo en vivo de validación de matriz:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
