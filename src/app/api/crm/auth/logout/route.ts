import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, requireSession } from '@/src/lib/adminAuth';
import { recordAuditEvent } from '@/src/lib/auditLog';

export async function POST(request: NextRequest) {
  const auth = await requireSession(request);

  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);

  if (!('error' in auth)) {
    await recordAuditEvent({
      adminUserId: auth.session.sub,
      adminEmail: auth.session.email,
      action: 'logout',
      entityType: 'admin_user',
      entityId: auth.session.sub
    });
  }

  return response;
}
