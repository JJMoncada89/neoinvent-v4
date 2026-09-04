import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getProducts, getProductById, createProduct,
  updateProduct, deleteProduct, addProductStock, removeProductStock
} from '../controllers/productController.js';

const router = Router();
router.use(authenticate);
router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.post('/stock/add', addProductStock);
router.post('/stock/remove', removeProductStock);

export default router;