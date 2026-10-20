'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, AlertCircle, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { AlcoLogo } from '../AlcoLogo';
import { PasswordField } from './PasswordField';

type Mode = 'login' | 'reset';

const INPUT_CLASS =
  'w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003366]';
const SUBMIT_CLASS =
  'w-full flex items-center justify-center gap-2 py-2.5 bg-[#003366] hover:bg-[#002244] text-white font-bold text-sm rounded-xl shadow transition disabled:opacity-50';

export const CrmLoginForm: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword('');
    setRecoveryKey('');
    setNewPassword('');
  };

  const postJson = async (url: string, body: object) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return { ok: res.ok && data.success, data };
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      const { ok, data } = await postJson('/api/crm/auth/login', { email, password });
      if (!ok) {
        setError(data.error || 'No se pudo iniciar sesión.');
        return;
      }
      router.push(searchParams?.get('next') || '/crm');
      router.refresh();
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { ok, data } = await postJson('/api/crm/auth/reset-password', { email, recoveryKey, newPassword });
      if (!ok) {
        setError(data.error || 'No se pudo cambiar la contraseña.');
        return;
      }
      switchMode('login');
      setNotice('Contraseña actualizada. Ya puedes ingresar con la nueva contraseña.');
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const emailField = (
    <div>
      <label className="text-xs font-bold text-slate-700 block mb-1">Correo</label>
      <input
        type="email"
        required
        autoComplete="username"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className={INPUT_CLASS}
        placeholder="nombre@alco.com.co"
      />
    </div>
  );

  return (
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-7 space-y-6">
      <div className="flex flex-col items-center gap-3">
        <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
          <AlcoLogo className="h-9" />
        </div>
        <div className="text-center">
          <h1 className="text-base font-extrabold text-[#003366]">
            {mode === 'login' ? 'Portal de Administración' : 'Restablecer contraseña'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Control de Calidad Alco S.A.S.</p>
        </div>
      </div>

      {mode === 'login' ? (
        <form onSubmit={handleLogin} className="space-y-4">
          {emailField}
          <PasswordField label="Contraseña" value={password} onChange={setPassword} autoComplete="current-password" />
          <div className="text-right -mt-2">
            <button
              type="button"
              onClick={() => switchMode('reset')}
              className="text-xs font-semibold text-[#003366] hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
          {notice && (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {notice}
            </div>
          )}
          {error && <ErrorBox message={error} />}
          <button type="submit" disabled={isSubmitting} className={SUBMIT_CLASS}>
            <LogIn className="w-4 h-4" />
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          <p className="text-xs text-slate-500">
            Escribe tu correo, la clave de recuperación y la nueva contraseña. Usa el ojito para verificar lo que
            escribes.
          </p>
          {emailField}
          <PasswordField
            label="Clave de recuperación"
            value={recoveryKey}
            onChange={setRecoveryKey}
            autoComplete="off"
            placeholder="Clave de recuperación"
          />
          <PasswordField
            label="Nueva contraseña"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            minLength={8}
          />
          {error && <ErrorBox message={error} />}
          <button type="submit" disabled={isSubmitting} className={SUBMIT_CLASS}>
            <KeyRound className="w-4 h-4" />
            {isSubmitting ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
          <button
            type="button"
            onClick={() => switchMode('login')}
            className="w-full text-xs font-semibold text-slate-500 hover:text-[#003366] transition"
          >
            Volver al inicio de sesión
          </button>
        </form>
      )}

      <Link
        href="/"
        className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#003366] transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Volver a la aplicación principal
      </Link>
    </div>
  );
};

const ErrorBox: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800">
    <AlertCircle className="w-4 h-4 shrink-0" />
    {message}
  </div>
);
