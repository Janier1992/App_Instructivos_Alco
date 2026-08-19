import { getSupabaseClient } from './supabaseService';

/**
 * Enlaces a videos explicativos por proceso (ej. grabaciones de OneDrive
 * mostrando cómo se ejecuta una operación de planta). Mismo patrón "best
 * effort" que el resto de stores: si Supabase no está configurado, los
 * videos simplemente no persisten entre reinicios.
 */
export interface ProcessVideo {
  id: string;
  processSlug: string;
  title: string;
  videoUrl: string;
  createdAt: string;
}

let videosStore: ProcessVideo[] = [];

/**
 * Convierte enlaces normales de YouTube (watch?v=, youtu.be/) al formato
 * /embed/ que sí se puede mostrar dentro de un iframe — así el usuario
 * puede pegar el link que YouTube le da por defecto al compartir, sin tener
 * que saber que existe un formato "embed" distinto. Enlaces que no son de
 * YouTube (OneDrive, Vimeo, etc.) se devuelven sin tocar.
 */
export function normalizeVideoEmbedUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl.trim());
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const videoId = url.pathname.slice(1);
      return videoId ? `https://www.youtube.com/embed/${videoId}` : rawUrl;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname === '/watch') {
        const videoId = url.searchParams.get('v');
        return videoId ? `https://www.youtube.com/embed/${videoId}` : rawUrl;
      }
      if (url.pathname.startsWith('/shorts/')) {
        const videoId = url.pathname.split('/')[2];
        return videoId ? `https://www.youtube.com/embed/${videoId}` : rawUrl;
      }
    }

    return rawUrl;
  } catch {
    return rawUrl;
  }
}

export async function loadProcessVideosFromSupabase(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('process_videos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('⚠️ No se pudieron cargar los videos de proceso desde Supabase:', error.message);
      return;
    }

    videosStore = (data || []).map((row: any) => ({
      id: row.id,
      processSlug: row.process_slug,
      title: row.title,
      videoUrl: row.video_url,
      createdAt: row.created_at
    }));
  } catch (err: any) {
    console.warn('⚠️ Error cargando videos de proceso:', err?.message || err);
  }
}

/**
 * A diferencia de una simple lectura de la caché en memoria, esto siempre
 * recarga desde Supabase: dos requests seguidas (crear un video y luego
 * listar) pueden caer en instancias serverless distintas, cada una
 * hidratada en un momento diferente, y una instancia "vieja" no vería un
 * video creado después de su propia hidratación.
 */
export async function getProcessVideos(processSlug: string): Promise<ProcessVideo[]> {
  await loadProcessVideosFromSupabase();
  return videosStore.filter(v => v.processSlug === processSlug);
}

export async function addProcessVideo(
  processSlug: string,
  title: string,
  videoUrl: string
): Promise<{ video: ProcessVideo; persistedToSupabase: boolean }> {
  const normalizedUrl = normalizeVideoEmbedUrl(videoUrl);
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      // El id lo genera Postgres (columna UUID con gen_random_uuid() por
      // defecto) — antes se mandaba un id de texto propio ("video-<ts>-...")
      // que no es un UUID válido, así que el insert fallaba siempre en
      // silencio y el video nunca quedaba guardado de verdad.
      const { data, error } = await supabase
        .from('process_videos')
        .insert({ process_slug: processSlug, title: title.trim(), video_url: normalizedUrl })
        .select('*')
        .single();

      if (!error && data) {
        const video: ProcessVideo = {
          id: data.id,
          processSlug: data.process_slug,
          title: data.title,
          videoUrl: data.video_url,
          createdAt: data.created_at
        };
        videosStore.unshift(video);
        return { video, persistedToSupabase: true };
      }

      console.warn('⚠️ No se pudo guardar el video en Supabase:', error?.message);
    } catch (err: any) {
      console.warn('⚠️ Error guardando video de proceso:', err?.message || err);
    }
  }

  // Sin Supabase configurado, o el insert falló: se guarda solo en memoria
  // de esta instancia (temporal, se pierde en el próximo cold start).
  const fallbackVideo: ProcessVideo = {
    id: `video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    processSlug,
    title: title.trim(),
    videoUrl: normalizedUrl,
    createdAt: new Date().toISOString()
  };
  videosStore.unshift(fallbackVideo);
  return { video: fallbackVideo, persistedToSupabase: false };
}

export async function deleteProcessVideo(id: string): Promise<boolean> {
  const existedInMemory = videosStore.some(v => v.id === id);
  videosStore = videosStore.filter(v => v.id !== id);

  const supabase = getSupabaseClient();
  // Sin Supabase configurado, el store en memoria de esta instancia es la
  // única fuente de verdad posible.
  if (!supabase) return existedInMemory;

  try {
    const { error } = await supabase.from('process_videos').delete().eq('id', id);
    if (error) {
      console.warn('⚠️ Error eliminando video de proceso en Supabase:', error.message);
      return false;
    }
    // Éxito determinado por el resultado real en Supabase, no por si esta
    // instancia serverless en particular tenía el video en su caché en
    // memoria — dos requests seguidos pueden caer en instancias distintas.
    return true;
  } catch (err: any) {
    console.warn('⚠️ Error eliminando video de proceso:', err?.message || err);
    return false;
  }
}
