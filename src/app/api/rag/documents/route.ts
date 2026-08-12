import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { getCustomRagDocuments } from '@/src/lib/customRagStore';

export async function GET(request: NextRequest) {
  await ensureHydrated();
  const processSlug = request.nextUrl.searchParams.get('processSlug') || undefined;
  const docs = getCustomRagDocuments(processSlug);
  return NextResponse.json({ success: true, documents: docs, total: docs.length });
}
