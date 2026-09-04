import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getEmployees, getEmployeeById, createEmployee,
  createContract, processTermination, getDepartments,
  createEvaluation, getEvaluations
} from '../controllers/hrController.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize('admin'), getEmployees);
router.get('/departments', getDepartments);
router.get('/evaluations', getEvaluations);
router.get('/:id', getEmployeeById);
router.post('/', authorize('admin'), createEmployee);
router.post('/contract', authorize('admin'), createContract);
router.post('/terminate', authorize('admin'), processTermination);
router.post('/evaluations', authorize('admin'), createEvaluation);

export default router;