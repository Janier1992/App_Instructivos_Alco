import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { getCustomRagDocumentsFresh } from '@/src/lib/customRagStore';
import { RAG_DOCUMENT_TYPE_ORDER, RagDocumentType } from '@/src/lib/ragDocumentTypes';

export async function GET(request: NextRequest) {
  await ensureHydrated();
  const processSlug = request.nextUrl.searchParams.get('processSlug') || undefined;
  const type = request.nextUrl.searchParams.get('type');

  let docs = await getCustomRagDocumentsFresh(processSlug);

  // Filtro opcional por categoría (ej. type=instructivo para la vista de
  // Instructivos de Control).
  if (type && RAG_DOCUMENT_TYPE_ORDER.includes(type as RagDocumentType)) {
    docs = docs.filter(d => d.documentType === type);
  }

  return NextResponse.json({ success: true, documents: docs, total: docs.length });
}
