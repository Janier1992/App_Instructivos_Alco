import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/src/lib/supabaseService';
import { extractCotasFromSheetImage } from '@/src/lib/matrixSheetExtraction';
import { checkProfileShapeMatch } from '@/src/lib/matrixInspectionVision';

const BUCKET = 'matrix-analysis-temp';

// Dos llamadas de visión de Gemini en paralelo — puede tardar varios
// segundos.
export const maxDuration = 30;

/**
 * Validación de Ficha de Matriz, sin ningún registro persistente: recibe
 * la referencia de las dos fotos ya subidas a Storage (ver upload-url),
 * las analiza (cotas/tolerancias de la ficha + chequeo de forma del
 * perfil) y borra ambos archivos al terminar con éxito — nada queda
 * guardado, ni en base de datos ni en Storage.
 *
 * La ficha puede llegar aquí reutilizada de una llamada anterior (el
 * cliente la sube una sola vez, al inicio, para que la cámara en vivo del
 * perfil pueda compararse contra ella en /live-check) — si el análisis
 * falla (ej. el proveedor de visión no responde) solo se borra la foto
 * del perfil, que siempre es una subida fresca; la ficha se conserva para
 * que un reintento no tenga que volver a subirla ni pierda el chequeo en
 * vivo ya hecho contra ella.
 */
export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase no está configurado.' }, { status: 500 });

  const { sheetStoragePath, sheetContentType, profileStoragePath, profileContentType } = await request.json();

  if (!sheetStoragePath || !profileStoragePath) {
    return NextResponse.json({ error: 'Se requiere la foto de la ficha y la foto del perfil.' }, { status: 400 });
  }

  const removeProfileOnly = () => supabase.storage.from(BUCKET).remove([profileStoragePath]).catch(() => {});

  try {
    const [sheetDownload, profileDownload] = await Promise.all([
      supabase.storage.from(BUCKET).download(sheetStoragePath),
      supabase.storage.from(BUCKET).download(profileStoragePath)
    ]);

    if (sheetDownload.error || !sheetDownload.data) {
      await removeProfileOnly();
      return NextResponse.json({ error: 'No se pudo leer la foto de la ficha desde Storage.' }, { status: 500 });
    }
    if (profileDownload.error || !profileDownload.data) {
      await removeProfileOnly();
      return NextResponse.json({ error: 'No se pudo leer la foto del perfil desde Storage.' }, { status: 500 });
    }

    const sheetBuffer = Buffer.from(await sheetDownload.data.arrayBuffer());
    const profileBuffer = Buffer.from(await profileDownload.data.arrayBuffer());

    const [extraction, shapeCheck] = await Promise.all([
      extractCotasFromSheetImage(sheetBuffer, sheetContentType || 'image/jpeg'),
      checkProfileShapeMatch(profileBuffer, profileContentType || 'image/jpeg', sheetBuffer, sheetContentType || 'image/jpeg')
    ]);

    // Éxito: ya no se necesita ninguna de las dos fotos.
    await supabase.storage.from(BUCKET).remove([sheetStoragePath, profileStoragePath]).catch(() => {});
    return NextResponse.json({ success: true, sheet: extraction, shapeCheck });
  } catch (err: any) {
    console.error('Error en análisis de validación de matriz:', err);
    await removeProfileOnly();
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
