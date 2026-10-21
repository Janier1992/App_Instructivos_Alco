import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/src/lib/supabaseService';
import { isOpenRouterConfigured } from '@/src/lib/openRouterClient';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    app: 'Control de Calidad Alco S.A.S.',
    // Commit desplegado (Vercel lo inyecta): sirve para confirmar qué versión está corriendo realmente.
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    supabaseConnected: isSupabaseConfigured(),
    openRouterConfigured: isOpenRouterConfigured()
  });
}
