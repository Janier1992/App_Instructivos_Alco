'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, AlertCircle } from 'lucide-react';
import { AlcoLogo } from '../AlcoLogo';

export const CrmLoginForm: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/crm/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'No se pudo iniciar sesión.');
        return;
      }

      const next = searchParams?.get('next') || '/crm';
      router.push(next);
      router.refresh();
    } catch (err: any) {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-7 space-y-6">
      <div className="flex flex-col items-center gap-3">
        <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
          <AlcoLogo className="h-9" />
        </div>
        <div className="text-center">
          <h1 className="text-base font-extrabold text-[#003366]">Portal de Administración</h1>
          <p className="text-xs text-slate-500 mt-0.5">Control de Calidad Alco S.A.S.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Correo</label>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003366]"
            placeholder="nombre@alco.com.co"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Contraseña</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003366]"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#003366] hover:bg-[#002244] text-white font-bold text-sm rounded-xl shadow transition disabled:opacity-50"
        >
          <LogIn className="w-4 h-4" />
          {isSubmitting ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
};
