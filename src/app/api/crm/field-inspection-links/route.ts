import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/src/lib/adminAuth';
import { getFieldInspectionLinks, createFieldInspectionLink } from '@/src/lib/fieldInspectionLinksStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export async function GET(request: NextRequest) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const links = await getFieldInspectionLinks();
  return NextResponse.json({ success: true, links });
}

export async function POST(request: NextRequest) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { title, url, description, color, displayOrder } = await request.json();
  if (!title?.trim() || !url?.trim()) {
    return NextResponse.json({ error: 'Se requiere título y URL.' }, { status: 400 });
  }

  const result = await createFieldInspectionLink({ title, url, description, color, displayOrder });
  if (!result.success) {
    return NextResponse.json({ error: result.error || 'No se pudo crear el enlace.' }, { status: 500 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'create',
    entityType: 'field_inspection_link',
    entityId: result.link?.id,
    metadata: { title }
  });

  return NextResponse.json({ success: true, link: result.link });
}
