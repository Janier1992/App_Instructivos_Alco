import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { setAutonomyAssignment } from '@/src/lib/autonomyAssignmentsStore';

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string; level: string }> }) {
  await ensureHydrated();

  try {
    const { slug, level } = await params;
    const { collaboratorName } = await request.json();

    if (typeof collaboratorName !== 'string') {
      return NextResponse.json({ error: 'Se requiere collaboratorName (texto).' }, { status: 400 });
    }

    const decodedLevel = decodeURIComponent(level);
    const result = await setAutonomyAssignment(slug, decodedLevel, collaboratorName);
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
