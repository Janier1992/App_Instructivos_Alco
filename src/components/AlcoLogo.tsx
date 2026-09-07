import React from 'react';

interface AlcoLogoProps {
  className?: string;
}

/** Logo oficial de Alco Windows & Doors (public/logo-alco.png). */
export const AlcoLogo: React.FC<AlcoLogoProps> = ({ className = 'h-10' }) => {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-alco.png"
      alt="Alco Windows & Doors"
      className={`w-auto object-contain select-none ${className}`}
      draggable={false}
    />
  );
};
