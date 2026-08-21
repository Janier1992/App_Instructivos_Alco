'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Newspaper,
  Paperclip,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  LayoutDashboard,
  FileText
} from 'lucide-react';
import { NotifyProcessButton } from './NotifyProcessButton';
import { PublicationComments } from './PublicationComments';
import { ImageLightbox } from './ImageLightbox';

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

const AUTO_ADVANCE_MS = 8000;

function formatDate(item: PrincipalItem): string {
  return new Date(item.publishedAt || item.createdAt).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Contenido informativo/editorial de la pestaña "Principal" — texto, imagen,
 * adjunto o enlace embebible, publicado desde /crm/principal. Con una sola
 * publicación se muestra como card simple. Con varias, se arma como una
 * portada de periódico: una destacada arriba (rota sola, navegación manual)
 * y el resto en una cuadrícula de titulares debajo — tocar un titular lo
 * promueve a destacado, igual que en un sitio de noticias.
 */
export const ProcessPrincipalPanel: React.FC<ProcessPrincipalPanelProps> = ({ processSlug }) => {
  const [items, setItems] = useState<PrincipalItem[] | null>(null);
  const [hasError, setHasError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [brokenImageIds, setBrokenImageIds] = useState<Set<string>>(new Set());
  const [isPaused, setIsPaused] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);
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
      <div className="space-y-3">
        <div className="flex justify-end">
          <NotifyProcessButton processSlug={processSlug} />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-2">
          <Newspaper className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm text-slate-500">No hay información publicada para esta sección.</p>
        </div>
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

  const HeroCard = (
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
              className="w-full h-80 sm:h-[32rem] border-0"
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
            onClick={() => setZoomedImage({ src: `/api/circulares/${current.id}/attachment`, alt: current.title })}
            className="w-full h-80 sm:h-[32rem] object-contain bg-slate-100 transition-opacity duration-300 cursor-zoom-in"
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
          <span className="text-[11px] text-slate-500 whitespace-nowrap shrink-0 mt-1">{formatDate(current)}</span>
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

        <PublicationComments circularId={current.id} />
      </div>
    </div>
  );

  const Lightbox = zoomedImage && (
    <ImageLightbox src={zoomedImage.src} alt={zoomedImage.alt} onClose={() => setZoomedImage(null)} />
  );

  // Una sola publicación: la card sola, con el botón de notificar arriba.
  if (!hasMultiple) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <NotifyProcessButton processSlug={processSlug} />
        </div>
        {HeroCard}
        {Lightbox}
      </div>
    );
  }

  // Varias publicaciones: portada tipo periódico — destacada arriba,
  // titulares del resto debajo (uno al lado del otro en pantallas anchas,
  // apilados en móvil). Tocar un titular lo promueve a destacado.
  const others = items.map((item, idx) => ({ item, idx })).filter(({ idx }) => idx !== activeIndex);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <NotifyProcessButton processSlug={processSlug} />
      </div>

      {HeroCard}

      <div>
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-0.5">Más publicaciones</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {others.map(({ item, idx }) => {
            const itemIsImage = (item.attachmentContentType || '').startsWith('image/');
            const itemShowImage = item.attachmentFileName && itemIsImage && !brokenImageIds.has(item.id);
            return (
              <button
                key={item.id}
                onClick={() => goTo(idx)}
                className="text-left bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition p-3 flex gap-3 items-start"
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center">
                  {item.embedUrl ? (
                    <LayoutDashboard className="w-6 h-6 text-[#003366]/40" />
                  ) : itemShowImage ? (
                    <img
                      src={`/api/circulares/${item.id}/attachment`}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={() => setBrokenImageIds(prev => new Set(prev).add(item.id))}
                    />
                  ) : item.attachmentFileName ? (
                    <FileText className="w-6 h-6 text-[#003366]/40" />
                  ) : (
                    <Newspaper className="w-6 h-6 text-[#003366]/25" />
                  )}
                </div>
                <div className="min-w-0">
                  <h5 className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">{item.title}</h5>
                  {item.bodyText && <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{item.bodyText}</p>}
                  <span className="text-[10px] text-slate-400 block mt-1">{formatDate(item)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {Lightbox}
    </div>
  );
};
