import { createClient, SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

/**
 * Cliente de Supabase para el navegador, usando la clave "anon" pública
 * (NEXT_PUBLIC_*). Solo se usa para subir archivos grandes directo a
 * Storage con una signed upload URL ya autorizada por el servidor — nunca
 * para leer/escribir tablas directamente desde el cliente.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  browserClient = createClient(url, key);
  return browserClient;
}
