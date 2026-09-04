import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  min: 0,
  idleTimeoutMillis: 30000
});

pool.on('connect', (client) => {
  console.log('📊 PostgreSQL conectado');
});

pool.on('error', (err) => {
  console.error('⚠️ Error en pool PostgreSQL:', err);
  process.exit(-1);
});

export { pool };