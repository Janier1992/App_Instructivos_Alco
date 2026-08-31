import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { requireSession } from '@/src/lib/adminAuth';
import { getImprovementsForCrm } from '@/src/lib/processImprovementsStore';

export async function GET(request: NextRequest) {
  await ensureHydrated();

  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const processSlug = request.nextUrl.searchParams.get('processSlug') || undefined;
  const improvements = await getImprovementsForCrm(processSlug);
  return NextResponse.json({ success: true, improvements, total: improvements.length });
}
