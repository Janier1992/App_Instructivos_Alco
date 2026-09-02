'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ShieldCheck, AlertTriangle, CheckCircle2, BadgeCheck, Clock } from 'lucide-react';
import { ProcessPicker } from './ProcessPicker';

interface SelfCertResult {
  criterionId: string;
  parameter: string;
  passed: boolean;
}

interface SelfCertification {
  id: string;
  orderReference: string;
  collaboratorName: string;
  competencyLevel: string | null;
  results: SelfCertResult[];
  allPassed: boolean;
  requiresQualityReview: boolean;
  notes?: string;
  qualityReviewedAt?: string;
  qualityReviewNote?: string;
  createdAt: string;
}

const LEVEL_META: Record<string, { label: string; className: string }> = {
  U: { label: 'Nivel U — capacitado', className: 'bg-blue-100 text-blue-800' },
  O: { label: 'Nivel O — experto', className: 'bg-emerald-100 text-emerald-800' },
  L: { label: 'Nivel L — en aprendizaje', className: 'bg-amber-100 text-amber-800' },
  I: { label: 'Nivel I — en inducción', className: 'bg-slate-200 text-slate-700' }
};

/**
 * Auditoría de las verificaciones que el Supervisor registra por unidad
 * (el ensamblador no puede tener el teléfono en turno, así que es el
 * Supervisor quien recorre el puesto y confirma) — las que quedaron
 * marcadas para revisión (por criterio no conforme o por no estar
 * verificado en nivel U/O) aparecen primero y sin revisar. Revisar aquí
 * NUNCA modifica lo que el Supervisor certificó, solo deja constancia de
 * que Calidad la auditó.
 */
export const CrmSelfCertificationsManager: React.FC = () => {
  const [processSlug, setProcessSlug] = useState('');
  const [certifications, setCertifications] = useState<SelfCertification[]>([]);
  const [loading, setLoading] = useState(false);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/self-certifications${processSlug ? `?processSlug=${encodeURIComponent(processSlug)}` : ''}`);
      const data = await res.json();
      if (data.success) setCertifications(data.certifications || []);
    } catch (err) {
      console.error('Error cargando autocertificaciones:', err);
    } finally {
      setLoading(false);
    }
  }, [processSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReview = async (id: string) => {
    setSavingId(id);
    try {
      const res = await fetch(`/api/crm/self-certifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewNote: noteDrafts[id] || '' })
      });
      const data = await res.json();
      if (data.success) {
        await load();
      } else {
        alert(data.error || 'No se pudo registrar la revisión.');
      }
    } catch (err) {
      console.error('Error registrando revisión:', err);
    } finally {
      setSavingId(null);
    }
  };

  const pendingCount = certifications.filter(c => c.requiresQualityReview && !c.qualityReviewedAt).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Verificaciones de Supervisor</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lo que el Supervisor confirma por unidad antes de reportarla a Calidad — {pendingCount} pendiente{pendingCount === 1 ? '' : 's'} de auditar.
          </p>
        </div>
        <ProcessPicker value={processSlug} onChange={setProcessSlug} allowAll />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <span className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            Historial
          </span>
          <button onClick={load} className="text-[11px] font-semibold text-[#003366] hover:underline flex items-center gap-1">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {certifications.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-8">
            {loading ? 'Cargando...' : 'Todavía no hay verificaciones registradas para este filtro.'}
          </p>
        ) : (
          <div className="space-y-3">
            {certifications.map(cert => {
              const level = cert.competencyLevel ? LEVEL_META[cert.competencyLevel] : null;
              const pending = cert.requiresQualityReview && !cert.qualityReviewedAt;
              return (
                <div key={cert.id} className={`p-4 rounded-xl border space-y-2 ${pending ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200 bg-slate-50/40'}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">{cert.orderReference}</span>
                      <span className="text-[11px] text-slate-500">— {cert.collaboratorName}</span>
                      {level && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${level.className}`}>{level.label}</span>}
                      {!level && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">Sin verificar</span>}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(cert.createdAt).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {cert.allPassed ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Todos los criterios cumplen
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" /> Algún criterio no cumple
                      </span>
                    )}
                    {cert.qualityReviewedAt ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        <BadgeCheck className="w-3 h-3" /> Auditada por Calidad
                      </span>
                    ) : cert.requiresQualityReview ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" /> Pendiente de auditoría
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">No requiere auditoría obligatoria</span>
                    )}
                  </div>

                  <ul className="space-y-0.5">
                    {cert.results.map((r, idx) => (
                      <li key={idx} className={`text-[11px] flex items-center gap-1.5 ${r.passed ? 'text-slate-600' : 'text-rose-700 font-semibold'}`}>
                        {r.passed ? '✓' : '✕'} {r.parameter}
                      </li>
                    ))}
                  </ul>
                  {cert.notes && <p className="text-[11px] text-slate-600 italic">"{cert.notes}"</p>}

                  {cert.qualityReviewNote && (
                    <p className="text-[11px] text-slate-600 bg-white border border-slate-200 rounded-lg p-2">
                      <span className="font-bold text-slate-500 block text-[10px] uppercase tracking-wider mb-0.5">Nota de auditoría</span>
                      {cert.qualityReviewNote}
                    </p>
                  )}

                  {!cert.qualityReviewedAt && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={noteDrafts[cert.id] ?? ''}
                        onChange={e => setNoteDrafts(prev => ({ ...prev, [cert.id]: e.target.value }))}
                        placeholder="Nota de auditoría (opcional)"
                        className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
                      />
                      <button
                        onClick={() => handleReview(cert.id)}
                        disabled={savingId === cert.id}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition disabled:opacity-50 shrink-0"
                      >
                        Marcar auditada
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
