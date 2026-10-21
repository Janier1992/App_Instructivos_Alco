import React from 'react';
import { PhotoMark, MARK_COLOR, arrowHead, labelLayout, markStrokeWidth } from '@/src/lib/photoMarks';

/** Dibuja las marcas encima de una foto (SVG con la proporción real de la imagen). */
export const MarksOverlay: React.FC<{ marks: PhotoMark[]; width: number; height: number }> = ({ marks, width, height }) => {
  if (width === 0 || height === 0) return null;
  const stroke = markStrokeWidth(width, height);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid meet">
      {marks.map((mark, i) => {
        const x1 = mark.x1 * width;
        const y1 = mark.y1 * height;
        const x2 = mark.x2 * width;
        const y2 = mark.y2 * height;
        const common = { stroke: MARK_COLOR, strokeWidth: stroke, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

        if (mark.type === 'label') {
          const box = labelLayout(mark, width, height);
          return (
            <g key={i}>
              <rect x={box.x} y={box.y} width={box.boxW} height={box.boxH} fill="#fff" stroke="#111" strokeWidth={Math.max(2, box.fontSize * 0.07)} />
              {box.lines.map((line, li) => (
                <text key={li} x={box.x + box.pad} y={box.y + box.pad + li * box.fontSize * 1.25 + box.fontSize * 0.85} fontSize={box.fontSize} fontFamily="Arial, sans-serif" fill="#111">
                  {line}
                </text>
              ))}
            </g>
          );
        }
        if (mark.type === 'rect') {
          return <rect key={i} x={Math.min(x1, x2)} y={Math.min(y1, y2)} width={Math.abs(x2 - x1)} height={Math.abs(y2 - y1)} {...common} />;
        }
        if (mark.type === 'circle') {
          return <ellipse key={i} cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} rx={Math.abs(x2 - x1) / 2} ry={Math.abs(y2 - y1) / 2} {...common} />;
        }
        const points = arrowHead(mark, width, height).map(p => p.join(',')).join(' ');
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} {...common} />
            <polygon points={points} fill={MARK_COLOR} stroke={MARK_COLOR} strokeWidth={1} />
          </g>
        );
      })}
    </svg>
  );
};

/** Foto con sus marcas encima; mide la foto al cargar para que las marcas coincidan exactamente. */
export const MarkedImage: React.FC<{ src: string; marks: PhotoMark[]; className?: string; alt?: string }> = ({ src, marks, className = '', alt = '' }) => {
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  return (
    <div className={`relative ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="w-full h-full object-contain block" onLoad={e => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />
      {marks.length > 0 && <MarksOverlay marks={marks} width={size.w} height={size.h} />}
    </div>
  );
};
