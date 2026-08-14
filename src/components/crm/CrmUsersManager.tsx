'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Users, UserPlus, ShieldOff, ShieldCheck, Lock } from 'lucide-react';
import { useCrmSession } from './CrmSessionContext';

interface AdminUserRow {
  id: string;
  email: string;
  fullName: string;
  role: 'administrador' | 'editor';
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export const CrmUsersManager: React.FC = () => {
  const { role: myRole, sub: myId } = useCrmSession();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [newRole, setNewRole] = useState<'administrador' | 'editor'>('editor');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/crm/users');
      const data = await res.json();
      if (data.success) setUsers(data.users || []);
    } catch (err) {
      console.error('Error cargando usuarios del CRM:', err);
    }
  }, []);

  useEffect(() => {
    if (myRole === 'administrador') loadUsers();
  }, [myRole, loadUsers]);

  if (myRole !== 'administrador') {
    return (
      <div className="p-10 text-center bg-white rounded-xl border border-slate-200 space-y-2">
        <Lock className="w-8 h-8 text-slate-400 mx-auto" />
        <p className="text-sm font-semibold text-slate-600">Solo un Administrador puede gestionar usuarios del CRM.</p>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!email.trim() || !password.trim() || !fullName.trim()) {
      setSaveMsg('⚠️ Completa correo, contraseña y nombre.');
      return;
    }
    setIsSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch('/api/crm/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, role: newRole })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveMsg('✅ Usuario creado.');
        setEmail('');
        setPassword('');
        setFullName('');
        await loadUsers();
      } else {
        setSaveMsg(`❌ Error: ${data.error || 'No se pudo crear el usuario.'}`);
      }
    } catch (err: any) {
      setSaveMsg(`❌ Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (user: AdminUserRow) => {
    setBusyId(user.id);
    try {
      const res = await fetch(`/api/crm/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive })
      });
      const data = await res.json();
      if (data.success) {
        await loadUsers();
      } else {
        alert(data.error || 'No se pudo actualizar el usuario.');
      }
    } catch (err) {
      console.error('Error actualizando usuario:', err);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Usuarios del CRM</h1>
        <p className="text-xs text-slate-500 mt-0.5">Gestiona quién puede administrar contenido y con qué rol.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800 border-b border-slate-200 pb-2">
              <UserPlus className="w-4 h-4 text-[#003366]" />
              <span>Nuevo Usuario</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nombre completo:</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Correo:</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Contraseña temporal:</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs" placeholder="Mínimo 8 caracteres" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Rol:</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value as 'administrador' | 'editor')} className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs">
                  <option value="editor">Editor (crea/edita/publica, no elimina)</option>
                  <option value="administrador">Administrador (control total)</option>
                </select>
              </div>
              <button
                onClick={handleCreate}
                disabled={isSaving}
                className="w-full py-2.5 bg-[#003366] hover:bg-[#002244] text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {isSaving ? 'Creando...' : 'Crear Usuario'}
              </button>
              {saveMsg && (
                <div className={`p-3 rounded-xl text-xs font-medium border ${
                  saveMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-amber-50 text-amber-900 border-amber-200'
                }`}>
                  {saveMsg}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
                <Users className="w-4 h-4 text-[#003366]" />
                <span>Usuarios ({users.length})</span>
              </div>
              <button onClick={loadUsers} className="text-[11px] font-semibold text-[#003366] hover:underline flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                Actualizar
              </button>
            </div>

            <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm truncate">{u.fullName}</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">{u.role}</span>
                      {!u.isActive && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-700">Inactivo</span>}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  </div>
                  <button
                    onClick={() => handleToggleActive(u)}
                    disabled={busyId === u.id || u.id === myId}
                    title={u.id === myId ? 'No puedes desactivar tu propia cuenta' : u.isActive ? 'Desactivar' : 'Activar'}
                    className={`p-2 rounded-lg transition disabled:opacity-40 shrink-0 ${
                      u.isActive ? 'bg-rose-50 hover:bg-rose-100 text-rose-600' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {u.isActive ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
