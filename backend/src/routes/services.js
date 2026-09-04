import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getServices, createService, getAssets, createAsset, getWorkOrders, createWorkOrder, resolveWorkOrder } from '../controllers/servicesController.js';

const router = Router();
router.use(authenticate);
router.get('/catalog', getServices);
router.post('/catalog', authorize('admin'), createService);
router.get('/assets', getAssets);
router.post('/assets', authorize('admin'), createAsset);
router.get('/workorders', getWorkOrders);
router.post('/workorders', createWorkOrder);
router.post('/workorders/:id/resolve', resolveWorkOrder);

export default router;