import { NextRequest, NextResponse } from 'next/server';
import { requireRole, AdminRole } from '@/src/lib/adminAuth';
import { listAdminUsers, createAdminUser } from '@/src/lib/adminUsersStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

// Gestión de usuarios del CRM: solo Administrador.
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['administrador']);
  if ('error' in auth) return auth.error;

  const users = await listAdminUsers();
  return NextResponse.json({ success: true, users });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['administrador']);
  if ('error' in auth) return auth.error;

  try {
    const { email, password, fullName, role } = await request.json();

    if (!email || !password || !fullName || !role) {
      return NextResponse.json({ error: 'Se requiere email, password, fullName y role.' }, { status: 400 });
    }
    if (role !== 'administrador' && role !== 'editor') {
      return NextResponse.json({ error: 'role debe ser "administrador" o "editor".' }, { status: 400 });
    }
    if (String(password).length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, { status: 400 });
    }

    const result = await createAdminUser({ email, password, fullName, role: role as AdminRole });
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo crear el usuario.' }, { status: 400 });
    }

    await recordAuditEvent({
      adminUserId: auth.session.sub,
      adminEmail: auth.session.email,
      action: 'create',
      entityType: 'admin_user',
      entityId: result.user!.id,
      metadata: { email: result.user!.email, role: result.user!.role }
    });

    return NextResponse.json({ success: true, user: result.user });
  } catch (err: any) {
    console.error('Error creando usuario del CRM:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
