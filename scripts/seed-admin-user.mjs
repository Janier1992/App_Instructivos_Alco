import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

/**
 * Crea el primer usuario del Portal de Administración (/crm). No hay endpoint
 * público de registro a propósito — este script se corre una sola vez,
 * localmente, con las credenciales de Supabase ya configuradas en tu .env.
 * Los usuarios siguientes se crean desde el propio CRM (/crm/usuarios) con
 * una cuenta de rol "administrador".
 *
 * Uso:
 *   node scripts/seed-admin-user.mjs correo@alco.com.co "contraseña" "Nombre Completo" [administrador|editor]
 */
async function main() {
  const [, , email, password, fullName, roleArg] = process.argv;
  const role = roleArg || 'administrador';

  if (!email || !password || !fullName) {
    console.error(
      'Uso: node scripts/seed-admin-user.mjs <correo> <contraseña> "<Nombre Completo>" [administrador|editor]'
    );
    process.exit(1);
  }

  if (!['administrador', 'editor'].includes(role)) {
    console.error('El rol debe ser "administrador" o "editor".');
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en tu .env.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const normalizedEmail = email.trim().toLowerCase();

  const { data: existing } = await supabase
    .from('admin_users')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (existing) {
    console.error(`Ya existe un usuario del CRM con el correo "${normalizedEmail}".`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { error } = await supabase.from('admin_users').insert({
    email: normalizedEmail,
    password_hash: passwordHash,
    full_name: fullName,
    role
  });

  if (error) {
    console.error('Error creando el usuario:', error.message);
    console.error('¿Corriste el último db/schema.sql en Supabase? Ahí se crea la tabla admin_users.');
    process.exit(1);
  }

  console.log(`✅ Usuario "${normalizedEmail}" creado con rol "${role}". Ya puedes iniciar sesión en /crm/login.`);
}

main();
