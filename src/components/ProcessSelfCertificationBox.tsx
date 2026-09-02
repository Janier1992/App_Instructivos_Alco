'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, ChevronDown, ChevronUp, Send, RefreshCw, Check, X, AlertTriangle, BadgeCheck } from 'lucide-react';

interface Criterion {
  id: string;
  parameter: string;
  acceptance: string;
  rejection: string;
}

interface ProcessSelfCertificationBoxProps {
  processSlug: string;
}

/**
 * Verificación por unidad: el ensamblador no puede tener el teléfono
 * durante el turno operativo, así que quien registra la verificación es el
 * Supervisor — recorriendo el puesto de trabajo, con su nombre y contra
 * los criterios reales del proceso, confirma que la pieza cumple antes de
 * reportarla a Calidad. Solo queda exenta de revisión obligatoria si el
 * nombre registrado está verificado en nivel U u O del roster ILUO (ver
 * Autonomía); si no, o si algún criterio no cumple, queda marcada para que
 * Calidad la audite. El servidor decide la autorización, nunca este
 * componente.
 */
export const ProcessSelfCertificationBox: React.FC<ProcessSelfCertificationBoxProps> = ({ processSlug }) => {
  const [expanded, setExpanded] = useState(false);
  const [criteria, setCriteria] = useState<Criterion[] | null>(null);
  const [certifiedNames, setCertifiedNames] = useState<string[]>([]);
  const [orderReference, setOrderReference] = useState('');
  const [collaboratorName, setCollaboratorName] = useState('');
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ requiresQualityReview: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const [procRes, certRes] = await Promise.all([
        fetch(`/api/processes/${processSlug}`),
        fetch(`/api/competencies?processSlug=${encodeURIComponent(processSlug)}`)
      ]);
      const procData = await procRes.json();
      const certData = await certRes.json();
      const list: Criterion[] = (procData.criteria || []).map((c: any) => ({ id: c.id, parameter: c.parameter, acceptance: c.acceptance, rejection: c.rejection }));
      setCriteria(list);
      setAnswers(Object.fromEntries(list.map(c => [c.id, null])));
      if (certData.success) setCertifiedNames((certData.certified || []).map((c: any) => c.name));
    } catch (err) {
      console.error('Error cargando autocertificación:', err);
      setCriteria([]);
    }
  }, [processSlug]);

  useEffect(() => {
    load();
  }, [load]);

  if (!criteria || criteria.length === 0) return null;

  const allAnswered = criteria.every(c => answers[c.id] !== null && answers[c.id] !== undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderReference.trim() || !collaboratorName.trim() || !allAnswered) return;

    setIsSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/self-certifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processSlug,
          orderReference,
          collaboratorName,
          results: criteria.map(c => ({ criterionId: c.id, parameter: c.parameter, passed: !!answers[c.id] })),
          notes: notes || undefined
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult({ requiresQualityReview: data.certification.requiresQualityReview });
        setOrderReference('');
        setNotes('');
        setAnswers(Object.fromEntries(criteria.map(c => [c.id, null])));
      } else {
        alert(data.error || 'No se pudo registrar la autocertificación.');
      }
    } catch (err) {
      console.error('Error enviando autocertificación:', err);
      alert('Error de conexión. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2 px-5 py-4 hover:bg-teal-50/50 transition"
      >
        <div className="flex items-center gap-2.5 text-left">
          <div className="p-2 bg-teal-100 text-teal-700 rounded-xl shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">✅ Verificación de Supervisor por Unidad</h3>
            <p className="text-xs text-slate-500">El supervisor confirma, con su nombre, que la unidad cumple antes de reportarla a Calidad.</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-slate-100 pt-4">
          {result && (
            <div className={`p-3 rounded-lg border text-xs font-semibold flex items-start gap-2 ${
              result.requiresQualityReview ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              {result.requiresQualityReview ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> : <BadgeCheck className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>
                {result.requiresQualityReview
                  ? 'Verificación registrada — queda marcada para revisión de Calidad (por un criterio no conforme, o porque este nombre aún no está verificado en nivel U/O para este proceso).'
                  : '✅ Verificación aceptada — el supervisor queda registrado como responsable. Calidad puede auditarla, pero no bloquea el avance de la pieza.'}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={orderReference}
                onChange={e => setOrderReference(e.target.value)}
                placeholder="Referencia u orden de la unidad"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              <input
                type="text"
                list="self-cert-names"
                value={collaboratorName}
                onChange={e => setCollaboratorName(e.target.value)}
                placeholder="Nombre del supervisor"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              <datalist id="self-cert-names">
                {certifiedNames.map(name => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              {criteria.map(c => (
                <div key={c.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800 flex-1">{c.parameter}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setAnswers(prev => ({ ...prev, [c.id]: true }))}
                        className={`flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg border transition ${
                          answers[c.id] === true ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-300 hover:border-emerald-400'
                        }`}
                      >
                        <Check className="w-3 h-3" /> Cumple
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnswers(prev => ({ ...prev, [c.id]: false }))}
                        className={`flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg border transition ${
                          answers[c.id] === false ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-500 border-slate-300 hover:border-rose-400'
                        }`}
                      >
                        <X className="w-3 h-3" /> No cumple
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">{c.acceptance}</p>
                </div>
              ))}
            </div>

            {Object.values(answers).some(v => v === false) && (
              <div className="flex items-start gap-1.5 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Marcaste un criterio como "No cumple" — pide que se corrija antes de reportarla, o descríbelo en las notas. Esto va a quedar marcado para revisión de Calidad.</span>
              </div>
            )}

            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notas (opcional)"
              rows={2}
              maxLength={1000}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="submit"
                disabled={isSubmitting || !orderReference.trim() || !collaboratorName.trim() || !allAnswered}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] rounded-lg transition disabled:opacity-50 shrink-0"
              >
                {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Verificar con mi nombre
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
