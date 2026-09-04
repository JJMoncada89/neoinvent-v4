import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getEmployees, getEmployeeById, createEmployee,
  createContract, processTermination, getDepartments
} from '../controllers/hrController.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize('admin'), getEmployees);
router.get('/departments', getDepartments);
router.get('/:id', getEmployeeById);
router.post('/', authorize('admin'), createEmployee);
router.post('/contract', authorize('admin'), createContract);
router.post('/terminate', authorize('admin'), processTermination);

export default router;