import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/src/lib/adminAuth';
import { getInspectionForms, createInspectionForm } from '@/src/lib/inspectionFormsStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export async function GET(request: NextRequest) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const processSlug = request.nextUrl.searchParams.get('processSlug');
  if (!processSlug) {
    return NextResponse.json({ error: 'Se requiere processSlug.' }, { status: 400 });
  }

  const forms = await getInspectionForms(processSlug);
  return NextResponse.json({ success: true, forms });
}

export async function POST(request: NextRequest) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  try {
    const { processSlug, title, embedUrl, recordsEmbedUrl, displayOrder } = await request.json();

    if (typeof processSlug !== 'string' || !processSlug || !title?.trim() || !embedUrl?.trim()) {
      return NextResponse.json({ error: 'Se requiere processSlug, título y URL de embed.' }, { status: 400 });
    }

    const result = await createInspectionForm({
      processSlug,
      title,
      embedUrl,
      recordsEmbedUrl,
      displayOrder,
      createdBy: auth.session.sub
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo crear el formulario.' }, { status: 500 });
    }

    await recordAuditEvent({
      adminUserId: auth.session.sub,
      adminEmail: auth.session.email,
      action: 'create',
      entityType: 'inspection_form',
      entityId: result.form?.id,
      metadata: { processSlug, title: title.trim() }
    });

    return NextResponse.json({ success: true, form: result.form });
  } catch (err: any) {
    console.error('Error creando formulario de inspección:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
