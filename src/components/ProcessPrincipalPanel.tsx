'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Newspaper, Paperclip, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';

interface PrincipalItem {
  id: string;
  title: string;
  bodyText: string | null;
  attachmentFileName: string | null;
  attachmentContentType: string | null;
  embedUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
}

interface ProcessPrincipalPanelProps {
  processSlug: string;
}

const AUTO_ADVANCE_MS = 7000;

/**
 * Contenido informativo/editorial de la pestaña "Principal" — texto, imagen
 * y adjunto opcional, publicado desde /crm/principal. Con varias
 * publicaciones activas rota tipo carrusel (automático moderado + navegación
 * manual); con una sola se muestra directo, sin chrome de carrusel.
 */
export const ProcessPrincipalPanel: React.FC<ProcessPrincipalPanelProps> = ({ processSlug }) => {
  const [items, setItems] = useState<PrincipalItem[] | null>(null);
  const [hasError, setHasError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [brokenImageIds, setBrokenImageIds] = useState<Set<string>>(new Set());
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setHasError(false);
    try {
      const res = await fetch(`/api/circulares?processSlug=${encodeURIComponent(processSlug)}`);
      const data = await res.json();
      if (!data.success) throw new Error('Respuesta inválida del servidor.');
      setItems(data.circulares || []);
      setActiveIndex(0);
    } catch (err) {
      console.error('Error cargando contenido Principal:', err);
      setHasError(true);
    }
  }, [processSlug]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!items || items.length < 2 || isPaused) return;
    timerRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % items.length);
    }, AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [items, isPaused]);

  if (hasError) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-2">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <p className="text-sm font-semibold text-slate-700">No fue posible cargar la información. Intenta nuevamente.</p>
        <button onClick={load} className="text-xs font-semibold text-[#003366] hover:underline">
          Reintentar
        </button>
      </div>
    );
  }

  if (items === null) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 flex items-center justify-center gap-2 text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-sm">Cargando información...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-2">
        <Newspaper className="w-8 h-8 text-slate-300 mx-auto" />
        <p className="text-sm text-slate-500">No hay información publicada para esta sección.</p>
      </div>
    );
  }

  const current = items[activeIndex];
  const hasMultiple = items.length > 1;
  const isImageAttachment = (current.attachmentContentType || '').startsWith('image/');
  const showImage = current.attachmentFileName && isImageAttachment && !brokenImageIds.has(current.id);
  const showAttachmentLink = current.attachmentFileName && !isImageAttachment;
  const showEmbed = !!current.embedUrl;

  const goTo = (idx: number) => setActiveIndex(((idx % items.length) + items.length) % items.length);

  return (
    <div
      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div className="relative">
        {showEmbed ? (
          <div className="relative">
            <iframe
              key={current.id}
              src={current.embedUrl!}
              title={current.title}
              className="w-full h-72 sm:h-[28rem] border-0"
              allow="fullscreen"
              allowFullScreen
            />
            {/* Algunas plataformas (ej. OneDrive/SharePoint) bloquean el
                embebido a nivel de administrador y el iframe queda en
                blanco sin ningún error de JS detectable — este enlace es
                el respaldo confiable en cualquier caso. */}
            <a
              href={current.embedUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-2 right-2 flex items-center gap-1 text-[11px] font-semibold text-[#003366] bg-white/90 hover:bg-white px-2 py-1 rounded-lg shadow transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir en pestaña nueva
            </a>
          </div>
        ) : showImage ? (
          <img
            key={current.id}
            src={`/api/circulares/${current.id}/attachment`}
            alt={current.title}
            className="w-full h-56 sm:h-72 object-contain bg-slate-100 transition-opacity duration-300"
            onError={() => setBrokenImageIds(prev => new Set(prev).add(current.id))}
          />
        ) : (
          <div className="w-full h-32 sm:h-40 bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
            <Newspaper className="w-9 h-9 text-[#003366]/25" />
          </div>
        )}

        {hasMultiple && (
          <>
            <button
              onClick={() => goTo(activeIndex - 1)}
              aria-label="Publicación anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white text-[#003366] rounded-full shadow transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => goTo(activeIndex + 1)}
              aria-label="Publicación siguiente"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white text-[#003366] rounded-full shadow transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      <div className="p-5 sm:p-6 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-bold text-slate-900 text-base sm:text-lg">{current.title}</h3>
          <span className="text-[11px] text-slate-500 whitespace-nowrap shrink-0 mt-1">
            {new Date(current.publishedAt || current.createdAt).toLocaleDateString('es-CO', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}
          </span>
        </div>

        {current.bodyText && <p className="text-sm text-slate-700 whitespace-pre-line">{current.bodyText}</p>}

        {showAttachmentLink && (
          <a
            href={`/api/circulares/${current.id}/attachment`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#003366] hover:underline"
          >
            <Paperclip className="w-3.5 h-3.5" />
            {current.attachmentFileName}
          </a>
        )}

        {hasMultiple && (
          <div className="flex items-center justify-center gap-1.5 pt-3">
            {items.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => goTo(idx)}
                aria-label={`Ir a la publicación ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  idx === activeIndex ? 'w-6 bg-[#003366]' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
