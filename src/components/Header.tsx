import React from 'react';
import { Settings, ListFilter, LayoutDashboard } from 'lucide-react';
import { AlcoLogo } from './AlcoLogo';

export type ActiveTab = 'procesos' | 'dashboard';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onGoHome: () => void;
  onOpenSettings: () => void;
  currentProcessName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onGoHome,
  onOpenSettings,
  currentProcessName
}) => {
  return (
    <header className="bg-[#003366] text-white border-b border-[#002244] sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 flex items-center justify-between">
        {/* Brand Logo & App Title */}
        <div
          onClick={onGoHome}
          className="flex items-center gap-3 cursor-pointer group"
          id="brand-logo-button"
        >
          <div className="bg-white px-2.5 py-1 rounded-lg shadow-md group-hover:bg-slate-50 transition-colors flex items-center">
            <AlcoLogo className="h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg leading-tight tracking-tight text-white">
                Plataforma de Calidad Alco
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full">
                Asistente IA RAG
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {currentProcessName ? `Proceso: ${currentProcessName}` : 'Agente IA • Documentación RAG'}
            </p>
          </div>
        </div>

        {/* Ajustes del Agente */}
        <button
          onClick={onOpenSettings}
          id="open-settings-button"
          className="p-2.5 text-white bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-lg transition-all border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
          title="Ajustes del Agente IA"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Tab Bar */}
      <div className="bg-[#002244] border-t border-white/10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => onTabChange('procesos')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition shrink-0 ${
              activeTab === 'procesos'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <ListFilter className="w-4 h-4 text-blue-300" />
            <span>Módulos de Planta</span>
          </button>

          <button
            onClick={() => onTabChange('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-blue-300" />
            <span>Dashboard</span>
          </button>
        </div>
      </div>
    </header>
  );
};
