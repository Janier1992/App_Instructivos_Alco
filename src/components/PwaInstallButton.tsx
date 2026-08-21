'use client';

import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Botón de "Instalar app" (ícono de flecha hacia una bandeja) — solo se
 * muestra cuando el navegador realmente ofrece instalar la PWA (Chrome/Edge
 * en Android y escritorio disparan "beforeinstallprompt"; se oculta solo si
 * ya está instalada o el navegador no la ofrece — ej. Safari/iOS, que no
 * soporta este evento y requiere "Compartir > Agregar a inicio" manual).
 */
export const PwaInstallButton: React.FC = () => {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('No se pudo registrar el service worker:', err);
      });
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => setInstallEvent(null);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (!installEvent) return null;

  const handleInstall = async () => {
    await installEvent.prompt();
    await installEvent.userChoice;
    // El evento guardado solo sirve una vez — se muestre o no se instale,
    // se oculta el botón hasta que el navegador vuelva a ofrecerlo.
    setInstallEvent(null);
  };

  return (
    <button
      onClick={handleInstall}
      id="pwa-install-button"
      title="Instalar aplicación"
      className="p-2.5 text-white bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-lg transition-all border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
    >
      <Download className="w-4 h-4" />
    </button>
  );
};
