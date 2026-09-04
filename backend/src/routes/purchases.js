import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getRequisitions, createRequisition, getPurchaseOrders, createPurchaseOrder, createGoodsReceipt, rateSupplier, getSupplierRatings } from '../controllers/purchaseController.js';

const router = Router();
router.use(authenticate);
router.get('/requisitions', getRequisitions);
router.post('/requisitions', authorize('admin'), createRequisition);
router.get('/orders', getPurchaseOrders);
router.post('/orders', authorize('admin'), createPurchaseOrder);
router.post('/receipts', authorize('admin'), createGoodsReceipt);
router.get('/ratings', getSupplierRatings);
router.post('/ratings', authorize('admin'), rateSupplier);

export default router;