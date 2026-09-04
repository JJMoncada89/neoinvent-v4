/**
 * SEED IDEMPOTENTE — crea el usuario admin inicial y datos demo
 * si la base está vacía. Ejecutar en Render: npm run seed
 */
import { pool } from './database.js';
import bcrypt from 'bcryptjs';

const run = async () => {
  console.log('🌱 Ejecutando seed...');

  // 1. Admin por defecto si no existe ningún usuario
  const admins = await pool.query("SELECT COUNT(*)::int AS n FROM usuarios");
  if (admins.rows[0].n === 0) {
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
    await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ($1, $2, $3, 'admin')`,
      [process.env.ADMIN_NAME || 'Administrador', process.env.ADMIN_EMAIL || 'admin@neoinvent.local', hash]
    );
    console.log('✅ Admin creado:', process.env.ADMIN_EMAIL || 'admin@neoinvent.local', '/', process.env.ADMIN_PASSWORD || 'admin123');
  } else {
    console.log('ℹ️ Usuarios ya existen — omitiendo admin');
  }

  // 2. Categorías demo (si no hay ninguna)
  const cats = await pool.query('SELECT COUNT(*)::int AS n FROM categorias');
  if (cats.rows[0].n === 0) {
    await pool.query(
      `INSERT INTO categorias (nombre, activa) VALUES ('Comestibles', true), ('Bebidas', true), ('Limpieza', true)`
    );
    console.log('✅ Categorías demo creadas');
  }

  await pool.end();
  console.log('🌱 Seed completado.');
  process.exit(0);
};

run().catch(async (e) => {
  console.error('❌ Seed falló:', e.message);
  await pool.end().catch(() => {});
  process.exit(1);
});