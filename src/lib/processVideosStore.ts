import { getSupabaseClient } from './supabaseService';

const PROCESS_VIDEOS_BUCKET = 'process-videos';
// Vencimiento acotado (se regenera en cada solicitud de reproducción, ya
// que el bucket es privado y nunca se expone una URL pública permanente) —
// varias horas para que una sesión larga con pausas no se quede a mitad de
// video con el enlace firmado ya vencido.
const VIDEO_SIGNED_URL_TTL_SECONDS = 6 * 60 * 60;
// Tope de tamaño para archivos subidos directo a la app — se valida también
// en el cliente (CrmVideosManager) antes de subir. Mantiene el bucket de
// Storage liviano; el binario nunca toca la base de datos, solo estos
// metadatos.
export const MAX_UPLOADED_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

export type VideoSourceType = 'link' | 'upload';

/**
 * Videos explicativos por proceso: un enlace externo (YouTube, OneDrive,
 * etc.) o un archivo subido directo a la app y guardado en Supabase Storage
 * (nunca en una columna de la base de datos, para no saturarla). Mismo
 * patrón "best effort" que el resto de stores: si Supabase no está
 * configurado, los videos simplemente no persisten entre reinicios.
 */
export interface ProcessVideo {
  id: string;
  processSlug: string;
  title: string;
  videoUrl: string | null;
  sourceType: VideoSourceType;
  storagePath?: string;
  fileName?: string;
  fileSize?: number;
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

function mapRow(row: any): ProcessVideo {
  return {
    id: row.id,
    processSlug: row.process_slug,
    title: row.title,
    videoUrl: row.video_url || null,
    sourceType: row.source_type === 'upload' ? 'upload' : 'link',
    storagePath: row.storage_path || undefined,
    fileName: row.file_name || undefined,
    fileSize: row.file_size || undefined,
    createdAt: row.created_at
  };
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

    videosStore = (data || []).map(mapRow);
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

export async function getProcessVideoById(id: string): Promise<ProcessVideo | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return videosStore.find(v => v.id === id) || null;

  try {
    const { data, error } = await supabase.from('process_videos').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return mapRow(data);
  } catch (err: any) {
    console.warn('⚠️ Error buscando video de proceso:', err?.message || err);
    return null;
  }
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
        .insert({ process_slug: processSlug, title: title.trim(), video_url: normalizedUrl, source_type: 'link' })
        .select('*')
        .single();

      if (!error && data) {
        const video = mapRow(data);
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
    sourceType: 'link',
    createdAt: new Date().toISOString()
  };
  videosStore.unshift(fallbackVideo);
  return { video: fallbackVideo, persistedToSupabase: false };
}

/**
 * Registra un video cuyo archivo ya fue subido por el navegador directo a
 * Supabase Storage con una signed upload URL (ver /api/crm/videos/upload-url)
 * — igual que los PDF grandes del RAG. Aquí solo se guarda el metadato.
 */
export async function addUploadedProcessVideo(
  processSlug: string,
  title: string,
  fileName: string,
  fileSize: number,
  storagePath: string
): Promise<{ video: ProcessVideo; persistedToSupabase: boolean }> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('process_videos')
        .insert({
          process_slug: processSlug,
          title: title.trim(),
          source_type: 'upload',
          storage_path: storagePath,
          file_name: fileName,
          file_size: fileSize
        })
        .select('*')
        .single();

      if (!error && data) {
        const video = mapRow(data);
        videosStore.unshift(video);
        return { video, persistedToSupabase: true };
      }

      console.warn('⚠️ No se pudo guardar el video subido en Supabase:', error?.message);
    } catch (err: any) {
      console.warn('⚠️ Error guardando video subido de proceso:', err?.message || err);
    }
  }

  const fallbackVideo: ProcessVideo = {
    id: `video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    processSlug,
    title: title.trim(),
    videoUrl: null,
    sourceType: 'upload',
    storagePath,
    fileName,
    fileSize,
    createdAt: new Date().toISOString()
  };
  videosStore.unshift(fallbackVideo);
  return { video: fallbackVideo, persistedToSupabase: !!supabase };
}

/**
 * URL firmada de corta duración para reproducir un video subido — se genera
 * en cada solicitud (no se guarda) porque el bucket es privado. Null si el
 * video es un enlace externo (no aplica) o si falla la generación.
 */
export async function getVideoPlaybackUrl(video: ProcessVideo): Promise<string | null> {
  if (video.sourceType !== 'upload' || !video.storagePath) return null;

  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.storage
      .from(PROCESS_VIDEOS_BUCKET)
      .createSignedUrl(video.storagePath, VIDEO_SIGNED_URL_TTL_SECONDS);
    if (error || !data) {
      console.warn('⚠️ No se pudo generar la URL firmada del video:', error?.message);
      return null;
    }
    return data.signedUrl;
  } catch (err: any) {
    console.warn('⚠️ Error generando URL firmada del video:', err?.message || err);
    return null;
  }
}

export async function deleteProcessVideo(id: string): Promise<boolean> {
  videosStore = videosStore.filter(v => v.id !== id);

  const supabase = getSupabaseClient();
  // Sin Supabase configurado, el store en memoria de esta instancia es la
  // única fuente de verdad posible.
  if (!supabase) return true;

  try {
    // Se consulta la fila directamente (no la caché, que puede estar
    // desactualizada entre instancias serverless) para saber si hay un
    // archivo en Storage que también haya que borrar.
    const { data: row } = await supabase.from('process_videos').select('storage_path').eq('id', id).maybeSingle();

    const { error } = await supabase.from('process_videos').delete().eq('id', id);
    if (error) {
      console.warn('⚠️ Error eliminando video de proceso en Supabase:', error.message);
      return false;
    }

    if (row?.storage_path) {
      const { error: removeError } = await supabase.storage.from(PROCESS_VIDEOS_BUCKET).remove([row.storage_path]);
      if (removeError) {
        console.warn('⚠️ Error eliminando el archivo de video en Supabase Storage:', removeError.message);
      }
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
