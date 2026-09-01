'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, UserCheck, Pencil, Check, X, User, GraduationCap, Trash2, Plus } from 'lucide-react';
import { AutonomyLevelItem } from '@/src/types';
import { ProcessPicker } from './ProcessPicker';

type IluoLevel = 'I' | 'L' | 'U' | 'O';

interface Competency {
  id: string;
  processSlug: string;
  collaboratorName: string;
  iluoLevel: IluoLevel;
  notes?: string;
  updatedAt: string;
}

const ILUO_LEVELS: { value: IluoLevel; short: string; label: string; className: string }[] = [
  { value: 'I', short: 'I', label: 'En inducción (no autorizado a ejecutar solo)', className: 'bg-slate-200 text-slate-700' },
  { value: 'L', short: 'L', label: 'En aprendizaje (supervisado)', className: 'bg-amber-100 text-amber-800' },
  { value: 'U', short: 'U', label: 'Capacitado (trabaja sin supervisión)', className: 'bg-blue-100 text-blue-800' },
  { value: 'O', short: 'O', label: 'Experto (puede entrenar a otros)', className: 'bg-emerald-100 text-emerald-800' }
];

const iluoMeta = (level: string) => ILUO_LEVELS.find(l => l.value === level) || ILUO_LEVELS[0];

