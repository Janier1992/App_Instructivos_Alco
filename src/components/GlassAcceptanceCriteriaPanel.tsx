'use client';

import React from 'react';
import { Gem, Info } from 'lucide-react';
import {
  GLASS_CRITERIA_SECTIONS,
  GLASS_CRITERIA_LEGEND,
  GLASS_CRITERIA_INSPECTION_NOTE,
  GLASS_CRITERIA_SOURCE,
  GLASS_QUALITY_TIERS,
  GlassCriteriaStatus
} from '@/src/data/glassAcceptanceCriteria';

const STATUS_CELL_CLASSES: Record<GlassCriteriaStatus, string> = {
  permitido: 'bg-emerald-50 text-emerald-800',
  condicional: 'bg-amber-50 text-amber-900',
  rechazado: 'bg-rose-50 text-rose-700 font-bold'
};

const STATUS_DOT_CLASSES: Record<GlassCriteriaStatus, string> = {
  permitido: 'bg-emerald-500',
  condicional: 'bg-amber-400',
  rechazado: 'bg-rose-500'
};

/**
 * Referencia rápida de criterios de aceptación/rechazo de defectos en
 * vidrio (NTC 1909:2023) para el proceso de Vidrio Crudo y Templado — ver
 * src/data/glassAcceptanceCriteria.ts para la transcripción completa y su
 * fuente. Q3 (arquitectónico templado/laminado) y Q4 (vidriado general)
 * son las calidades más relevantes para este proceso; se muestran las 4
 * de la norma para mantener el cuadro completo.
 */
export const GlassAcceptanceCriteriaPanel: React.FC = () => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-bold text-[#003366] flex items-center gap-2">
            <Gem className="w-5 h-5 text-[#003366]" />
            Criterios de aceptación y rechazo de defectos en vidrio
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            NTC 1909:2023 (tercera actualización) · Vidrio plano flotado transparente — Tipo I, Clase 1 y 2 · Adopción modificada de ASTM C1036-21
          </p>
        </div>
        <span className="px-3 py-1 bg-[#003366] text-white text-xs font-bold rounded-lg shrink-0">
          ICONTEC · NTC 1909:2023
        </span>
      </div>

      {/* Leyenda de colores */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          {GLASS_CRITERIA_LEGEND.map(item => (
            <span key={item.status} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT_CLASSES[item.status]}`} />
              {item.label}
            </span>
          ))}
        </div>
        <span className="text-[11px] text-slate-500 flex items-center gap-1">
          <Info className="w-3.5 h-3.5 shrink-0" /> {GLASS_CRITERIA_INSPECTION_NOTE}
        </span>
      </div>

      {/* Calidades de referencia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {GLASS_QUALITY_TIERS.map(tier => (
          <div key={tier.code} className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-xs font-extrabold text-[#003366] block">{tier.title}</span>
            <p className="text-[11px] text-slate-600 mt-0.5">{tier.description}</p>
          </div>
        ))}
      </div>

      {/* Secciones de criterios */}
      <div className="space-y-6">
        {GLASS_CRITERIA_SECTIONS.map(section => (
          <div key={section.id} className="space-y-2">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="w-6 h-6 rounded-full bg-[#003366] text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                {section.number}
              </span>
              <h4 className="text-sm font-bold text-slate-900">{section.title}</h4>
              <span className="text-[11px] text-slate-500">{section.subtitle}</span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs min-w-[640px]">
                <thead>
                  <tr className="bg-[#003366] text-white">
                    <th className="p-2.5 text-left font-bold">{section.columnHeader}</th>
                    <th className="p-2.5 text-center font-bold w-[15%]">Q1</th>
                    <th className="p-2.5 text-center font-bold w-[15%]">Q2</th>
                    <th className="p-2.5 text-center font-bold w-[15%]">Q3</th>
                    <th className="p-2.5 text-center font-bold w-[15%]">Q4</th>
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="p-2.5 font-semibold text-slate-800 border-t border-slate-200">
                        {row.characteristic}
                        {row.note && <span className="block text-[10px] font-normal text-slate-400">({row.note})</span>}
                      </td>
                      {(['q1', 'q2', 'q3', 'q4'] as const).map(q => (
                        <td key={q} className={`p-2.5 text-center border-t border-slate-200 ${STATUS_CELL_CLASSES[row[q].status]}`}>
                          {row[q].text}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">{section.footnote}</p>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed pt-3 border-t border-slate-100">
        Fuente: {GLASS_CRITERIA_SOURCE}
      </p>
    </div>
  );
};
