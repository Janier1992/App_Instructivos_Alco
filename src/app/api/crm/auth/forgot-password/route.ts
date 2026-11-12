import { NextRequest, NextResponse } from 'next/server';
import { findAdminUserByEmail } from '@/src/lib/adminUsersStore';
import { createPasswordResetToken } from '@/src/lib/passwordResetStore';
import { isEmailConfigured, sendEmail } from '@/src/lib/emailService';
import { getClientKey, isRateLimited } from '@/src/lib/rateLimit';

const MAX_REQUESTS_PER_WINDOW = 5;

function getBaseUrl(request: NextRequest): string {
  const configured = process.env.APP_URL;
  return configured && /^https?:\/\//.test(configured) ? configured.replace(/\/$/, '') : request.nextUrl.origin;
}

function buildEmailHtml(fullName: string, link: string): string {
  const safeName = fullName.replace(/[<>&"]/g, '');
  return `<div style="font-family:Arial,sans-serif;max-width:480px;color:#1e293b">
    <h2 style="color:#003366">Restablecer contraseña</h2>
    <p>Hola ${safeName},</p>
    <p>Recibimos una solicitud para cambiar la contraseña de tu acceso al Portal de Administración de Alco S.A.S.</p>
    <p><a href="${link}" style="display:inline-block;background:#003366;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Crear nueva contraseña</a></p>
    <p style="font-size:13px;color:#64748b">El enlace vence en 30 minutos y solo se puede usar una vez. Si no lo solicitaste, ignora este correo: tu contraseña no cambiará.</p>
  </div>`;
}

export async function POST(request: NextRequest) {
  try {
    if (!isEmailConfigured()) {
      return NextResponse.json(
        { error: 'El envío de correos no está configurado. Contacta al administrador del servidor.' },
        { status: 503 }
      );
    }
    if (isRateLimited(getClientKey(request.headers), MAX_REQUESTS_PER_WINDOW)) {
      return NextResponse.json({ error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' }, { status: 429 });
    }

    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Se requiere el correo.' }, { status: 400 });
    }

    // Respuesta idéntica exista o no el usuario, para no revelar qué correos están registrados.
    const user = await findAdminUserByEmail(String(email));
    if (user && user.isActive) {
      const token = await createPasswordResetToken(user.id);
      if (token) {
        const link = `${getBaseUrl(request)}/crm/restablecer?token=${token}`;
        await sendEmail({
          to: user.email,
          subject: 'Restablecer contraseña — Portal Alco',
          html: buildEmailHtml(user.fullName, link)
        });
      }
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error solicitando restablecimiento del CRM:', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
