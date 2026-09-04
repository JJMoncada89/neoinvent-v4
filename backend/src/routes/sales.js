import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createSale, getVentas, getVentaById, cancelSale, getDashboardStats
} from '../controllers/saleController.js';

const router = Router();
router.use(authenticate);
router.post('/', createSale);
router.get('/', getVentas);
router.get('/dashboard', getDashboardStats);
router.get('/:id', getVentaById);
router.post('/:id/cancel', cancelSale);

export default router;