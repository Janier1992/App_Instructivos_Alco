import React from 'react';

interface AlcoLogoProps {
  className?: string;
  variant?: 'full' | 'icon' | 'white';
}

export const AlcoLogo: React.FC<AlcoLogoProps> = ({ className = 'h-10', variant = 'full' }) => {
  if (variant === 'icon') {
    return (
      <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Stylized 'A' shape of Alco */}
        <path d="M45 10 L10 90 L40 90 L48 70 L70 70 L58 42 L48 70 L35 70 L45 10 Z" fill="#003366" />
        <path d="M48 25 L65 62 L85 62 L55 10 L48 25 Z" fill="#003366" />
      </svg>
    );
  }

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <svg className="h-full max-h-12 w-auto shrink-0" viewBox="0 0 240 105" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Deep Navy 'A' with angle cutouts */}
        <path d="M110 5 L12 80 L102 80 L102 62 L48 62 L78 38 L92 62 L110 62 L85 20 L110 5 Z" fill="#003366" />
        <path d="M110 5 L85 20 L92 62 L102 62 L102 80 L110 80 Z" fill="#003366" />
        <path d="M45 80 L12 80 L105 5 L112 5 L45 80 Z" fill="#003366" />
        {/* Stylized 'lco' in silver metallic tone */}
        <text x="114" y="66" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontStyle="italic" fontSize="72" fill="#8B95A1" letterSpacing="-2">
          lco
        </text>
        {/* Registered symbol */}
        <circle cx="228" cy="62" r="5" stroke="#8B95A1" strokeWidth="1" fill="none" />
        <text x="226" y="65" fontFamily="Arial" fontSize="6" fontWeight="bold" fill="#8B95A1">R</text>
        
        {/* Navy Blue Bottom Banner for "WINDOWS & DOORS" */}
        <rect x="0" y="82" width="236" height="20" fill="#003366" rx="2" />
        <text x="118" y="96" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="13" fill="#FFFFFF" textAnchor="middle" letterSpacing="1.8">
          WINDOWS &amp; DOORS
        </text>
      </svg>
    </div>
  );
};
