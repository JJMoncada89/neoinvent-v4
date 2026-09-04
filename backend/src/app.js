import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { ENV_VARS } from './config/env.js';

// Importar rutas
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import saleRoutes from './routes/sales.js';
import clientRoutes from './routes/clients.js';
import reportRoutes from './routes/reports.js';
import fiscalRoutes from './routes/fiscal.js';
import auditRoutes from './routes/audit.js';
import hrRoutes from './routes/hr.js';
import payrollRoutes from './routes/payroll.js';
import purchaseRoutes from './routes/purchases.js';
import accountingRoutes from './routes/accounting.js';
import servicesRoutes from './routes/services.js';

dotenv.config();

const app = express();

// Seguridad
app.use(helmet());
app.use(cors({ origin: ENV_VARS.CORS_ORIGIN === '*' ? true : ENV_VARS.CORS_ORIGIN.split(',') }));

// Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(ENV_VARS.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'NEOINVENT V4 API', version: '4.0.0' });
});

// Rutas
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/sales', saleRoutes);
app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/fiscal', fiscalRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/hr', hrRoutes);
app.use('/api/v1/hr/payroll', payrollRoutes);
app.use('/api/v1/purchases', purchaseRoutes);
app.use('/api/v1/accounting', accountingRoutes);
app.use('/api/v1/services', servicesRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({
    error: ENV_VARS.NODE_ENV === 'production' ? 'Error interno' : err.message,
  });
});

export default app;