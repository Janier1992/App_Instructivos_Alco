'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { AlcoLogo } from '../AlcoLogo';
import { PasswordField } from './PasswordField';

/** Pantalla a la que llega el usuario desde el enlace del correo: fija la nueva contraseña. */
export const CrmResetPasswordForm: React.FC = () => {
  const token = useSearchParams()?.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/crm/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'No se pudo cambiar la contraseña.');
        return;
      }
      setDone(true);
    } catch {
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
          <h1 className="text-base font-extrabold text-[#003366]">Nueva contraseña</h1>
          <p className="text-xs text-slate-500 mt-0.5">Control de Calidad Alco S.A.S.</p>
        </div>
      </div>

      {done ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Contraseña actualizada. Ya puedes ingresar con la nueva contraseña.
          </div>
          <Link
            href="/crm/login"
            className="w-full flex items-center justify-center py-2.5 bg-[#003366] hover:bg-[#002244] text-white font-bold text-sm rounded-xl shadow transition"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      ) : !token ? (
        <p className="text-xs text-rose-700 text-center">
          El enlace está incompleto. Solicita uno nuevo desde "¿Olvidaste tu contraseña?".
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField
            label="Nueva contraseña"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            minLength={8}
          />
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
            <KeyRound className="w-4 h-4" />
            {isSubmitting ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
        </form>
      )}
    </div>
  );
};
