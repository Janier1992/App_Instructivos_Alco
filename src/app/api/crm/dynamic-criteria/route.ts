import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/src/lib/adminAuth';
import { createDynamicCriterion } from '@/src/lib/dynamicCriteriaStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

// "Cerrar el ciclo": convierte la resolución de una escalación en un
// criterio de aceptación/rechazo nuevo, visible de inmediato en la
// Documentación del Proceso y en el Agente de IA — ver dynamicCriteriaStore.ts.
export async function POST(request: NextRequest) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { processSlug, parameter, acceptance, rejection, requiredAction, sourceQuestion, sourceFeedbackId } = body;

    if (
      typeof processSlug !== 'string' || !processSlug ||
      !parameter?.trim() || !acceptance?.trim() || !rejection?.trim() || !requiredAction?.trim()
    ) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos (proceso, parámetro, aceptación, rechazo, acción requerida).' },
        { status: 400 }
      );
    }

    const result = await createDynamicCriterion({
      processSlug,
      parameter,
      acceptance,
      rejection,
      requiredAction,
      sourceQuestion,
      sourceFeedbackId,
      createdBy: auth.session.sub
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo crear el criterio.' }, { status: 500 });
    }

    await recordAuditEvent({
      adminUserId: auth.session.sub,
      adminEmail: auth.session.email,
      action: 'create',
      entityType: 'dynamic_criterion',
      entityId: result.criterion?.id,
      metadata: { processSlug, parameter: parameter.trim() }
    });

    return NextResponse.json({ success: true, criterion: result.criterion });
  } catch (err: any) {
    console.error('Error creando criterio dinámico:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
