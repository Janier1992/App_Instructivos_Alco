'use client';

import React, { createContext, useContext } from 'react';
import { AdminSessionPayload } from '@/src/lib/adminAuth';

const CrmSessionContext = createContext<AdminSessionPayload | null>(null);

export const CrmSessionProvider: React.FC<{ user: AdminSessionPayload; children: React.ReactNode }> = ({
  user,
  children
}) => <CrmSessionContext.Provider value={user}>{children}</CrmSessionContext.Provider>;

/**
 * Sesión del usuario del CRM ya verificada por el layout server-side — se usa
 * para decisiones de UI (ej. ocultar "Eliminar" a un Editor). La autorización
 * real siempre se valida de nuevo en el backend (ver requireRole en cada
 * route handler); esto es solo para no mostrar acciones que el backend va a
 * rechazar de todos modos.
 */
export function useCrmSession(): AdminSessionPayload {
  const session = useContext(CrmSessionContext);
  if (!session) {
    throw new Error('useCrmSession debe usarse dentro de CrmSessionProvider.');
  }
  return session;
}
