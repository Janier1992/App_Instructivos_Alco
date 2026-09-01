import { NextRequest, NextResponse } from 'next/server';
import { updateQualityTask, deleteQualityTask, QualityTaskStatus } from '@/src/lib/qualityTasksStore';

const VALID_STATUSES: QualityTaskStatus[] = ['pendiente', 'en_progreso', 'hecha'];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const body = await request.json();
    if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });
    }

    const result = await updateQualityTask(id, body);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo actualizar la tarea.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, task: result.task });
  } catch (err: any) {
    console.error('Error actualizando tarea de Calidad:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await deleteQualityTask(id);
  if (!result.success) {
    return NextResponse.json({ error: 'No se pudo eliminar la tarea.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
