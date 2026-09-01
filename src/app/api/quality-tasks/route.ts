import { NextRequest, NextResponse } from 'next/server';
import { getQualityTasks, createQualityTask } from '@/src/lib/qualityTasksStore';

// Pública, sin cuenta de usuario — igual que el Buzón de Mejora y el
// Autocontrol por Turno: el tablero de tareas de Calidad es una
// herramienta operativa de uso diario, no una configuración administrativa.
export async function GET(request: NextRequest) {
  const processSlug = request.nextUrl.searchParams.get('processSlug');
  if (!processSlug) {
    return NextResponse.json({ error: 'Se requiere processSlug.' }, { status: 400 });
  }

  const tasks = await getQualityTasks(processSlug);
  return NextResponse.json({ success: true, tasks });
}

export async function POST(request: NextRequest) {
  try {
    const { processSlug, title, description, assignee, dueDate } = await request.json();

    if (typeof processSlug !== 'string' || !processSlug || !title?.trim()) {
      return NextResponse.json({ error: 'Se requiere processSlug y título.' }, { status: 400 });
    }

    const result = await createQualityTask({ processSlug, title, description, assignee, dueDate });
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo crear la tarea.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, task: result.task });
  } catch (err: any) {
    console.error('Error creando tarea de Calidad:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
