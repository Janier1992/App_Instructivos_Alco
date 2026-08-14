'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FileText,
  Video,
  UserCheck,
  Megaphone,
  Users,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Home
} from 'lucide-react';
import { AlcoLogo } from '../AlcoLogo';
import { AdminSessionPayload } from '@/src/lib/adminAuth';
import { CrmSessionProvider } from './CrmSessionContext';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/crm/documentos', label: 'Documentos', icon: FileText },
  { href: '/crm/videos', label: 'Videos', icon: Video },
  { href: '/crm/autonomia', label: 'Autonomía', icon: UserCheck },
  { href: '/crm/circulares', label: 'Circulares', icon: Megaphone },
  { href: '/crm/usuarios', label: 'Usuarios', icon: Users, adminOnly: true },
  { href: '/crm/auditoria', label: 'Auditoría', icon: ShieldCheck, adminOnly: true }
];

export const CrmShell: React.FC<{ user: AdminSessionPayload; children: React.ReactNode }> = ({
  user,
  children
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || user.role === 'administrador');

  const handleLogout = async () => {
    await fetch('/api/crm/auth/logout', { method: 'POST' });
    // Al cerrar sesión se sale por completo del portal hacia la vista
    // principal — si luego se quiere reingresar (Ctrl+Q o el engranaje),
    // el middleware ya no encontrará sesión válida y pedirá login de nuevo.
    router.push('/');
  };

  // "Volver a la App Principal" navega a "/" sin tocar la sesión — el
  // usuario sigue con la sesión activa y puede reentrar al CRM con Ctrl+Q o
  // el engranaje sin volver a iniciar sesión. Solo "Cerrar sesión" la
  // termina de verdad (y ahí sí exige login de nuevo para volver a entrar).
  const AccountActions = (
    <>
      <div className="px-1">
        <p className="text-xs font-bold text-white truncate">{user.fullName || user.email}</p>
        <p className="text-[11px] text-slate-400 capitalize">{user.role}</p>
      </div>
      <Link
        href="/"
        onClick={() => setMobileNavOpen(false)}
        className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-emerald-300 hover:text-white hover:bg-emerald-600/20 rounded-xl transition"
      >
        <Home className="w-4 h-4" />
        Volver a la App Principal
      </Link>
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition"
      >
        <LogOut className="w-4 h-4" />
        Cerrar sesión
      </button>
    </>
  );

  const NavLinks = (
    <nav className="space-y-1">
      {visibleItems.map(item => {
        const Icon = item.icon;
        const isActive = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileNavOpen(false)}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
              isActive
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar — escritorio */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-[#002244] border-r border-white/10 p-4 gap-6">
        <div className="bg-white px-2.5 py-1.5 rounded-lg shadow-md flex items-center w-fit">
          <AlcoLogo className="h-7" />
        </div>
        <div>
          <p className="text-[11px] font-bold text-blue-300 uppercase tracking-wider px-1">Portal de Administración</p>
        </div>
        {NavLinks}
        <div className="mt-auto pt-4 border-t border-white/10 space-y-2">
          {AccountActions}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header móvil */}
        <header className="lg:hidden bg-[#002244] text-white flex items-center justify-between px-4 py-3 sticky top-0 z-40">
          <div className="bg-white px-2 py-1 rounded-lg flex items-center">
            <AlcoLogo className="h-6" />
          </div>
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="p-2 bg-white/10 rounded-lg"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {mobileNavOpen && (
          <div className="lg:hidden bg-[#002244] text-white p-4 space-y-4 border-b border-white/10">
            {NavLinks}
            <div className="pt-2 border-t border-white/10 space-y-2">
              {AccountActions}
            </div>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6">
          <CrmSessionProvider user={user}>{children}</CrmSessionProvider>
        </main>
      </div>
    </div>
  );
};
