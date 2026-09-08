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
  FileText,
  PlayCircle
} from 'lucide-react';
import { NotifyProcessButton } from './NotifyProcessButton';
import { PublicationComments } from './PublicationComments';
import { ImageLightbox } from './ImageLightbox';
import { SortDateToggle, SortDirection } from './SortDateToggle';

interface PrincipalItem {
  id: string;
  title: string;
  bodyText: string | null;
  attachmentFileName: string | null;
  attachmentContentType: string | null;
  embedUrl: string | null;
  displayOrder: number;
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

// El "Orden de visualización" que Calidad asigna en el CRM manda siempre
// primero (el número más bajo aparece primero, tal como se le promete en
// esa pantalla) — la fecha solo desempata entre publicaciones que
// comparten el mismo número de orden.
function sortForCarousel(items: PrincipalItem[], dir: SortDirection): PrincipalItem[] {
  return [...items].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    const diff = new Date(a.publishedAt || a.createdAt).getTime() - new Date(b.publishedAt || b.createdAt).getTime();
    return dir === 'desc' ? -diff : diff;
  });
}

function isVideoContentType(contentType: string | null): boolean {
  return (contentType || '').startsWith('video/');
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
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [brokenImageIds, setBrokenImageIds] = useState<Set<string>>(new Set());
  const [isPaused, setIsPaused] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);

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

  const currentItem = items && items.length > 0 ? sortForCarousel(items, sortDir)[activeIndex] : null;
  const currentIsVideo = isVideoContentType(currentItem?.attachmentContentType ?? null);

  useEffect(() => {
    // Mientras la destacada es un video, el avance por tiempo se detiene —
    // el video controla cuándo se pasa a la siguiente publicación (ver
    // handleVideoEnded), así se reproduce completo en vez de cortarlo a la
    // mitad. Para el resto de publicaciones (imagen, texto, embebido) el
    // avance automático de siempre sigue funcionando igual.
    if (!items || items.length < 2 || isPaused || currentIsVideo) return;
    timerRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % items.length);
    }, AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [items, isPaused, currentIsVideo]);

  // Al terminar el video, avanza a la siguiente publicación — así el
  // carrusel nunca queda bloqueado esperando, y la próxima vez que vuelva
  // a esta misma publicación el video se reproduce de nuevo desde el inicio
  // (key={current.id} fuerza el remontaje, que dispara el efecto de arriba).
  const handleVideoEnded = () => {
    if (!items || items.length < 2) return;
    setActiveIndex(prev => (prev + 1) % items.length);
  };

  useEffect(() => {
    // Intenta reproducir con sonido primero — funciona en la gran mayoría
    // de los casos reales porque el colaborador ya interactuó con la app
    // (clics de navegación) antes de llegar a esta publicación, y eso
    // satisface la política de autoplay-con-sonido del navegador. Si de
    // todas formas el navegador la bloquea (ej. primera carga sin ningún
    // clic previo), cae a silenciado en vez de no reproducir nada.
    const el = heroVideoRef.current;
    if (!currentIsVideo || !el) return;
    el.muted = false;
    el.play().catch(() => {
      el.muted = true;
      el.play().catch(() => {});
    });
  }, [currentItem?.id, currentIsVideo]);

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

  const sortedItems = sortForCarousel(items, sortDir);

  const toggleSortDir = () => {
    setSortDir(prev => (prev === 'desc' ? 'asc' : 'desc'));
    setActiveIndex(0);
  };

  const current = sortedItems[activeIndex];
  const hasMultiple = sortedItems.length > 1;
  const isImageAttachment = (current.attachmentContentType || '').startsWith('image/');
  const isVideoAttachment = isVideoContentType(current.attachmentContentType);
  const showImage = current.attachmentFileName && isImageAttachment && !brokenImageIds.has(current.id);
  const showVideo = current.attachmentFileName && isVideoAttachment;
  const showAttachmentLink = current.attachmentFileName && !isImageAttachment && !isVideoAttachment;
  const showEmbed = !!current.embedUrl;

  const goTo = (idx: number) => setActiveIndex(((idx % sortedItems.length) + sortedItems.length) % sortedItems.length);

  const HeroCard = (
    <div
      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      // Solo mouse real activa la pausa por hover: un toque en pantalla
      // dispara "pointerenter" pero no siempre le sigue un "pointerleave"
      // (no hay puntero que "se aleje" en un dispositivo táctil) — filtrar
      // por pointerType evita que un simple toque deje el carrusel
      // pausado para siempre. onFocus/onBlur sí se liberan de forma
      // confiable (incluso los controles nativos del video, verificado).
      onPointerEnter={e => { if (e.pointerType === 'mouse') setIsPaused(true); }}
      onPointerLeave={e => { if (e.pointerType === 'mouse') setIsPaused(false); }}
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
        ) : showVideo ? (
          // key={current.id} fuerza a React a remontar el <video> al cambiar
          // de publicación. El play() con sonido (con su fallback a
          // silenciado si el navegador lo bloquea) lo dispara el efecto de
          // arriba, no un atributo `autoPlay`/`muted` — React no aplica
          // `muted` de forma confiable al montar (gotcha conocido), y
          // controlar todo desde el efecto evita esa inconsistencia.
          <video
            key={current.id}
            ref={heroVideoRef}
            src={`/api/circulares/${current.id}/attachment`}
            onEnded={handleVideoEnded}
            playsInline
            controls
            className="w-full h-80 sm:h-[32rem] object-contain bg-black"
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
            {sortedItems.map((item, idx) => (
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
  const others = sortedItems.map((item, idx) => ({ item, idx })).filter(({ idx }) => idx !== activeIndex);

  return (
    <div className="space-y-4">
      <div className="flex justify-end items-center gap-2">
        <SortDateToggle direction={sortDir} onToggle={toggleSortDir} />
        <NotifyProcessButton processSlug={processSlug} />
      </div>

      {HeroCard}

      <div>
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-0.5">Más publicaciones</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {others.map(({ item, idx }) => {
            const itemIsImage = (item.attachmentContentType || '').startsWith('image/');
            const itemIsVideo = isVideoContentType(item.attachmentContentType);
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
                  ) : itemIsVideo ? (
                    <PlayCircle className="w-6 h-6 text-[#003366]/40" />
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
