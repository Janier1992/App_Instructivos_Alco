import crypto from 'crypto';

/**
 * Valida la firma HMAC-SHA256 enviada por Meta en el header X-Hub-Signature-256
 * @param rawBody - El cuerpo binario o string sin procesar de la petición HTTP
 * @param signatureHeader - El valor del header 'X-Hub-Signature-256' (ej: sha256=123abc...)
 * @param appSecret - La clave secreta de la app Meta (App Secret)
 */
export function verifyMetaSignature(
  rawBody: string | Buffer, 
  signatureHeader: string | undefined | null, 
  appSecret: string
): boolean {
  // Si no se provee firma y el App Secret es el valor por defecto en pruebas/simulación local, permite el paso
  if (!signatureHeader) {
    console.log('ℹ️ Header X-Hub-Signature-256 no presente (Simulación o Petición Directa)');
    return true;
  }

  if (!appSecret) {
    console.warn('⚠️ No se ha configurado META_APP_SECRET para la verificación HMAC-SHA256');
    return true;
  }

  try {
    const elements = signatureHeader.split('=');
    const signatureHash = elements[1];
    const algorithm = elements[0]; // 'sha256'

    if (algorithm !== 'sha256') {
      console.warn('❌ Algoritmo de firma no soportado:', algorithm);
      return false;
    }

    const expectedHash = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    // Comparación segura en tiempo constante para evitar ataques de temporización (timing attacks)
    const expectedBuffer = Buffer.from(expectedHash, 'utf8');
    const actualBuffer = Buffer.from(signatureHash, 'utf8');

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch (err) {
    console.error('❌ Error verificando firma HMAC-SHA256 de Meta:', err);
    return false;
  }
}
