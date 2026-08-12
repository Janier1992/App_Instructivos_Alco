import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { getCustomRagDocumentById, getPdfFileBuffer } from '@/src/lib/customRagStore';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureHydrated();
  const { id } = await params;
  const doc = getCustomRagDocumentById(id);
  if (!doc) {
    return NextResponse.json({ error: 'Documento no encontrado.' }, { status: 404 });
  }

  const buffer = await getPdfFileBuffer(doc);
  if (!buffer) {
    return NextResponse.json(
      { error: 'Este documento no tiene el archivo original guardado. Vuelve a subirlo para poder visualizarlo en PDF.' },
      { status: 404 }
    );
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${encodeURIComponent(doc.fileName)}"`
    }
  });
}
