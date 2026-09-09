'use client';

import React, { useState, useRef } from 'react';
import { Ruler, Trash2 } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}
interface Line {
  id: string;
  p1: Point;
  p2: Point;
}

function getDistance(line: { p1: Point; p2: Point }): number {
  const dx = line.p2.x - line.p1.x;
  const dy = line.p2.y - line.p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Medición 2D sobre la foto: se dibuja una línea de calibración (longitud
 * real conocida en cm) y luego una o más líneas de medición — la longitud
 * real de cada una se calcula por regla de tres contra la calibración. Es
 * una herramienta puramente visual, no persiste medidas en el registro;
 * portada del proyecto de referencia (mismo cálculo, misma interacción de
 * arrastre por porcentaje del contenedor).
 */
export const FieldInspectionMeasureTool: React.FC<{ imageUrl: string }> = ({ imageUrl }) => {
  const [calibrationLine, setCalibrationLine] = useState<Line>({ id: 'calibration', p1: { x: 20, y: 50 }, p2: { x: 40, y: 50 } });
  const [calibrationLength, setCalibrationLength] = useState(10);
  const [measurementLines, setMeasurementLines] = useState<Line[]>([]);
  const [dragging, setDragging] = useState<{ lineId: string; point: 'p1' | 'p2' } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const calculateRealLength = (line: Line): number => {
    const refDist = getDistance(calibrationLine);
    if (refDist === 0) return 0;
    return (getDistance(line) / refDist) * calibrationLength;
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

    if (dragging.lineId === 'calibration') {
      setCalibrationLine(prev => ({ ...prev, [dragging.point]: { x, y } }));
    } else {
      setMeasurementLines(prev => prev.map(line => (line.id === dragging.lineId ? { ...line, [dragging.point]: { x, y } } : line)));
    }
  };

  const addMeasurementLine = () => {
    setMeasurementLines(prev => [...prev, { id: `m-${Date.now()}`, p1: { x: 30, y: 30 }, p2: { x: 60, y: 30 } }]);
  };

  const removeMeasurementLine = (id: string) => setMeasurementLines(prev => prev.filter(l => l.id !== id));

  const renderAnchor = (line: Line, point: 'p1' | 'p2', color: string) => (
    <div
      onMouseDown={() => setDragging({ lineId: line.id, point })}
      onTouchStart={() => setDragging({ lineId: line.id, point })}
      className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-white shadow cursor-move touch-none"
      style={{ left: `${line[point].x}%`, top: `${line[point].y}%`, backgroundColor: color }}
    />
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs">
        <Ruler className="w-4 h-4 text-[#003366]" />
        <span className="font-bold text-slate-700">Longitud de referencia (cm):</span>
        <input
          type="number"
          value={calibrationLength}
          onChange={e => setCalibrationLength(Number(e.target.value) || 0)}
          className="w-20 px-2 py-1 border border-slate-300 rounded-lg"
        />
      </div>

      <div
        ref={containerRef}
        onMouseMove={e => handleMove(e.clientX, e.clientY)}
        onMouseUp={() => setDragging(null)}
        onMouseLeave={() => setDragging(null)}
        onTouchMove={e => {
          const t = e.touches[0];
          if (t) handleMove(t.clientX, t.clientY);
        }}
        onTouchEnd={() => setDragging(null)}
        className="relative w-full aspect-video bg-black rounded-xl overflow-hidden select-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="Foto a medir" className="w-full h-full object-contain pointer-events-none" draggable={false} />

        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1={calibrationLine.p1.x} y1={calibrationLine.p1.y} x2={calibrationLine.p2.x} y2={calibrationLine.p2.y} stroke="#f59e0b" strokeWidth="0.5" />
          {measurementLines.map(line => (
            <line key={line.id} x1={line.p1.x} y1={line.p1.y} x2={line.p2.x} y2={line.p2.y} stroke="#22d3ee" strokeWidth="0.5" />
          ))}
        </svg>

        {renderAnchor(calibrationLine, 'p1', '#f59e0b')}
        {renderAnchor(calibrationLine, 'p2', '#f59e0b')}
        <span
          className="absolute text-[10px] font-bold text-amber-300 bg-black/60 px-1 rounded"
          style={{ left: `${(calibrationLine.p1.x + calibrationLine.p2.x) / 2}%`, top: `${(calibrationLine.p1.y + calibrationLine.p2.y) / 2 - 4}%` }}
        >
          Ref: {calibrationLength} cm
        </span>

        {measurementLines.map(line => (
          <React.Fragment key={line.id}>
            {renderAnchor(line, 'p1', '#22d3ee')}
            {renderAnchor(line, 'p2', '#22d3ee')}
            <span
              className="absolute text-[10px] font-bold text-cyan-300 bg-black/60 px-1 rounded"
              style={{ left: `${(line.p1.x + line.p2.x) / 2}%`, top: `${(line.p1.y + line.p2.y) / 2 - 4}%` }}
            >
              {calculateRealLength(line).toFixed(1)} cm
            </span>
          </React.Fragment>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={addMeasurementLine} className="text-[11px] font-bold text-[#003366] hover:underline">
          + Agregar línea de medición
        </button>
      </div>

      {measurementLines.length > 0 && (
        <ul className="space-y-1">
          {measurementLines.map((line, idx) => (
            <li key={line.id} className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <span>Medición {idx + 1}: <strong>{calculateRealLength(line).toFixed(1)} cm</strong></span>
              <button onClick={() => removeMeasurementLine(line.id)} className="text-rose-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[10px] text-slate-400 italic">
        Arrastra los puntos amarillos sobre una medida conocida de la foto para calibrar, luego agrega y ajusta líneas cian sobre lo que quieras medir. Esta herramienta es solo de apoyo visual, no se guarda en el registro.
      </p>
    </div>
  );
};
