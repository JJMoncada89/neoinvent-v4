import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { audit } from '../middleware/auditLog.js';
import {
  createSale, getVentas, getVentaById, cancelSale, getDashboardStats
} from '../controllers/saleController.js';

const router = Router();
router.use(authenticate);
router.post('/', audit('ventas', 'CREATE'), createSale);
router.get('/', getVentas);
router.get('/dashboard', getDashboardStats);
router.get('/:id', getVentaById);
router.post('/:id/cancel', audit('ventas', 'CANCEL'), cancelSale);

export default router;