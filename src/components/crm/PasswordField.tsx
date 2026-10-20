'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder?: string;
  minLength?: number;
}

/** Campo de contraseña con el "ojito" para mostrar/ocultar lo escrito. */
export const PasswordField: React.FC<PasswordFieldProps> = ({
  label,
  value,
  onChange,
  autoComplete,
  placeholder = '••••••••',
  minLength
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="text-xs font-bold text-slate-700 block mb-1">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-10 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003366]"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-[#003366] transition"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
