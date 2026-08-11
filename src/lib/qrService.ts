import QRCode from 'qrcode';

export interface QROptions {
  domain?: string;
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * Genera la URL completa conceptual para el QR de un proceso
 */
export function buildProcessUrl(slug: string, domain?: string): string {
  const baseDomain = domain || (typeof window !== 'undefined' ? window.location.origin : 'https://calidad.alco.com.co');
  return `${baseDomain.replace(/\/$/, '')}/procesos/${slug}`;
}

/**
 * Genera un código QR en formato SVG (String)
 */
export async function generateProcessQRSVG(slug: string, options: QROptions = {}): Promise<string> {
  const url = buildProcessUrl(slug, options.domain);
  try {
    const svgString = await QRCode.toString(url, {
      type: 'svg',
      width: options.width || 300,
      margin: options.margin || 2,
      color: {
        dark: options.color?.dark || '#0f172a', // Slate 900
        light: options.color?.light || '#ffffff'
      }
    });
    return svgString;
  } catch (err) {
    console.error('Error generando QR SVG:', err);
    throw err;
  }
}

/**
 * Genera un código QR en formato Data URL (PNG Base64)
 */
export async function generateProcessQRDataURL(slug: string, options: QROptions = {}): Promise<string> {
  const url = buildProcessUrl(slug, options.domain);
  try {
    const dataUrl = await QRCode.toDataURL(url, {
      width: options.width || 400,
      margin: options.margin || 2,
      color: {
        dark: options.color?.dark || '#0f172a',
        light: options.color?.light || '#ffffff'
      }
    });
    return dataUrl;
  } catch (err) {
    console.error('Error generando QR DataURL:', err);
    throw err;
  }
}
