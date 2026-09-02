import { NextRequest, NextResponse } from 'next/server';
import { createSelfCertification } from '@/src/lib/selfCertificationsStore';

// Pública, sin cuenta de usuario — el colaborador certifica su propia
// unidad con su nombre. La autorización real (nivel U/O del roster ILUO)
// se verifica en el servidor, nunca se confía en el cliente.
export async function POST(request: NextRequest) {
  try {
    const { processSlug, orderReference, collaboratorName, results, notes } = await request.json();

    if (
      typeof processSlug !== 'string' || !processSlug ||
      typeof orderReference !== 'string' || !orderReference.trim() ||
      typeof collaboratorName !== 'string' || !collaboratorName.trim() ||
      !Array.isArray(results) || results.length === 0 ||
      !results.every((r: any) => typeof r?.criterionId === 'string' && typeof r?.parameter === 'string' && typeof r?.passed === 'boolean')
    ) {
      return NextResponse.json({ error: 'Datos de autocertificación incompletos o inválidos.' }, { status: 400 });
    }

    const result = await createSelfCertification({ processSlug, orderReference, collaboratorName, results, notes });
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo registrar la autocertificación.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, certification: result.certification });
  } catch (err: any) {
    console.error('Error creando autocertificación:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
