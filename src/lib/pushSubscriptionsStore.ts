import webpush from 'web-push';
import { getSupabaseClient } from './supabaseService';
import { Circular } from './circularesStore';

/**
 * Notificaciones push por proceso (Web Push estándar), sin cuenta de
 * usuario: cada navegador se suscribe a los procesos que le interesan
 * (una fila por proceso en push_subscriptions) y recibe una notificación
 * del sistema operativo cuando se publica algo nuevo en Principal para ese
 * proceso, o para todos si la publicación es de alcance global.
 */

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function addPushSubscription(processSlug: string, subscription: PushSubscriptionInput): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        process_slug: processSlug,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      },
      { onConflict: 'process_slug,endpoint' }
    );

  if (error) {
    console.warn('⚠️ No se pudo guardar la suscripción push:', error.message);
    return false;
  }
  return true;
}

export async function removePushSubscription(processSlug: string | null, endpoint: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  let query = supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  if (processSlug) query = query.eq('process_slug', processSlug);

  const { error } = await query;
  if (error) {
    console.warn('⚠️ Error eliminando suscripción push:', error.message);
    return false;
  }
  return true;
}

/**
 * Envía la notificación de una publicación nueva de Principal a quienes
 * estén suscritos a alguno de sus procesos (o a todos, si la publicación es
 * de alcance global). Deduplicada por endpoint: un dispositivo suscrito a
 * varios de los procesos incluidos recibe la notificación una sola vez.
 * Limpia sola cualquier suscripción que el push service reporte caducada.
 */
export async function sendPushForCircular(circular: Circular): Promise<void> {
  if (!ensureVapidConfigured()) {
    console.warn('⚠️ VAPID no configurado (VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT) — no se enviaron notificaciones push.');
    return;
  }

  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    let query = supabase.from('push_subscriptions').select('*');
    if (circular.processSlugs.length > 0) {
      query = query.in('process_slug', circular.processSlugs);
    }
    const { data, error } = await query;

    if (error) {
      console.warn('⚠️ No se pudieron cargar suscripciones push:', error.message);
      return;
    }
    if (!data || data.length === 0) return;

    const uniqueByEndpoint = new Map<string, (typeof data)[number]>();
    for (const row of data) {
      if (!uniqueByEndpoint.has(row.endpoint)) uniqueByEndpoint.set(row.endpoint, row);
    }

    const targetUrl = circular.processSlugs.length === 1 ? `/procesos/${circular.processSlugs[0]}` : '/';
    const payload = JSON.stringify({
      title: circular.title,
      body: (circular.bodyText || 'Nueva publicación disponible.').slice(0, 140),
      url: targetUrl
    });

    const results = await Promise.allSettled(
      Array.from(uniqueByEndpoint.values()).map(async (row) => {
        try {
          await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, payload);
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            // Suscripción caducada (el navegador la revocó, se desinstaló, etc.) — se limpia.
            await supabase.from('push_subscriptions').delete().eq('endpoint', row.endpoint);
          } else {
            console.warn('⚠️ Error enviando notificación push:', err?.message || err);
          }
          throw err;
        }
      })
    );

    const failed = results.filter((r) => r.status === 'rejected').length;
    console.log(`🔔 Notificaciones push para "${circular.title}": ${results.length - failed}/${results.length} enviadas.`);
  } catch (err: any) {
    console.warn('⚠️ Error general enviando notificaciones push:', err?.message || err);
  }
}
