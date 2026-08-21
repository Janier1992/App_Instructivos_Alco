'use client';

import React, { useEffect, useState } from 'react';
import { Bell, BellRing, RefreshCw } from 'lucide-react';

interface NotifyProcessButtonProps {
  processSlug: string;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

/**
 * Botón "Notificarme" por proceso — sin cuenta de usuario. Suscribe este
 * dispositivo a las notificaciones push de este proceso específico
 * (reutiliza la suscripción push del navegador si ya existe una para otro
 * proceso; el navegador solo mantiene una por origen). Se oculta solo si el
 * navegador no soporta Web Push (ej. Safari/iOS sin instalar la app antes).
 */
export const NotifyProcessButton: React.FC<NotifyProcessButtonProps> = ({ processSlug }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const storageKey = `alco-notify-${processSlug}`;

  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    if (supported) {
      setIsSubscribed(localStorage.getItem(storageKey) === 'true');
    }
  }, [storageKey]);

  if (!isSupported) return null;

  const handleSubscribe = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setMessage('⚠️ No diste permiso para notificaciones. Puedes activarlo luego desde el navegador.');
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const keyRes = await fetch('/api/push/public-key');
      const keyData = await keyRes.json();
      if (!keyRes.ok || !keyData.publicKey) {
        setMessage('⚠️ Las notificaciones no están disponibles en este momento.');
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey)
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processSlug, subscription: subscription.toJSON() })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem(storageKey, 'true');
        setIsSubscribed(true);
        setMessage('✅ Vas a recibir notificaciones de este proceso en este dispositivo.');
      } else {
        setMessage(`⚠️ ${data.error || 'No se pudo activar la notificación.'}`);
      }
    } catch (err: any) {
      console.error('Error activando notificaciones:', err);
      setMessage('⚠️ No se pudo activar la notificación en este navegador.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ processSlug, endpoint: subscription.endpoint })
        });
      }

      localStorage.removeItem(storageKey);
      setIsSubscribed(false);
      setMessage('Ya no vas a recibir notificaciones de este proceso en este dispositivo.');
    } catch (err) {
      console.error('Error desactivando notificaciones:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
        disabled={isLoading}
        title={isSubscribed ? 'Dejar de recibir notificaciones de este proceso' : 'Notificarme de novedades de este proceso'}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition disabled:opacity-50 ${
          isSubscribed
            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
        }`}
      >
        {isLoading ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        ) : isSubscribed ? (
          <BellRing className="w-3.5 h-3.5" />
        ) : (
          <Bell className="w-3.5 h-3.5" />
        )}
        {isSubscribed ? 'Notificaciones activas' : 'Notificarme'}
      </button>
      {message && <p className="text-[11px] text-slate-500 max-w-[220px] text-right">{message}</p>}
    </div>
  );
};
