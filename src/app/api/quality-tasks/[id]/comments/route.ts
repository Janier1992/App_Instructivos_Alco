import { NextRequest, NextResponse } from 'next/server';
import { getTaskComments, addTaskComment } from '@/src/lib/qualityTaskCommentsStore';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const comments = await getTaskComments(id);
  return NextResponse.json({ success: true, comments });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const { authorName, commentText } = await request.json();
    if (!authorName?.trim() || !commentText?.trim()) {
      return NextResponse.json({ error: 'Se requiere tu nombre y el comentario.' }, { status: 400 });
    }

    const result = await addTaskComment({ taskId: id, authorName, commentText });
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo guardar el comentario.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, comment: result.comment });
  } catch (err: any) {
    console.error('Error guardando comentario de tarea:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
