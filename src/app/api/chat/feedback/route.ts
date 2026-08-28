import { NextRequest, NextResponse } from 'next/server';
import { recordChatFeedback } from '@/src/lib/chatFeedbackStore';

// Pública, sin autenticación — igual que /api/chat: el colaborador de planta
// no tiene cuenta. El único dato que puede enviar es un 👍/👎 y un comentario
// corto opcional, sobre una respuesta que ya recibió.
export async function POST(request: NextRequest) {
  try {
    const { processSlug, question, reply, classification, escalationRequired, rating, comment } = await request.json();

    if (!processSlug || !question || !reply || (rating !== 'up' && rating !== 'down')) {
      return NextResponse.json({ error: 'Se requiere processSlug, question, reply y rating ("up" o "down").' }, { status: 400 });
    }
    if (typeof comment === 'string' && comment.length > 500) {
      return NextResponse.json({ error: 'El comentario es demasiado largo (máximo 500 caracteres).' }, { status: 400 });
    }

    const saved = await recordChatFeedback({
      processSlug,
      question,
      reply,
      classification,
      escalationRequired,
      rating,
      comment
    });

    return NextResponse.json({ success: true, persisted: saved });
  } catch (err: any) {
    console.error('Error registrando retroalimentación del chat:', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
