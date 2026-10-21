import React from 'react';

/** Iconos de formato de archivo (Word y PDF) para los botones de exportación: se distinguen por color y letra. */

export const WordIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} role="img" aria-label="Word (DOCX)">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#2B579A" />
    <path d="M6.2 8l2 8 2-6 2 6 2-8" transform="translate(1.1 0)" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const PdfIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} role="img" aria-label="PDF">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#D93025" />
    <text x="12" y="15.2" textAnchor="middle" fontSize="7.6" fontWeight="700" fontFamily="Arial, sans-serif" fill="#fff">PDF</text>
  </svg>
);
