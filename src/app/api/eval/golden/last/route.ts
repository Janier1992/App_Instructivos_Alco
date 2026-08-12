import { NextResponse } from 'next/server';
import { getLastGoldenEvalResult } from '@/src/lib/goldenEvalCache';

export async function GET() {
  const last = getLastGoldenEvalResult();
  return NextResponse.json(last ? { hasRun: true, ...last } : { hasRun: false });
}
