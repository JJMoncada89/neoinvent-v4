import app from './src/app.js';
import { ENV_VARS } from './src/config/env.js';
import { pool } from './src/config/database.js';

const PORT = ENV_VARS.PORT;

const server = app.listen(PORT, () => {
  console.log(`\n🚀 NEOINVENT V4 Backend corriendo en puerto ${PORT}`);
  console.log(`   📍 Entorno: ${ENV_VARS.NODE_ENV}`);
  console.log(`   🌐 CORS: ${ENV_VARS.CORS_ORIGIN}`);
  console.log(`   🏛️  SENIAT RIF: ${process.env.SENIAT_RIF || 'No configurado'}\n`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⏹️ Cerrando servidor...');
  await pool.end();
  server.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('⏹️ Cerrando servidor...');
  await pool.end();
  server.close();
  process.exit(0);
});