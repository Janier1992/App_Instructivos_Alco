import { NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { getMetrologyCalibrationById, getMetrologyCalibrationCertificateUrl } from '@/src/lib/metrologyCalibrationsStore';

/** Pública — redirige a una URL firmada de Storage en vez de descargar el archivo aquí. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureHydrated();
  const { id } = await params;

  const calibration = await getMetrologyCalibrationById(id);
  if (!calibration) {
    return NextResponse.json({ error: 'Instrumento no encontrado.' }, { status: 404 });
  }

  const url = await getMetrologyCalibrationCertificateUrl(calibration);
  if (!url) {
    return NextResponse.json({ error: 'Este instrumento no tiene certificado adjunto.' }, { status: 404 });
  }

  return NextResponse.redirect(url);
}
