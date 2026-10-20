import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { findAdminUserByEmail, updateAdminUser } from '@/src/lib/adminUsersStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

/**
 * Restablece la contraseña de un usuario del CRM sin sesión. La autorización
 * es la clave de recuperación ADMIN_RECOVERY_KEY (solo la conoce quien
 * administra el servidor). Los intentos fallidos se limitan por IP en memoria
 * (best effort en serverless: cada instancia lleva su propio contador).
 */

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;

const failedAttempts = new Map<string, { count: number; firstAt: number }>();

function getClientKey(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
}

function isLocked(key: string): boolean {
  const entry = failedAttempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > LOCK_WINDOW_MS) {
    failedAttempts.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILED_ATTEMPTS;
}

function registerFailure(key: string): void {
  const entry = failedAttempts.get(key);
  if (!entry || Date.now() - entry.firstAt > LOCK_WINDOW_MS) {
    failedAttempts.set(key, { count: 1, firstAt: Date.now() });
  } else {
    entry.count += 1;
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export async function POST(request: NextRequest) {
  try {
    const recoveryKey = process.env.ADMIN_RECOVERY_KEY;
    if (!recoveryKey) {
      return NextResponse.json(
        { error: 'La recuperación de contraseña no está habilitada. Configura ADMIN_RECOVERY_KEY en el servidor.' },
        { status: 503 }
      );
    }

    const clientKey = getClientKey(request);
    if (isLocked(clientKey)) {
      return NextResponse.json({ error: 'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.' }, { status: 429 });
    }

    const { email, recoveryKey: providedKey, newPassword } = await request.json();
    if (!email || !providedKey || !newPassword) {
      return NextResponse.json({ error: 'Se requiere correo, clave de recuperación y nueva contraseña.' }, { status: 400 });
    }
    if (String(newPassword).length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` }, { status: 400 });
    }

    const user = await findAdminUserByEmail(String(email));
    const keyValid = safeEqual(String(providedKey), recoveryKey);
    if (!user || !user.isActive || !keyValid) {
      registerFailure(clientKey);
      return NextResponse.json({ error: 'Correo o clave de recuperación inválidos.' }, { status: 401 });
    }

    const result = await updateAdminUser(user.id, { password: String(newPassword) });
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo actualizar la contraseña.' }, { status: 500 });
    }

    failedAttempts.delete(clientKey);
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
