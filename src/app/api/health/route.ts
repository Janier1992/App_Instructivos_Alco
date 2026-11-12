import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/src/lib/supabaseService';
import { isOpenRouterConfigured, testOpenRouterConnection } from '@/src/lib/openRouterClient';
import { getClientKey, isRateLimited } from '@/src/lib/rateLimit';

const MAX_OPENROUTER_TESTS = 5;

/** `?check=openrouter` hace una llamada real de prueba a OpenRouter (limitada por IP). */
export async function GET(request: NextRequest) {
  const base = {
    status: 'ok',
    app: 'Control de Calidad Alco S.A.S.',
    // Commit desplegado (Vercel lo inyecta): sirve para confirmar qué versión está corriendo realmente.
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    supabaseConnected: isSupabaseConfigured(),
    openRouterConfigured: isOpenRouterConfigured()
  };

  if (request.nextUrl.searchParams.get('check') !== 'openrouter') return NextResponse.json(base);
  if (isRateLimited(`health:${getClientKey(request.headers)}`, MAX_OPENROUTER_TESTS)) {
    return NextResponse.json({ ...base, openRouterTest: { ok: false, detail: 'Demasiadas pruebas. Intenta en 15 minutos.' } }, { status: 429 });
  }
  return NextResponse.json({ ...base, openRouterTest: await testOpenRouterConnection() });
}
