import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { requireSession, requireRole } from '@/src/lib/adminAuth';
import { updateImprovementStatus, deleteImprovement, ImprovementStatus } from '@/src/lib/processImprovementsStore';
import { createCircular, updateCircular } from '@/src/lib/circularesStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

const VALID_STATUSES: ImprovementStatus[] = ['proposed', 'in_review', 'implemented', 'rejected'];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureHydrated();

  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;

  try {
    const { status, adminNote, publishRecognition } = await request.json();
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `status debe ser uno de: ${VALID_STATUSES.join(', ')}.` }, { status: 400 });
    }

    const result = await updateImprovementStatus(id, status, auth.session.sub, adminNote);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo actualizar la propuesta.' }, { status: 500 });
    }

    await recordAuditEvent({
      adminUserId: auth.session.sub,
      adminEmail: auth.session.email,
      action: 'update',
      entityType: 'improvement',
      entityId: id,
      metadata: { status, processSlug: result.improvement!.processSlug, title: result.improvement!.title }
    });

    // Reconocimiento público: la primera vez que una propuesta pasa a
    // "implementada" (no en cada guardado posterior), se publica sola una
    // circular en Principal de ese proceso — mismo mecanismo que ya usan
    // las demás publicaciones, solo que disparado desde aquí. Best-effort:
    // si falla, no debe tumbar la actualización de estado que sí funcionó.
    if (result.wasNewlyImplemented && publishRecognition !== false) {
      try {
        const imp = result.improvement!;
        const bodyParts = [
          `Gracias a la propuesta de **${imp.authorName || 'un colaborador'}**${imp.relatedCriterion ? ` sobre "${imp.relatedCriterion}"` : ''}, implementamos esta mejora:`,
          '',
          imp.description
        ];
        if (adminNote?.trim()) {
          bodyParts.push('', `Nota de Calidad: ${adminNote.trim()}`);
        }

        const created = await createCircular({
          title: `💡 Mejora implementada: ${imp.title}`,
          bodyText: bodyParts.join('\n'),
          processSlugs: [imp.processSlug],
          createdBy: auth.session.sub
        });

        if (created.success && created.circular) {
          await updateCircular(created.circular.id, { status: 'published' });
        } else {
          console.warn('⚠️ No se pudo crear el reconocimiento público de la mejora:', created.error);
        }
      } catch (err) {
        console.warn('⚠️ Error publicando reconocimiento de mejora:', err);
      }
    }

    return NextResponse.json({ success: true, improvement: result.improvement });
  } catch (err: any) {
    console.error('Error actualizando propuesta de mejora:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}

// Eliminar es solo de Administrador, igual que el resto de acciones de eliminar en el CRM.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureHydrated();

  const auth = await requireRole(request, ['administrador']);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const deleted = await deleteImprovement(id);
  if (!deleted) {
    return NextResponse.json({ error: 'No se pudo eliminar la propuesta.' }, { status: 500 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'delete',
    entityType: 'improvement',
    entityId: id
  });

  return NextResponse.json({ success: true, message: 'Propuesta eliminada.' });
}
