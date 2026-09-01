import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/src/lib/adminAuth';
import { getCompetencies, upsertCompetency } from '@/src/lib/collaboratorCompetenciesStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

// Roster de competencia verificada del equipo (marco ILUO) por proceso —
// ver collaboratorCompetenciesStore.ts.
export async function GET(request: NextRequest) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const processSlug = request.nextUrl.searchParams.get('processSlug');
  if (!processSlug) {
    return NextResponse.json({ error: 'Se requiere processSlug.' }, { status: 400 });
  }

  const competencies = await getCompetencies(processSlug);
  return NextResponse.json({ success: true, competencies });
}

export async function POST(request: NextRequest) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  try {
    const { processSlug, collaboratorName, iluoLevel, notes } = await request.json();

    if (!processSlug || !collaboratorName?.trim() || !['I', 'L', 'U', 'O'].includes(iluoLevel)) {
      return NextResponse.json({ error: 'Faltan campos requeridos o nivel ILUO inválido.' }, { status: 400 });
    }

    const result = await upsertCompetency({
      processSlug,
      collaboratorName,
      iluoLevel,
      notes,
      updatedBy: auth.session.sub
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo guardar.' }, { status: 500 });
    }

    await recordAuditEvent({
      adminUserId: auth.session.sub,
      adminEmail: auth.session.email,
      action: 'update',
      entityType: 'collaborator_competency',
      entityId: result.competency?.id,
      metadata: { processSlug, collaboratorName: collaboratorName.trim(), iluoLevel }
    });

    return NextResponse.json({ success: true, competency: result.competency });
  } catch (err: any) {
    console.error('Error guardando competencia:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
