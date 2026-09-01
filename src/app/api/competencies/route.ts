import { NextRequest, NextResponse } from 'next/server';
import { getCompetencies } from '@/src/lib/collaboratorCompetenciesStore';

// Pública — solo expone quiénes están certificados (nivel U o O del marco
// ILUO) para un proceso, como reconocimiento visible del equipo. El detalle
// completo (incluye a quién le falta capacitación) es privado, solo visible
// en el CRM vía /api/crm/competencies.
export async function GET(request: NextRequest) {
  const processSlug = request.nextUrl.searchParams.get('processSlug');
  if (!processSlug) {
    return NextResponse.json({ error: 'Se requiere processSlug.' }, { status: 400 });
  }

  const all = await getCompetencies(processSlug);
  const certified = all
    .filter(c => c.iluoLevel === 'U' || c.iluoLevel === 'O')
    .map(c => ({ name: c.collaboratorName, level: c.iluoLevel }));

  return NextResponse.json({ success: true, certified });
}
