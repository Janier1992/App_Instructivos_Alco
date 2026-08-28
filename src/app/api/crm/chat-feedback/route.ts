import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/src/lib/adminAuth';
import { getChatFeedback, getChatFeedbackSummary } from '@/src/lib/chatFeedbackStore';

export async function GET(request: NextRequest) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const processSlug = request.nextUrl.searchParams.get('processSlug') || undefined;
  const [entries, summary] = await Promise.all([getChatFeedback(processSlug), getChatFeedbackSummary()]);

  return NextResponse.json({ success: true, entries, summary });
}
