import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/src/lib/adminAuth';
import { getNonConformities } from '@/src/lib/nonConformitiesStore';

export async function GET(request: NextRequest) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const nonConformities = await getNonConformities();
  return NextResponse.json({ success: true, nonConformities });
}
