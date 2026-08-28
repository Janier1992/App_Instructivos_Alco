'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Aviso fijo cuando el navegador pierde conexión — el service worker ya
 * sirve la última versión guardada en caché de cada página/criterio visto
 * antes (ver public/sw.js), pero sin este aviso el colaborador en obra no
 * tiene forma de saber si está viendo información actualizada o la última
 * que se guardó con señal.
 */
export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="sticky top-0 z-40 bg-amber-500 text-amber-950 text-xs sm:text-sm font-semibold px-4 py-2 flex items-center justify-center gap-2 text-center">
      <WifiOff className="w-4 h-4 shrink-0" />
      Sin conexión — viendo la última versión guardada en este dispositivo. Puede no ser la más reciente.
    </div>
  );
};
