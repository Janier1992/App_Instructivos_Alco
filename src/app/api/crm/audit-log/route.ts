import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/src/lib/adminAuth';
import { listAuditEvents } from '@/src/lib/auditLog';

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['administrador']);
  if ('error' in auth) return auth.error;

  const events = await listAuditEvents();
  return NextResponse.json({ success: true, events, total: events.length });
}
