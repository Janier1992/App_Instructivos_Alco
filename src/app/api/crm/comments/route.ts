import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { requireSession } from '@/src/lib/adminAuth';
import { getCommentsForModeration } from '@/src/lib/commentsStore';

export async function GET(request: NextRequest) {
  await ensureHydrated();

  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const comments = await getCommentsForModeration();
  return NextResponse.json({ success: true, comments, total: comments.length });
}
