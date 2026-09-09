import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { requireSession } from '@/src/lib/adminAuth';
import { getMetrologyCalibrations, createMetrologyCalibration, MetrologyCalibrationInput } from '@/src/lib/metrologyCalibrationsStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export async function GET(request: NextRequest) {
  await ensureHydrated();

  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const calibrations = await getMetrologyCalibrations();
  return NextResponse.json({ success: true, calibrations });
}

export async function POST(request: NextRequest) {
  await ensureHydrated();

  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  try {
    const body: MetrologyCalibrationInput = await request.json();

    if (!body.tool?.trim() || !body.code?.trim()) {
      return NextResponse.json({ error: 'Se requiere el nombre del instrumento y el código interno.' }, { status: 400 });
    }

    const result = await createMetrologyCalibration(body, auth.session.sub);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo guardar el instrumento.' }, { status: 500 });
    }

    await recordAuditEvent({
      adminUserId: auth.session.sub,
      adminEmail: auth.session.email,
      action: 'create',
      entityType: 'metrology_calibration',
      entityId: result.calibration?.id,
      metadata: { tool: body.tool, code: body.code }
    });

    return NextResponse.json({ success: true, calibration: result.calibration });
  } catch (err: any) {
    console.error('Error creando instrumento de calibración de Metrología Pro:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
