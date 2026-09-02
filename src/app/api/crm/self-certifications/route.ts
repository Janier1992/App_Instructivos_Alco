import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/src/lib/adminAuth';
import { getSelfCertifications } from '@/src/lib/selfCertificationsStore';

// Historial de autocertificaciones — las que necesitan revisión de
// Calidad y no la tienen aún aparecen primero.
export async function GET(request: NextRequest) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const processSlug = request.nextUrl.searchParams.get('processSlug') || undefined;
  const certifications = await getSelfCertifications(processSlug);
  return NextResponse.json({ success: true, certifications });
}
