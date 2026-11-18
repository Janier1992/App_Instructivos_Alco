/**
 * Envío de correo transaccional con Resend (https://resend.com) vía su API
 * REST — sin dependencias nuevas. Requiere RESEND_API_KEY y RESEND_FROM_EMAIL.
 */

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<boolean> {
  if (!isEmailConfigured()) return false;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: params.to,
        subject: params.subject,
        html: params.html
      })
    });
    if (!res.ok) {
      console.error('❌ Resend rechazó el correo:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('❌ Error enviando correo:', err.message);
    return false;
  }
}
