import { NextRequest, NextResponse } from 'next/server';
import { findAdminUserByEmail, updateLastLogin } from '@/src/lib/adminUsersStore';
import { verifyPassword, createSessionToken, setSessionCookie } from '@/src/lib/adminAuth';
import { recordAuditEvent } from '@/src/lib/auditLog';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Se requiere correo y contraseña.' }, { status: 400 });
    }

    const user = await findAdminUserByEmail(email);
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 });
    }

    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 });
    }

    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role
    });

    await updateLastLogin(user.id);
    await recordAuditEvent({
      adminUserId: user.id,
      adminEmail: user.email,
      action: 'login',
      entityType: 'admin_user',
      entityId: user.id
    });

    const response = NextResponse.json({
      success: true,
      user: { email: user.email, fullName: user.fullName, role: user.role }
    });
    setSessionCookie(response, token);
    return response;
  } catch (err: any) {
    console.error('Error en login del CRM:', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
