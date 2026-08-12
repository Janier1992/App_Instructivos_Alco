import { NextRequest, NextResponse } from 'next/server';
import {
  PROCESSES,
  QUALITY_CONTROLS,
  ACCEPTANCE_CRITERIA,
  AUTONOMY_MATRIX,
  DOCUMENTS
} from '@/src/data/processesData';
import { ensureHydrated } from '@/src/lib/hydrate';
import { getAutonomyAssignments } from '@/src/lib/autonomyAssignmentsStore';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  await ensureHydrated();
  const { slug } = await params;

  const process = PROCESSES.find(p => p.slug === slug);
  if (!process) {
    return NextResponse.json({ error: 'Proceso no encontrado' }, { status: 404 });
  }

  const docs = DOCUMENTS[slug] || [];
  const controls = QUALITY_CONTROLS[slug] || [];
  const criteria = ACCEPTANCE_CRITERIA[slug] || [];
  const assignments = getAutonomyAssignments(slug);
  const autonomy = (AUTONOMY_MATRIX[slug] || []).map(item => ({
    ...item,
    assignedCollaborator: assignments[item.level] || undefined
  }));

  return NextResponse.json({
    process,
    documents: docs,
    controls,
    criteria,
    autonomy
  });
}
