import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { audit } from '../middleware/auditLog.js';
import {
  getProducts, getProductById, createProduct,
  updateProduct, deleteProduct, addProductStock, removeProductStock
} from '../controllers/productController.js';

const router = Router();
router.use(authenticate);
router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', audit('productos', 'CREATE'), createProduct);
router.put('/:id', audit('productos', 'UPDATE'), updateProduct);
router.delete('/:id', audit('productos', 'DELETE'), deleteProduct);
router.post('/stock/add', audit('productos', 'UPDATE'), addProductStock);
router.post('/stock/remove', audit('productos', 'UPDATE'), removeProductStock);

export default router;