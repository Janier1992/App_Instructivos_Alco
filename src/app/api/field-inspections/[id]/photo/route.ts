import { NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { getFieldInspectionById, getFieldInspectionPhotoUrl } from '@/src/lib/fieldInspectionsStore';

/**
 * Pública — redirige a una URL firmada de Storage en vez de descargar el
 * archivo aquí, igual que en Principal y Videos.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureHydrated();
  const { id } = await params;

  const inspection = await getFieldInspectionById(id);
  if (!inspection) {
    return NextResponse.json({ error: 'Inspección no encontrada.' }, { status: 404 });
  }

  const playbackUrl = await getFieldInspectionPhotoUrl(inspection);
  if (!playbackUrl) {
    return NextResponse.json({ error: 'Esta inspección no tiene foto adjunta.' }, { status: 404 });
  }

  return NextResponse.redirect(playbackUrl);
}
