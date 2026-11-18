import { NextRequest, NextResponse } from 'next/server';
import { findAdminUserById, updateAdminUser } from '@/src/lib/adminUsersStore';
import { consumePasswordResetToken } from '@/src/lib/passwordResetStore';
import { recordAuditEvent } from '@/src/lib/auditLog';
import { getClientKey, isRateLimited } from '@/src/lib/rateLimit';

/** Fija la nueva contraseña usando el token de un solo uso enviado por correo. */

const MIN_PASSWORD_LENGTH = 8;
const MAX_ATTEMPTS_PER_WINDOW = 10;

export async function POST(request: NextRequest) {
  try {
    if (isRateLimited(getClientKey(request.headers), MAX_ATTEMPTS_PER_WINDOW)) {
      return NextResponse.json({ error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' }, { status: 429 });
    }

    const { token, newPassword } = await request.json();
    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Se requiere el enlace y la nueva contraseña.' }, { status: 400 });
    }
    if (String(newPassword).length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` }, { status: 400 });
    }

    const userId = await consumePasswordResetToken(String(token));
    const user = userId ? await findAdminUserById(userId) : null;
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'El enlace no es válido o ya venció. Solicita uno nuevo.' }, { status: 400 });
    }

    const result = await updateAdminUser(user.id, { password: String(newPassword) });
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo actualizar la contraseña.' }, { status: 500 });
    }

    await recordAuditEvent({
      adminUserId: user.id,
      adminEmail: user.email,
      action: 'reset_password',
      entityType: 'admin_user',
      entityId: user.id
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error restableciendo contraseña del CRM:', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
