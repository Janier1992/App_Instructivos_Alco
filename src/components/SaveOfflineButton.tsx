'use client';

import React, { useState } from 'react';
import { DownloadCloud, Check, RefreshCw } from 'lucide-react';

interface SaveOfflineButtonProps {
  processSlug: string;
}

/**
 * Precarga a propósito los criterios, documentos PDF y videos de este
 * proceso en la caché del service worker (public/sw.js ya cachea cualquier
 * GET del mismo origen) — pensado para Instalación: tocarlo con señal antes
 * de salir a la obra, para poder consultar el proceso completo sin conexión
 * una vez allá.
 */
export const SaveOfflineButton: React.FC<SaveOfflineButtonProps> = ({ processSlug }) => {
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [savedCount, setSavedCount] = useState(0);

  const handleSave = async () => {
    setStatus('saving');
    let count = 0;

    try {
      // Datos base del proceso: criterios, controles, matriz de autonomía.
      await fetch(`/api/processes/${processSlug}`, { cache: 'no-store' });
      count++;

      // Documentos PDF indexados — y el archivo de cada uno con archivo real.
      const docsRes = await fetch(`/api/rag/documents?processSlug=${encodeURIComponent(processSlug)}`, { cache: 'no-store' });
      const docsData = await docsRes.json().catch(() => null);
      count++;

      const docs: { id: string; storagePath?: string }[] = docsData?.documents || [];
      for (const doc of docs) {
        if (doc.storagePath) {
          await fetch(`/api/rag/documents/${doc.id}/file`, { cache: 'no-store' }).catch(() => null);
          count++;
        }
      }

      // Lista de videos (los archivos en sí quedan en Storage externo/YouTube
      // y no se pueden garantizar sin conexión, pero el listado y los títulos sí).
      await fetch(`/api/videos?processSlug=${encodeURIComponent(processSlug)}`, { cache: 'no-store' }).catch(() => null);
      count++;

      setSavedCount(count);
      setStatus('done');
    } catch (err) {
      console.error('Error guardando proceso para uso sin conexión:', err);
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <span className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-lg">
        <Check className="w-3.5 h-3.5" />
        Guardado para uso sin conexión ({savedCount})
      </span>
    );
  }

  return (
    <button
      onClick={handleSave}
      disabled={status === 'saving'}
      title="Guarda este proceso en el dispositivo para poder consultarlo sin señal en obra"
      className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#003366] bg-white hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors disabled:opacity-60"
    >
      {status === 'saving' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5" />}
      {status === 'saving' ? 'Guardando...' : status === 'error' ? 'Reintentar guardado sin conexión' : 'Guardar sin conexión'}
    </button>
  );
};
