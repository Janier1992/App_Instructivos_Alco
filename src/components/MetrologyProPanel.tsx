'use client';

import React, { useState } from 'react';
import { Truck, RefreshCcw as RepeatIcon, Ruler } from 'lucide-react';
import { MetrologyDeliveriesPanel } from './MetrologyDeliveriesPanel';
import { MetrologyReplacementsPanel } from './MetrologyReplacementsPanel';
import { MetrologyCalibrationsPanel } from './MetrologyCalibrationsPanel';

type MetrologySubTab = 'entrega' | 'reposicion' | 'calibracion';

/** Metrología Pro dentro de Control Calidad — agrupa sus submódulos (Entrega de Equipos, Reposición y Baja, ...). */
export const MetrologyProPanel: React.FC<{ processSlug: string }> = ({ processSlug }) => {
  const [tab, setTab] = useState<MetrologySubTab>('entrega');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
        <SubTabButton active={tab === 'entrega'} onClick={() => setTab('entrega')} icon={<Truck className="w-3.5 h-3.5" />} label="Entrega de Equipos" />
        <SubTabButton active={tab === 'reposicion'} onClick={() => setTab('reposicion')} icon={<RepeatIcon className="w-3.5 h-3.5" />} label="Reposición y Baja" />
        <SubTabButton active={tab === 'calibracion'} onClick={() => setTab('calibracion')} icon={<Ruler className="w-3.5 h-3.5" />} label="Control Calibración" />
      </div>

      {tab === 'entrega' && <MetrologyDeliveriesPanel processSlug={processSlug} />}
      {tab === 'reposicion' && <MetrologyReplacementsPanel processSlug={processSlug} />}
      {tab === 'calibracion' && <MetrologyCalibrationsPanel processSlug={processSlug} />}
    </div>
  );
};

const SubTabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-lg transition ${
      active ? 'text-[#003366] border-b-2 border-[#003366]' : 'text-slate-500 hover:text-slate-800'
    }`}
  >
    {icon} {label}
  </button>
);
