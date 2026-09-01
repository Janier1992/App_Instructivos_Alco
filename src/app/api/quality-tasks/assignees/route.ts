import { NextRequest, NextResponse } from 'next/server';
import { getTaskAssignees } from '@/src/lib/qualityTaskAssigneesStore';

// Pública — historial de nombres usados como "Responsable" en tareas de
// este proceso, para autocompletar el campo en vez de escribir de cero.
export async function GET(request: NextRequest) {
  const processSlug = request.nextUrl.searchParams.get('processSlug');
  if (!processSlug) {
    return NextResponse.json({ error: 'Se requiere processSlug.' }, { status: 400 });
  }

  const assignees = await getTaskAssignees(processSlug);
  return NextResponse.json({ success: true, assignees });
}
