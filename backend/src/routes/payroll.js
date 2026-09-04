import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { runPayroll, getPayrollRuns, getPayrollDetail } from '../controllers/payrollController.js';

const router = Router();
router.use(authenticate);
router.post('/run', authorize('admin'), runPayroll);
router.get('/runs', getPayrollRuns);
router.get('/runs/:id/detalle', getPayrollDetail);

export default router;