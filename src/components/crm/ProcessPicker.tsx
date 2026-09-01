'use client';

import React, { useEffect, useState } from 'react';
import { ProcessItem } from '@/src/types';

interface ProcessPickerProps {
  value: string;
  onChange: (slug: string) => void;
  className?: string;
  /** Agrega una opción "Todos los procesos" (value = '') y no autoselecciona el primero. */
  allowAll?: boolean;
  /** Slug a autoseleccionar en vez del primer proceso de la lista (ej. "control-calidad" en la página de Formularios de Inspección, para que no queden guardados bajo el proceso equivocado por defecto). */
  defaultSlug?: string;
}

/** Selector de proceso reutilizado por los administradores del CRM (Documentos, Videos, Autonomía). */
export const ProcessPicker: React.FC<ProcessPickerProps> = ({ value, onChange, className, allowAll, defaultSlug }) => {
  const [processes, setProcesses] = useState<ProcessItem[]>([]);

  useEffect(() => {
    fetch('/api/processes')
      .then(res => res.json())
      .then(data => {
        if (data.processes) {
          setProcesses(data.processes);
          if (!allowAll && !value && data.processes.length > 0) {
            const preferred = defaultSlug && data.processes.some((p: ProcessItem) => p.slug === defaultSlug)
              ? defaultSlug
              : data.processes[0].slug;
            onChange(preferred);
          }
        }
      })
      .catch(err => console.error('Error cargando procesos:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={
        className ||
        'bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003366]'
      }
    >
      {allowAll && <option value="">Todos los procesos</option>}
      {processes.map(p => (
        <option key={p.slug} value={p.slug}>
          {p.name}
        </option>
      ))}
    </select>
  );
};
