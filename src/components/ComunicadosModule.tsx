'use client';

import React, { useState } from 'react';
import { Megaphone, ClipboardCheck } from 'lucide-react';
import { CommuniquesPanel } from './CommuniquesPanel';
import { DivulgacionesPanel } from './DivulgacionesPanel';
import type { DocumentType } from './DocumentTypeTiles';

type Section = 'comunicados' | 'divulgaciones';

/**
 * Control Calidad, Comunicados y Procedimientos: un solo módulo con dos listas, la de comunicados y la de
 * divulgaciones (planillas de asistencia). El tipo de documento se elige al crear uno nuevo y cada tipo muestra
 * sus propios campos; al cambiarlo se pasa de un formulario al otro sin salir del módulo.
 */
export const ComunicadosModule: React.FC = () => {
  const [section, setSection] = useState<Section>('comunicados');
  // Al cambiar de tipo desde un formulario, la lista destino se abre ya con su formulario de "nuevo".
  const [openNewOnMount, setOpenNewOnMount] = useState(false);

  const goTo = (next: Section, openForm: boolean) => {
    setOpenNewOnMount(openForm);
    setSection(next);
  };

  const handleSelectType = (type: DocumentType) => {
    if (type === 'divulgacion') goTo('divulgaciones', true);
    else if (type === 'comunicado') goTo('comunicados', true);
  };

  const tab = (value: Section, label: string, icon: React.ReactNode) => (
    <button
      key={value}
      type="button"
      onClick={() => goTo(value, false)}
      aria-pressed={section === value}
      className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg border transition ${section === value ? 'bg-[#003366] border-[#003366] text-white' : 'bg-white border-slate-300 text-slate-600 hover:border-[#003366]'}`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2" role="group" aria-label="Lista del módulo">
        {tab('comunicados', 'Comunicados', <Megaphone className="w-3.5 h-3.5" />)}
        {tab('divulgaciones', 'Divulgaciones', <ClipboardCheck className="w-3.5 h-3.5" />)}
      </div>
      {section === 'comunicados' ? (
        <CommuniquesPanel key={`c-${openNewOnMount}`} initialFormOpen={openNewOnMount} onSelectType={handleSelectType} />
      ) : (
        <DivulgacionesPanel key={`d-${openNewOnMount}`} initialFormOpen={openNewOnMount} onSelectType={handleSelectType} />
      )}
    </div>
  );
};
