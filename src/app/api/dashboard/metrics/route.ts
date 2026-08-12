import { NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { getRagCoverageMetrics } from '@/src/lib/customRagStore';

export async function GET() {
  await ensureHydrated();
  return NextResponse.json(getRagCoverageMetrics());
}
