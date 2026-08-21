import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { createComment, getApprovedComments } from '@/src/lib/commentsStore';

// Pública, solo aprobados — los pendientes/rechazados no se exponen aquí.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureHydrated();
  const { id } = await params;
  const comments = await getApprovedComments(id);
  return NextResponse.json({ success: true, comments, total: comments.length });
}

// Pública, sin cuenta de usuario: cualquiera puede comentar dando su nombre.
// El comentario nace oculto ('pending') hasta que un Administrador lo
// aprueba desde /crm/comentarios.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureHydrated();
  const { id } = await params;

  try {
    const { authorName, commentText } = await request.json();

    if (!authorName || typeof authorName !== 'string' || !authorName.trim()) {
      return NextResponse.json({ error: 'Se requiere tu nombre.' }, { status: 400 });
    }
    if (!commentText || typeof commentText !== 'string' || !commentText.trim()) {
      return NextResponse.json({ error: 'Se requiere el texto del comentario.' }, { status: 400 });
    }
    if (commentText.trim().length > 2000) {
      return NextResponse.json({ error: 'El comentario es demasiado largo (máximo 2000 caracteres).' }, { status: 400 });
    }

    const result = await createComment(id, authorName, commentText);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo enviar el comentario.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Tu comentario fue enviado y quedará visible una vez sea aprobado.',
      comment: result.comment
    });
  } catch (err: any) {
    console.error('Error creando comentario:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
