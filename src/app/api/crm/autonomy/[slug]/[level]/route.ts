import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { requireSession } from '@/src/lib/adminAuth';
import { setAutonomyAssignment } from '@/src/lib/autonomyAssignmentsStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string; level: string }> }) {
  await ensureHydrated();

  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  try {
    const { slug, level } = await params;
    const { collaboratorName } = await request.json();

    if (typeof collaboratorName !== 'string') {
      return NextResponse.json({ error: 'Se requiere collaboratorName (texto).' }, { status: 400 });
    }

    const decodedLevel = decodeURIComponent(level);
    const result = await setAutonomyAssignment(slug, decodedLevel, collaboratorName);

    await recordAuditEvent({
      adminUserId: auth.session.sub,
      adminEmail: auth.session.email,
      action: 'update',
      entityType: 'autonomy_assignment',
      entityId: `${slug}/${decodedLevel}`,
      metadata: { processSlug: slug, level: decodedLevel, collaboratorName: collaboratorName.trim() }
    });

    return NextResponse.json({
      success: result.success,
      persistedToSupabase: result.persistedToSupabase,
      assignedCollaborator: collaboratorName.trim()
    });
  } catch (err: any) {
    console.error('Error guardando asignación de autonomía:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
