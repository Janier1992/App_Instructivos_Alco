import { NextRequest, NextResponse } from 'next/server';
import { requireRole, AdminRole } from '@/src/lib/adminAuth';
import {
  setAdminUserActive,
  updateAdminUser,
  deleteAdminUser,
  countOtherActiveAdministrators,
  findAdminUserById
} from '@/src/lib/adminUsersStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

/** true si target es Administrador activo y, al quitárselo (desactivar/degradar/eliminar), no quedaría ningún otro. */
async function wouldRemoveLastAdministrador(target: { id: string; role: AdminRole; isActive: boolean }): Promise<boolean> {
  if (target.role !== 'administrador' || !target.isActive) return false;
  const others = await countOtherActiveAdministrators(target.id);
  return others === 0;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, ['administrador']);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();

  const target = await findAdminUserById(id);
  if (!target) {
    return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
  }

  // Activar/desactivar (toggle rápido de la lista).
  if (typeof body.isActive === 'boolean' && Object.keys(body).length === 1) {
    if (id === auth.session.sub && body.isActive === false) {
      return NextResponse.json({ error: 'No puedes desactivar tu propia cuenta.' }, { status: 400 });
    }
    if (body.isActive === false && (await wouldRemoveLastAdministrador(target))) {
      return NextResponse.json({ error: 'No puedes dejar el CRM sin ningún Administrador activo.' }, { status: 400 });
    }

    const success = await setAdminUserActive(id, body.isActive);
    if (!success) {
      return NextResponse.json({ error: 'No se pudo actualizar el usuario.' }, { status: 500 });
    }
    await recordAuditEvent({
      adminUserId: auth.session.sub,
      adminEmail: auth.session.email,
      action: body.isActive ? 'activate' : 'deactivate',
      entityType: 'admin_user',
      entityId: id
    });
    return NextResponse.json({ success: true });
  }

  // Edición completa del perfil: nombre, correo, rol y/o contraseña.
  const { fullName, email, role, password } = body;

  if (role !== undefined && role !== 'administrador' && role !== 'editor') {
    return NextResponse.json({ error: 'role debe ser "administrador" o "editor".' }, { status: 400 });
  }
  if (password && String(password).length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, { status: 400 });
  }
  if (role === 'editor' && id === auth.session.sub) {
    return NextResponse.json({ error: 'No puedes quitarte a ti mismo el rol de Administrador.' }, { status: 400 });
  }
  if (role === 'editor' && (await wouldRemoveLastAdministrador(target))) {
    return NextResponse.json({ error: 'No puedes dejar el CRM sin ningún Administrador activo.' }, { status: 400 });
  }

  const result = await updateAdminUser(id, {
    fullName: fullName !== undefined ? String(fullName) : undefined,
    email: email !== undefined ? String(email) : undefined,
    role: role as AdminRole | undefined,
    password: password ? String(password) : undefined
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'No se pudo actualizar el usuario.' }, { status: 400 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'update',
    entityType: 'admin_user',
    entityId: id,
    metadata: { fullName, email, role, passwordChanged: !!password }
  });

  return NextResponse.json({ success: true, user: result.user });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, ['administrador']);
  if ('error' in auth) return auth.error;

  const { id } = await params;

  if (id === auth.session.sub) {
    return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta.' }, { status: 400 });
  }

  const target = await findAdminUserById(id);
  if (!target) {
    return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
  }
  if (await wouldRemoveLastAdministrador(target)) {
    return NextResponse.json({ error: 'No puedes eliminar al único Administrador activo del CRM.' }, { status: 400 });
  }

  const success = await deleteAdminUser(id);
  if (!success) {
    return NextResponse.json({ error: 'No se pudo eliminar el usuario.' }, { status: 500 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'delete',
    entityType: 'admin_user',
    entityId: id
  });

  return NextResponse.json({ success: true, message: 'Usuario eliminado.' });
}
