import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getRate, setManualRate } from '../controllers/currencyController.js';

const router = Router();
router.get('/rate', getRate);
router.put('/rate', authenticate, setManualRate);

export default router;
