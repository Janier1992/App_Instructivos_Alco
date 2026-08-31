import { NextRequest, NextResponse } from 'next/server';
import { getTopQuestions } from '@/src/lib/chatQueriesStore';

// Pública, solo lectura — igual que /api/chat: sirve las preguntas más
// repetidas de este proceso para mostrarlas como chips de sugerencia rápida.
export async function GET(request: NextRequest) {
  const processSlug = request.nextUrl.searchParams.get('processSlug');
  if (!processSlug) {
    return NextResponse.json({ error: 'Se requiere el parámetro processSlug.' }, { status: 400 });
  }

  const suggestions = await getTopQuestions(processSlug);
  return NextResponse.json({ success: true, suggestions });
}
