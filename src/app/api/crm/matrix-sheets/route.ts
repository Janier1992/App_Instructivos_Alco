import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { requireSession } from '@/src/lib/adminAuth';
import { createDraftMatrixSheet, getMatrixSheets } from '@/src/lib/matrixSheetsStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

// La extracción de cotas por visión de Gemini puede tardar varios
// segundos por imagen.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  await ensureHydrated();

  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const processSlug = request.nextUrl.searchParams.get('processSlug') || undefined;
  const sheets = await getMatrixSheets(processSlug);
  return NextResponse.json({ success: true, sheets });
}

export async function POST(request: NextRequest) {
  await ensureHydrated();

  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  try {
    // La imagen ya se subió directo a Storage con una signed upload URL
    // (ver /api/crm/matrix-sheets/upload-url) — aquí solo se recibe JSON
    // con la referencia al archivo.
    const body = await request.json();
    const { processSlug, matrixCode, profileName, storagePath, contentType } = body;

    if (!processSlug || !matrixCode?.trim() || !profileName?.trim()) {
      return NextResponse.json({ error: 'Se requiere processSlug, código de matriz y nombre del perfil.' }, { status: 400 });
    }
    if (!storagePath) {
      return NextResponse.json({ error: 'Faltan datos de la imagen cargada.' }, { status: 400 });
    }

    const result = await createDraftMatrixSheet({
      processSlug,
      matrixCode,
      profileName,
      storagePath,
      contentType: contentType || 'image/jpeg',
      createdBy: auth.session.sub
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo crear la ficha.' }, { status: 500 });
    }

    await recordAuditEvent({
      adminUserId: auth.session.sub,
      adminEmail: auth.session.email,
      action: 'create',
      entityType: 'matrix_sheet',
      entityId: result.sheet?.id,
      metadata: { processSlug, matrixCode: matrixCode.trim(), cotasExtraidas: result.sheet?.cotas.length || 0 }
    });

    return NextResponse.json({ success: true, sheet: result.sheet });
  } catch (err: any) {
    console.error('Error creando ficha de matriz:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
