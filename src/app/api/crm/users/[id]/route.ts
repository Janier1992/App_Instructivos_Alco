import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/src/lib/adminAuth';
import { setAdminUserActive } from '@/src/lib/adminUsersStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, ['administrador']);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { isActive } = await request.json();

  if (typeof isActive !== 'boolean') {
    return NextResponse.json({ error: 'Se requiere isActive (booleano).' }, { status: 400 });
  }

  if (id === auth.session.sub && isActive === false) {
    return NextResponse.json({ error: 'No puedes desactivar tu propia cuenta.' }, { status: 400 });
  }

  const success = await setAdminUserActive(id, isActive);
  if (!success) {
    return NextResponse.json({ error: 'No se pudo actualizar el usuario.' }, { status: 500 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: isActive ? 'activate' : 'deactivate',
    entityType: 'admin_user',
    entityId: id
  });

  return NextResponse.json({ success: true });
}