export const CrmAutonomyManager: React.FC = () => {
  const [processSlug, setProcessSlug] = useState('');
  const [processName, setProcessName] = useState('');
  const [autonomy, setAutonomy] = useState<AutonomyLevelItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingLevel, setEditingLevel] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [savingLevel, setSavingLevel] = useState<string | null>(null);

  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loadingCompetencies, setLoadingCompetencies] = useState(false);
  const [newCollaborator, setNewCollaborator] = useState('');
  const [newLevel, setNewLevel] = useState<IluoLevel>('I');
  const [savingCompetency, setSavingCompetency] = useState(false);

  const loadAutonomy = useCallback(async () => {
    if (!processSlug) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/processes/${processSlug}`);
      const data = await res.json();
      if (data.process) {
        setProcessName(data.process.name);
        setAutonomy(data.autonomy || []);
      }
    } catch (err) {
      console.error('Error cargando matriz de autonomía:', err);
    } finally {
      setLoading(false);
    }
  }, [processSlug]);

  const loadCompetencies = useCallback(async () => {
    if (!processSlug) return;
    setLoadingCompetencies(true);
    try {
      const res = await fetch(`/api/crm/competencies?processSlug=${encodeURIComponent(processSlug)}`);
      const data = await res.json();
      if (data.success) setCompetencies(data.competencies || []);
    } catch (err) {
      console.error('Error cargando competencia del equipo:', err);
    } finally {
      setLoadingCompetencies(false);
    }
  }, [processSlug]);

  useEffect(() => {
    loadAutonomy();
    loadCompetencies();
  }, [loadAutonomy, loadCompetencies]);

  const handleAddCompetency = async () => {
    if (!newCollaborator.trim()) return;
    setSavingCompetency(true);
    try {
      const res = await fetch('/api/crm/competencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processSlug, collaboratorName: newCollaborator, iluoLevel: newLevel })
      });
      const data = await res.json();
      if (data.success) {
        setNewCollaborator('');
        setNewLevel('I');
        loadCompetencies();
      } else {
        alert(data.error || 'No se pudo guardar.');
      }
    } catch (err) {
      console.error('Error guardando competencia:', err);
    } finally {
      setSavingCompetency(false);
    }
  };

  const handleChangeLevel = async (competency: Competency, level: IluoLevel) => {
    try {
      const res = await fetch('/api/crm/competencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processSlug, collaboratorName: competency.collaboratorName, iluoLevel: level })
      });
      const data = await res.json();
      if (data.success) {
        setCompetencies(prev => prev.map(c => (c.id === competency.id ? { ...c, iluoLevel: level } : c)));
      } else {
        alert(data.error || 'No se pudo actualizar el nivel.');
      }
    } catch (err) {
      console.error('Error actualizando nivel ILUO:', err);
    }
  };

  const handleDeleteCompetency = async (id: string) => {
    if (!confirm('¿Quitar a este colaborador del roster de competencia?')) return;
    try {
      const res = await fetch(`/api/crm/competencies/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setCompetencies(prev => prev.filter(c => c.id !== id));
      } else {
        alert(data.error || 'No se pudo eliminar.');
      }
    } catch (err) {
      console.error('Error eliminando competencia:', err);
    }
  };

  const handleSaveCollaborator = async (level: string) => {
    setSavingLevel(level);
    try {
      const res = await fetch(`/api/crm/autonomy/${processSlug}/${encodeURIComponent(level)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collaboratorName: editingName })
      });
      const data = await res.json();
      if (data.success) {
        setAutonomy(prev =>
          prev.map(item => (item.level === level ? { ...item, assignedCollaborator: data.assignedCollaborator } : item))
        );
        setEditingLevel(null);
      } else {
        alert(data.error || 'No se pudo guardar.');
      }
    } catch (err) {
      console.error('Error guardando colaborador asignado:', err);
    } finally {
      setSavingLevel(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Administración de Autonomía</h1>
          <p className="text-xs text-slate-500 mt-0.5">Asigna el colaborador de planta responsable de cada nivel, por proceso.</p>
        </div>
        <ProcessPicker value={processSlug} onChange={setProcessSlug} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-800 border-b border-slate-200 pb-3">
          <UserCheck className="w-5 h-5 text-[#003366]" />
          <span>Matriz de Autonomía — {processName || '...'}</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Cargando...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {autonomy.map((item, idx) => (
              <div key={idx} className="p-5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="px-3 py-1 text-xs font-extrabold bg-[#003366] text-white rounded-md shadow-xs">
                    {item.level}
                  </span>
                  <span className="text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded border border-slate-200">{item.role}</span>
                </div>

                <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>

                <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg space-y-1.5">
                  <span className="text-[11px] font-bold text-[#003366] uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    Colaborador(es) Asignado(s)
                  </span>
                  {editingLevel === item.level ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        placeholder="Nombre del colaborador de planta"
                        className="flex-1 min-w-0 px-2 py-1.5 text-xs bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <button
                        onClick={() => handleSaveCollaborator(item.level)}
                        disabled={savingLevel === item.level}
                        className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition disabled:opacity-50 shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingLevel(null)}
                        className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs ${item.assignedCollaborator ? 'font-semibold text-slate-800' : 'text-slate-400 italic'}`}>
                        {item.assignedCollaborator || 'Sin asignar todavía'}
                      </span>
                      <button
                        onClick={() => { setEditingLevel(item.level); setEditingName(item.assignedCollaborator || ''); }}
                        className="p-1.5 text-blue-700 hover:bg-blue-100 rounded-lg transition shrink-0"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h3 className="flex items-center gap-2 font-bold text-sm text-slate-800">
              <GraduationCap className="w-5 h-5 text-[#003366]" />
              Competencia del Equipo (ILUO) — {processName || '...'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Roster de competencia verificada por persona: I = en inducción, L = en aprendizaje supervisado, U = capacitado sin supervisión, O = puede entrenar a otros. Solo los niveles U y O se muestran públicamente como "Equipo Certificado".
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newCollaborator}
            onChange={e => setNewCollaborator(e.target.value)}
            placeholder="Nombre del colaborador"
            className="flex-1 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]"
          />
          <select
            value={newLevel}
            onChange={e => setNewLevel(e.target.value as IluoLevel)}
            className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]"
          >
            {ILUO_LEVELS.map(l => (
              <option key={l.value} value={l.value}>{l.short} — {l.label}</option>
            ))}
          </select>
          <button
            onClick={handleAddCompetency}
            disabled={savingCompetency || !newCollaborator.trim()}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-[#003366] hover:bg-blue-700 rounded-lg transition disabled:opacity-50 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        </div>

        {loadingCompetencies ? (
          <div className="p-6 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Cargando...
          </div>
        ) : competencies.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-4">Todavía no hay colaboradores registrados en el roster de este proceso.</p>
        ) : (
          <div className="space-y-2">
            {competencies.map(c => {
              const meta = iluoMeta(c.iluoLevel);
              return (
                <div key={c.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50/60">
                  <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-extrabold ${meta.className}`}>
                    {meta.short}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-slate-800 truncate">{c.collaboratorName}</span>
                  <select
                    value={c.iluoLevel}
                    onChange={e => handleChangeLevel(c, e.target.value as IluoLevel)}
                    className="text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#003366]"
                  >
                    {ILUO_LEVELS.map(l => (
                      <option key={l.value} value={l.value}>{l.short} — {l.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleDeleteCompetency(c.id)}
                    className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition shrink-0"
                    title="Quitar del roster"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
