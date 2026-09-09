import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { requireSession } from '@/src/lib/adminAuth';
import { getMetrologyReplacements, createMetrologyReplacement, MetrologyReplacementInput } from '@/src/lib/metrologyReplacementsStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export async function GET(request: NextRequest) {
  await ensureHydrated();

  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const replacements = await getMetrologyReplacements();
  return NextResponse.json({ success: true, replacements });
}

export async function POST(request: NextRequest) {
  await ensureHydrated();

  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  try {
    const body: MetrologyReplacementInput = await request.json();

    if (!body.nombreEquipo?.trim() || !body.codigo?.trim() || !body.areaUso?.trim() || !body.nombreResponsable?.trim() || !body.motivoReposicion?.trim()) {
      return NextResponse.json({ error: 'Se requiere nombre del equipo, código, área de uso, responsable y motivo de reposición.' }, { status: 400 });
    }

    const result = await createMetrologyReplacement(body, auth.session.sub);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo guardar el registro.' }, { status: 500 });
    }

    await recordAuditEvent({
      adminUserId: auth.session.sub,
      adminEmail: auth.session.email,
      action: 'create',
      entityType: 'metrology_replacement',
      entityId: result.replacement?.id,
      metadata: { equipo: body.nombreEquipo, codigo: body.codigo }
    });

    return NextResponse.json({ success: true, replacement: result.replacement });
  } catch (err: any) {
    console.error('Error creando registro de reposición/baja de Metrología Pro:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
