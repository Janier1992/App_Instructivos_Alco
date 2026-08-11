import React, { useState } from 'react';
import { 
  ProcessItem 
} from '../types';
import { 
  Search, 
  QrCode, 
  ChevronRight, 
  CheckCircle2, 
  Layers, 
  Scissors, 
  Grid, 
  Palette, 
  Maximize2, 
  Box, 
  PackageCheck, 
  Truck, 
  ShieldCheck, 
  FileText,
  Flame,
  ClipboardCheck
} from 'lucide-react';

interface ProcessListProps {
  processes: ProcessItem[];
  onSelectProcess: (slug: string) => void;
  onOpenQRModal: (process: ProcessItem) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Layers: <Layers className="w-6 h-6 text-blue-600" />,
  Scissors: <Scissors className="w-6 h-6 text-amber-600" />,
  Grid: <Grid className="w-6 h-6 text-purple-600" />,
  Palette: <Palette className="w-6 h-6 text-pink-600" />,
  Maximize2: <Maximize2 className="w-6 h-6 text-cyan-600" />,
  Box: <Box className="w-6 h-6 text-emerald-600" />,
  PackageCheck: <PackageCheck className="w-6 h-6 text-indigo-600" />,
  Truck: <Truck className="w-6 h-6 text-slate-700" />,
  Flame: <Flame className="w-6 h-6 text-orange-600" />,
  ClipboardCheck: <ClipboardCheck className="w-6 h-6 text-teal-600" />
};

export const ProcessList: React.FC<ProcessListProps> = ({
  processes,
  onSelectProcess,
  onOpenQRModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProcesses = processes.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.code.toLowerCase().includes(term) ||
      p.department.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 space-y-6">
      {/* Banner de Inicio de Planta */}
      <div className="bg-gradient-to-r from-[#002244] via-[#003366] to-[#002244] rounded-2xl p-6 sm:p-8 text-white shadow-xl border border-blue-900/50">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-100 border border-white/20">
            <ShieldCheck className="w-4 h-4 text-slate-200" />
            Estándares Oficiales Alco S.A.S.
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Control de Procesos de Calidad Alco
          </h2>
          <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
            Revisemos el estándar → verifiquemos el criterio → tomemos la decisión dentro de nuestro alcance → escalemos únicamente cuando corresponda.
          </p>
        </div>

        {/* Buscador de Proceso */}
        <div className="mt-6 relative max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <input
            type="text"
            id="process-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por proceso, código (ej. INF-PER-01) o área..."
            className="w-full pl-11 pr-4 py-3 bg-[#001c38] border border-blue-800 text-white rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent text-sm shadow-inner transition-all"
          />
        </div>
      </div>

      {/* Grid de Procesos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            Procesos Productivos
            <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {filteredProcesses.length} disponibles
            </span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredProcesses.map((process) => (
            <div
              key={process.id}
              id={`process-card-${process.slug}`}
              className="bg-white rounded-xl border border-slate-200 hover:border-blue-400 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-5 space-y-4">
                {/* Header de la Card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 group-hover:scale-105 transition-transform">
                    {ICON_MAP[process.iconName] || <FileText className="w-6 h-6 text-slate-600" />}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {process.activeVersion}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 font-semibold">
                      {process.code}
                    </span>
                  </div>
                </div>

                {/* Título y Descripción */}
                <div>
                  <h4 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                    {process.name}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {process.department}
                  </p>
                  <p className="text-xs text-slate-600 line-clamp-2 mt-2 leading-relaxed">
                    {process.description}
                  </p>
                </div>

                {/* Aspectos Clave */}
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Controles Clave</span>
                  <ul className="text-xs text-slate-600 space-y-1">
                    {process.keyAspects.slice(0, 2).map((aspect, idx) => (
                      <li key={idx} className="flex items-center gap-1.5 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        <span className="truncate">{aspect}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Acciones del Proceso */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => onOpenQRModal(process)}
                  id={`btn-qr-${process.slug}`}
                  className="p-2 text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"
                  title={`Ver Código QR de ${process.name}`}
                >
                  <QrCode className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onSelectProcess(process.slug)}
                  id={`btn-open-${process.slug}`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-blue-600 rounded-lg transition-colors shadow-sm"
                >
                  Consultar Estándar
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
