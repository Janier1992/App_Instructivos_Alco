import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { processQualityQueryServer } from '@/src/lib/geminiClient';

// El agente puede tardar hasta ~40s en el peor caso (Gemini agotando su
// propio timeout + respaldo OpenRouter agotando el suyo, antes de caer al
// respaldo determinístico) — se amplía el límite por defecto con margen
// para no cortar respuestas válidas a mitad de camino.
export const maxDuration = 50;

export async function POST(request: NextRequest) {
  await ensureHydrated();

  try {
    const { processSlug, question, history, imageBase64, imageMimeType } = await request.json();
    if (!processSlug || (!question && !imageBase64)) {
      return NextResponse.json({ error: 'Se requiere processSlug y question (o una foto adjunta)' }, { status: 400 });
    }

    const image = imageBase64 && imageMimeType ? { base64: imageBase64, mimeType: imageMimeType } : undefined;
    const effectiveQuestion = question?.trim() || 'Evalúa la pieza o condición que se ve en la foto adjunta según los criterios de aceptación/rechazo de este proceso.';

    const result = await processQualityQueryServer(processSlug, effectiveQuestion, history || [], undefined, image);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error en /api/chat:', err);
    return NextResponse.json(
      { error: 'Error procesando la consulta RAG', details: err?.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
