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

export function getProcessVideos(processSlug: string): ProcessVideo[] {
  return videosStore.filter(v => v.processSlug === processSlug);
}

export async function addProcessVideo(
  processSlug: string,
  title: string,
  videoUrl: string
): Promise<{ video: ProcessVideo; persistedToSupabase: boolean }> {
  const video: ProcessVideo = {
    id: `video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    processSlug,
    title: title.trim(),
    videoUrl: videoUrl.trim(),
    createdAt: new Date().toISOString()
  };

  videosStore.unshift(video);

  const supabase = getSupabaseClient();
  if (!supabase) return { video, persistedToSupabase: false };

  try {
    const { error } = await supabase.from('process_videos').insert({
      id: video.id,
      process_slug: video.processSlug,
      title: video.title,
      video_url: video.videoUrl,
      created_at: video.createdAt
    });

    if (error) {
      console.warn('⚠️ No se pudo guardar el video en Supabase:', error.message);
      return { video, persistedToSupabase: false };
    }

    return { video, persistedToSupabase: true };
  } catch (err: any) {
    console.warn('⚠️ Error guardando video de proceso:', err?.message || err);
    return { video, persistedToSupabase: false };
  }
}

export async function deleteProcessVideo(id: string): Promise<boolean> {
  const initialLength = videosStore.length;
  videosStore = videosStore.filter(v => v.id !== id);
  const deletedInMemory = videosStore.length < initialLength;

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase.from('process_videos').delete().eq('id', id);
      if (error) {
        console.warn('⚠️ Error eliminando video de proceso en Supabase:', error.message);
      }
    } catch (err: any) {
      console.warn('⚠️ Error eliminando video de proceso:', err?.message || err);
    }
  }

  return deletedInMemory;
}
