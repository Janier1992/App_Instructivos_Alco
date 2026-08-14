'use client';

import React, { useEffect, useState } from 'react';
import { ProcessItem } from '@/src/types';

interface ProcessPickerProps {
  value: string;
  onChange: (slug: string) => void;
  className?: string;
}

/** Selector de proceso reutilizado por los administradores del CRM (Documentos, Videos, Autonomía). */
export const ProcessPicker: React.FC<ProcessPickerProps> = ({ value, onChange, className }) => {
  const [processes, setProcesses] = useState<ProcessItem[]>([]);

  useEffect(() => {
    fetch('/api/processes')
      .then(res => res.json())
      .then(data => {
        if (data.processes) {
          setProcesses(data.processes);
          if (!value && data.processes.length > 0) onChange(data.processes[0].slug);
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
      {processes.map(p => (
        <option key={p.slug} value={p.slug}>
          {p.name}
        </option>
      ))}
    </select>
  );
};
