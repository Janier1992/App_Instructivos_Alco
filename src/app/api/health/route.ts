import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/src/lib/supabaseService';
import { isOpenRouterConfigured } from '@/src/lib/openRouterClient';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    app: 'Control de Calidad Alco S.A.S.',
    supabaseConnected: isSupabaseConfigured(),
    openRouterConfigured: isOpenRouterConfigured()
  });
}
