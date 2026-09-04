import { pool } from './database.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const runMigrations = async () => {
  console.log('🗄️ Ejecutando migraciones de PostgreSQL...');

  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf8');

  try {
    await pool.query(schema);
    console.log('✅ Migraciones ejecutadas exitosamente');
  } catch (error) {
    // Si es error de "already exists" está bien
    if (error.code === '42P07') {
      console.log('ℹ️ Las tablas ya existen, omitiendo');
    } else {
      console.error('❌ Error en migraciones:', error.message);
      throw error;
    }
  }

  await pool.end();
  process.exit(0);
};

runMigrations().catch(err => {
  console.error('Error fatal en migraciones:', err);
  process.exit(1);
});