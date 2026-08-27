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
    const { processSlug, question, history } = await request.json();
    if (!processSlug || !question) {
      return NextResponse.json({ error: 'Se requiere processSlug y question' }, { status: 400 });
    }

    const result = await processQualityQueryServer(processSlug, question, history || []);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error en /api/chat:', err);
    return NextResponse.json(
      { error: 'Error procesando la consulta RAG', details: err?.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
