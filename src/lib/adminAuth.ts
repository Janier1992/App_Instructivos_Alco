import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Autenticación del Portal de Administración (/crm). Sesión con JWT firmado
 * (compatible con el runtime Edge de middleware.ts) en una cookie httpOnly —
 * sin tabla de sesiones: más simple, a costa de no poder revocar una sesión
 * antes de que expire (mitigado con una expiración corta).
 */

export type AdminRole = 'administrador' | 'editor';

export interface AdminSessionPayload {
  sub: string;
  email: string;
  fullName: string;
  role: AdminRole;
  [key: string]: unknown;
}

export const ADMIN_SESSION_COOKIE = 'alco_admin_session';
const SESSION_DURATION = '8h';
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

function getSecretKey(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    throw new Error('ADMIN_JWT_SECRET no está configurado en las variables de entorno.');
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export async function createSessionToken(payload: AdminSessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, fullName: payload.fullName, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (!payload.sub || !payload.email || !payload.role) return null;
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      fullName: (payload.fullName as string) || '',
      role: payload.role as AdminRole
    };
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.delete(ADMIN_SESSION_COOKIE);
}

export async function getSessionFromRequest(request: NextRequest): Promise<AdminSessionPayload | null> {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Defensa en profundidad para usar dentro de cada route handler protegido:
 * middleware.ts ya bloquea el acceso sin sesión a /api/crm/*, pero un
 * handler específico puede necesitar exigir además un rol concreto (ej.
 * "solo Administrador puede eliminar"), algo que el middleware por sí solo
 * no distingue.
 */
export async function requireSession(
  request: NextRequest
): Promise<{ session: AdminSessionPayload } | { error: NextResponse }> {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return { error: NextResponse.json({ error: 'No autenticado.' }, { status: 401 }) };
  }
  return { session };
}

export async function requireRole(
  request: NextRequest,
  roles: AdminRole[]
): Promise<{ session: AdminSessionPayload } | { error: NextResponse }> {
  const result = await requireSession(request);
  if ('error' in result) return result;
  if (!roles.includes(result.session.role)) {
    return { error: NextResponse.json({ error: 'No tienes permisos para realizar esta acción.' }, { status: 403 }) };
  }
  return result;
}
