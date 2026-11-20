'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ClipboardCheck, RefreshCw, Plus, X, Pencil, Trash2, Search, Users } from 'lucide-react';
import { DivulgacionForm } from './DivulgacionForm';
import { DivulgacionSheetModal } from './DivulgacionSheetModal';
import type { DocumentType } from './DocumentTypeTiles';
import { WordIcon, PdfIcon } from './ExportFormatIcons';
import type { Divulgacion } from '@/src/lib/divulgacionStore';
import { KIND_LABELS, formatSheetDate } from '@/src/lib/divulgacionShared';
import { exportDivulgacionToPDF } from '@/src/lib/divulgacionPdfExport';
import { exportDivulgacionToWord } from '@/src/lib/divulgacionWordExport';

const API_BASE = '/api/divulgaciones';

/**
 * Control Calidad, Divulgaciones: planilla "Asistencia a capacitación, divulgación y charla". Se crea la sesión
 * (a partir de un comunicado si se quiere), cada asistente registra su fila con su firma y la planilla se exporta
 * a Word y PDF con el diseño original.
 */
export const DivulgacionesPanel: React.FC<{ initialFormOpen?: boolean; onSelectType: (type: DocumentType) => void }> = ({ initialFormOpen = false, onSelectType }) => {
  const [items, setItems] = useState<Divulgacion[] | null>(null);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(initialFormOpen);
  const [editing, setEditing] = useState<Divulgacion | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [exportingKey, setExportingKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(API_BASE, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudieron cargar las divulgaciones.');
      setItems(data.divulgaciones || []);
      setLoadError(null);
    } catch (err: any) {
      // Si ya había una lista, se conserva en pantalla y solo se avisa del fallo.
      setLoadError(err?.message || 'No se pudieron cargar las divulgaciones.');
      setItems(prev => prev ?? []);
    }
  }, []);

  useEffect(() => {
    load();
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term || !items) return items || [];
    return items.filter(d => [d.tema, d.responsable, d.procesoArea].some(v => v?.toLowerCase().includes(term)));
  }, [items, search]);

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  /** Al crear una divulgación se abre su planilla para empezar a registrar asistentes. */
  const handleSaved = async (saved: Divulgacion) => {
    const wasEditing = Boolean(editing);
    closeForm();
    await load();
    if (!wasEditing) setSheetId(saved.id);
  };

  /** La lista no trae las filas de asistencia: para editar se pide la planilla completa. */
  const openEdit = async (d: Divulgacion) => {
    try {
      const res = await fetch(`${API_BASE}/${d.id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      setEditing(data.divulgacion as Divulgacion);
      setFormOpen(true);
    } catch {
      window.alert('No se pudo abrir la planilla. Intenta de nuevo.');
    }
  };

  const handleSheetChanged = (updated: Divulgacion) => setItems(prev => (prev ? prev.map(d => (d.id === updated.id ? { ...d, asistentesCount: updated.asistentes.length } : d)) : prev));

  const handleDelete = async (d: Divulgacion) => {
    if (!window.confirm(`¿Eliminar la planilla "${d.tema}" y sus ${d.asistentesCount} registros de asistencia? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`${API_BASE}/${d.id}`, { method: 'DELETE' });
    if (!res.ok) return window.alert('No se pudo eliminar la planilla. Intenta de nuevo.');
    await load();
  };

  /** La lista no trae las firmas (es liviana): para exportar se pide la planilla completa. */
  const handleExport = async (d: Divulgacion, format: 'word' | 'pdf') => {
    setExportingKey(`${d.id}-${format}`);
    try {
      const res = await fetch(`${API_BASE}/${d.id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      await (format === 'word' ? exportDivulgacionToWord(data.divulgacion) : exportDivulgacionToPDF(data.divulgacion));
    } catch {
      window.alert('No se pudo generar el documento. Intenta de nuevo.');
    } finally {
      setExportingKey(null);
    }
  };

  if (items === null) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 flex items-center justify-center gap-2 text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-sm">Cargando divulgaciones...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar tema, responsable o proceso" className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-[#003366]" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="text-[11px] font-semibold text-[#003366] hover:underline flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Actualizar</button>
          <button onClick={() => setFormOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg transition"><Plus className="w-3.5 h-3.5" /> Nueva divulgación</button>
        </div>
      </div>

      {loadError && <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800">{loadError} La lista puede estar incompleta; pulsa Actualizar para reintentar.</div>}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-2">
          <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm text-slate-500">{items.length === 0 ? 'Aún no hay planillas de asistencia.' : 'Ninguna planilla coincide con la búsqueda.'}</p>
        </div>
      ) : (
        <div className="max-h-[65vh] overflow-auto border border-slate-200 rounded-xl bg-white">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>{['Fecha', 'Tipo', 'Tema', 'Responsable', 'Asistentes', 'Acciones'].map(h => <th key={h} className="p-2 text-left font-bold text-slate-500 bg-slate-50">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} className="border-t border-slate-100">
                  <td className="p-2 whitespace-nowrap">{formatSheetDate(d.fecha)}</td>
                  <td className="p-2">{KIND_LABELS[d.tipo]}</td>
                  <td className="p-2 font-semibold">{d.tema}</td>
                  <td className="p-2">{d.responsable}</td>
                  <td className="p-2 text-center">{d.asistentesCount}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-3 whitespace-nowrap">
                      <button onClick={() => setSheetId(d.id)} className="text-[#003366] hover:underline flex items-center gap-1 font-semibold"><Users className="w-3.5 h-3.5" /> Planilla</button>
                      <button onClick={() => openEdit(d)} className="text-[#003366] hover:underline flex items-center gap-1"><Pencil className="w-3.5 h-3.5" /> Editar</button>
                      <button onClick={() => handleExport(d, 'word')} disabled={exportingKey === `${d.id}-word`} className="text-[#003366] hover:underline flex items-center gap-1 disabled:opacity-50"><WordIcon className="w-4 h-4" /> {exportingKey === `${d.id}-word` ? 'Generando...' : 'Word'}</button>
                      <button onClick={() => handleExport(d, 'pdf')} disabled={exportingKey === `${d.id}-pdf`} className="text-[#003366] hover:underline flex items-center gap-1 disabled:opacity-50"><PdfIcon className="w-4 h-4" /> {exportingKey === `${d.id}-pdf` ? 'Generando...' : 'PDF'}</button>
                      <button onClick={() => handleDelete(d)} className="text-rose-600 hover:underline flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">{editing ? 'Editar planilla de asistencia' : 'Nueva divulgación, capacitación o charla'}</h3>
              <button onClick={closeForm} aria-label="Cerrar"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <DivulgacionForm initial={editing || undefined} onCancel={closeForm} onSaved={handleSaved} onSelectType={onSelectType} />
          </div>
        </div>
      )}

      {sheetId && <DivulgacionSheetModal divulgacionId={sheetId} onClose={() => { setSheetId(null); load(); }} onChanged={handleSheetChanged} />}
    </div>
  );
};
