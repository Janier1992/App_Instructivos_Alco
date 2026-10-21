'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FileWarning, RefreshCw, Plus, X, Eye, Pencil, Trash2, Search } from 'lucide-react';
import { SupplierClaimForm } from './SupplierClaimForm';
import { SupplierClaimViewModal } from './SupplierClaimViewModal';
import type { SupplierClaim } from '@/src/lib/supplierClaimsStore';
import { WordIcon, PdfIcon } from './ExportFormatIcons';
import { exportSupplierClaimToPDF } from '@/src/lib/supplierClaimPdfExport';
import { exportSupplierClaimToWord } from '@/src/lib/supplierClaimWordExport';

const API_BASE = '/api/supplier-claims';

/**
 * Control Calidad — Reclamos a Proveedores: registra la inspección con fotos
 * y el análisis del colaborador, la IA redacta el informe de No Conformidad
 * con la plantilla oficial y se puede ver, editar, eliminar o exportar a PDF.
 */
export const SupplierClaimsPanel: React.FC<{ processSlug: string }> = () => {
  const [claims, setClaims] = useState<SupplierClaim[] | null>(null);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierClaim | null>(null);
  const [viewing, setViewing] = useState<SupplierClaim | null>(null);
  const [exportingKey, setExportingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(API_BASE);
      const data = await res.json();
      setClaims(data.claims || []);
    } catch {
      setClaims([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term || !claims) return claims || [];
    return claims.filter(c => [c.proveedor, c.referencias, c.lotes, c.materiaPrima, c.defectoTitulo].some(v => v?.toLowerCase().includes(term)));
  }, [claims, search]);

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const handleSaved = async () => {
    closeForm();
    await load();
  };

  const handleDelete = async (claim: SupplierClaim) => {
    if (!window.confirm(`¿Eliminar el informe de ${claim.proveedor} (${claim.referencias})? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`${API_BASE}/${claim.id}`, { method: 'DELETE' });
    if (!res.ok) {
      window.alert('No se pudo eliminar el informe. Intenta de nuevo.');
      return;
    }
    setViewing(null);
    await load();
  };

  const handleExport = async (claim: SupplierClaim, format: 'word' | 'pdf') => {
    setExportingKey(`${claim.id}-${format}`);
    try {
      await (format === 'word' ? exportSupplierClaimToWord(claim) : exportSupplierClaimToPDF(claim));
    } catch {
      window.alert('No se pudo generar el documento. Intenta de nuevo.');
    } finally {
      setExportingKey(null);
    }
  };

  if (claims === null) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 flex items-center justify-center gap-2 text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-sm">Cargando informes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar proveedor, referencia o lote" className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-[#003366]" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="text-[11px] font-semibold text-[#003366] hover:underline flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Actualizar</button>
          <button onClick={() => setFormOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg transition"><Plus className="w-3.5 h-3.5" /> Nuevo informe</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-2">
          <FileWarning className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm text-slate-500">{claims.length === 0 ? 'Aún no hay informes de reclamo a proveedores.' : 'Ningún informe coincide con la búsqueda.'}</p>
        </div>
      ) : (
        <div className="max-h-[65vh] overflow-auto border border-slate-200 rounded-xl bg-white">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                {['Fecha', 'Proveedor', 'Referencia', 'Lote', 'Defecto', 'Acciones'].map(h => <th key={h} className="p-2 text-left font-bold text-slate-500 bg-slate-50">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="p-2 whitespace-nowrap">{c.fechaInforme}</td>
                  <td className="p-2 font-semibold">{c.proveedor}</td>
                  <td className="p-2">{c.referencias}</td>
                  <td className="p-2">{c.lotes || '—'}</td>
                  <td className="p-2">{c.defectoTitulo || '—'}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-3 whitespace-nowrap">
                      <button onClick={() => setViewing(c)} className="text-[#003366] hover:underline flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Ver</button>
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

      {formOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">{editing ? 'Editar informe de reclamo' : 'Nuevo informe de reclamo a proveedor'}</h3>
              <button onClick={closeForm} aria-label="Cerrar"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <SupplierClaimForm initial={editing || undefined} onCancel={closeForm} onSaved={handleSaved} />
          </div>
        </div>
      )}

      {viewing && (
        <SupplierClaimViewModal
          claim={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null); setFormOpen(true); }}
          onDelete={() => handleDelete(viewing)}
        />
      )}
    </div>
  );
};
