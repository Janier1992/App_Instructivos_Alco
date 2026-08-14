import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from './src/lib/adminAuth';

/**
 * Protege el Portal de Administración (/crm) y su API (/api/crm/*) a nivel
 * de servidor — esta es la validación real que exige la regla de seguridad:
 * no depende de que el frontend oculte botones o rutas. Se ejecuta antes de
 * llegar a cualquier page.tsx o route.ts bajo esos prefijos.
 */
export const config = {
  matcher: ['/crm/:path*', '/api/crm/:path*']
};

const PUBLIC_PATHS = ['/crm/login', '/api/crm/auth/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(request);

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }
    const loginUrl = new URL('/crm/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
