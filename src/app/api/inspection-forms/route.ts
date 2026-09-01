import { NextRequest, NextResponse } from 'next/server';
import { getInspectionForms } from '@/src/lib/inspectionFormsStore';

// Pública — formularios de inspección embebidos de un proceso (ver pestaña
// "Formularios" en ProcessDetail). La gestión de la lista (título + URL de
// embed) se hace desde el CRM.
export async function GET(request: NextRequest) {
  const processSlug = request.nextUrl.searchParams.get('processSlug');
  if (!processSlug) {
    return NextResponse.json({ error: 'Se requiere processSlug.' }, { status: 400 });
  }

  const forms = await getInspectionForms(processSlug);
  return NextResponse.json({ success: true, forms });
}
