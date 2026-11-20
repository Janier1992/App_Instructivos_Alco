'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Megaphone, RefreshCw, Plus, X, Pencil, Trash2, Search, PenLine } from 'lucide-react';
import { CommuniqueForm } from './CommuniqueForm';
import { CommuniqueSignModal } from './CommuniqueSignModal';
import type { Communique } from '@/src/lib/communiqueStore';
import { KIND_CONFIG } from '@/src/lib/communiqueShared';
import { WordIcon, PdfIcon } from './ExportFormatIcons';
import { exportCommuniqueToPDF } from '@/src/lib/communiquePdfExport';
import { exportCommuniqueToWord } from '@/src/lib/communiqueWordExport';

const API_BASE = '/api/communiques';

/**
 * Control Calidad, Comunicados y Procedimientos: el colaborador describe el
 * cambio y adjunta imágenes y documentos de referencia, la IA redacta el
 * documento con la plantilla oficial y se puede editar, eliminar o exportar
 * a Word y PDF para divulgarlo a los procesos interesados.
 */
export const CommuniquesPanel: React.FC = () => {
  const [communiques, setCommuniques] = useState<Communique[] | null>(null);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Communique | null>(null);
  const [signing, setSigning] = useState<Communique | null>(null);
  const [exportingKey, setExportingKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(API_BASE, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudieron cargar los comunicados.');
      setCommuniques(data.communiques || []);
      setLoadError(null);
    } catch (err: any) {
      // Si ya había una lista, se conserva en pantalla y solo se avisa del fallo.
      setLoadError(err?.message || 'No se pudieron cargar los comunicados.');
      setCommuniques(prev => prev ?? []);
    }
  }, []);

  useEffect(() => {
    load();
    // Los documentos los crea todo el equipo: se vuelve a consultar al volver a la pestaña y cada minuto.
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    const interval = setInterval(onVisible, 60000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(interval);
    };
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term || !communiques) return communiques || [];
    return communiques.filter(c => [c.asunto, c.para, c.de].some(v => v?.toLowerCase().includes(term)));
  }, [communiques, search]);

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const handleSaved = async () => {
    closeForm();
    await load();
  };

  /** Refresca en la lista (y en la ventana de firmas) el comunicado que acaba de firmarse. */
  const handleSignatureChanged = (updated: Communique) => {
    setCommuniques(prev => (prev ? prev.map(c => (c.id === updated.id ? updated : c)) : prev));
    setSigning(updated);
  };

  const handleDelete = async (c: Communique) => {
    if (!window.confirm(`¿Eliminar "${c.asunto}"? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`${API_BASE}/${c.id}`, { method: 'DELETE' });
    if (!res.ok) {
      window.alert('No se pudo eliminar el documento. Intenta de nuevo.');
      return;
    }
    await load();
  };

  const handleExport = async (c: Communique, format: 'word' | 'pdf') => {
    setExportingKey(`${c.id}-${format}`);
    try {
      await (format === 'word' ? exportCommuniqueToWord(c) : exportCommuniqueToPDF(c));
    } catch {
      window.alert('No se pudo generar el documento. Intenta de nuevo.');
    } finally {
      setExportingKey(null);
    }
  };

  if (communiques === null) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 flex items-center justify-center gap-2 text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-sm">Cargando documentos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar asunto o área" className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-[#003366]" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="text-[11px] font-semibold text-[#003366] hover:underline flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Actualizar</button>
          <button onClick={() => setFormOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg transition"><Plus className="w-3.5 h-3.5" /> Nuevo documento</button>
        </div>
      </div>

      {loadError && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800">
          {loadError} La lista puede estar incompleta; pulsa Actualizar para reintentar.
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-2">
          <Megaphone className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm text-slate-500">{communiques.length === 0 ? 'Aún no hay comunicados ni procedimientos.' : 'Ningún documento coincide con la búsqueda.'}</p>
        </div>
      ) : (
        <div className="max-h-[65vh] overflow-auto border border-slate-200 rounded-xl bg-white">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                {['Fecha', 'Tipo', 'Asunto', 'Para', 'Acciones'].map(h => <th key={h} className="p-2 text-left font-bold text-slate-500 bg-slate-50">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="p-2 whitespace-nowrap">{c.fecha}</td>
                  <td className="p-2">{KIND_CONFIG[c.tipo].label}</td>
                  <td className="p-2 font-semibold">{c.asunto}</td>
                  <td className="p-2">{c.para}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-3 whitespace-nowrap">
                      <button onClick={() => setSigning(c)} className="text-[#003366] hover:underline flex items-center gap-1"><PenLine className="w-3.5 h-3.5" /> Firmar ({c.firmantes.filter(f => f.firma).length}/{c.firmantes.length})</button>
                      <button onClick={() => { setEditing(c); setFormOpen(true); }} className="text-[#003366] hover:underline flex items-center gap-1"><Pencil className="w-3.5 h-3.5" /> Editar</button>
                      <button onClick={() => handleExport(c, 'word')} disabled={exportingKey === `${c.id}-word`} className="text-[#003366] hover:underline flex items-center gap-1 disabled:opacity-50"><WordIcon className="w-4 h-4" /> {exportingKey === `${c.id}-word` ? 'Generando...' : 'Word'}</button>
                      <button onClick={() => handleExport(c, 'pdf')} disabled={exportingKey === `${c.id}-pdf`} className="text-[#003366] hover:underline flex items-center gap-1 disabled:opacity-50"><PdfIcon className="w-4 h-4" /> {exportingKey === `${c.id}-pdf` ? 'Generando...' : 'PDF'}</button>
                      <button onClick={() => handleDelete(c)} className="text-rose-600 hover:underline flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {signing && <CommuniqueSignModal communique={signing} onClose={() => setSigning(null)} onChanged={handleSignatureChanged} />}

      {formOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">{editing ? 'Editar documento' : 'Nuevo comunicado o procedimiento'}</h3>
              <button onClick={closeForm} aria-label="Cerrar"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <CommuniqueForm initial={editing || undefined} onCancel={closeForm} onSaved={handleSaved} />
          </div>
        </div>
      )}
    </div>
  );
};
