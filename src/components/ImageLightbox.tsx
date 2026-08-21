'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

/**
 * Visor de imagen a pantalla completa. Clic sobre la imagen alterna entre
 * ajustada a la pantalla y su tamaño real (con scroll para recorrerla,
 * como el zoom de una foto en el celular). Clic fuera de la imagen, la X
 * o Escape cierran el visor.
 */
export const ImageLightbox: React.FC<ImageLightboxProps> = ({ src, alt, onClose }) => {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center overflow-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        onClick={onClose}
        aria-label="Cerrar"
        className="fixed top-3 right-3 sm:top-4 sm:right-4 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition z-10"
      >
        <X className="w-5 h-5" />
      </button>

      <img
        src={src}
        alt={alt}
        onClick={(e) => {
          e.stopPropagation();
          setZoomed((z) => !z);
        }}
        className={
          zoomed
            ? 'max-w-none max-h-none w-auto h-auto cursor-zoom-out m-auto'
            : 'max-w-[95vw] max-h-[92vh] w-auto h-auto object-contain cursor-zoom-in m-auto'
        }
      />
    </div>
  );
};
