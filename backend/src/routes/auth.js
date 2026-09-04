import { Router } from 'express';
import { register, login, logout } from '../controllers/authController.js';
import { auditAuth } from '../middleware/auditLog.js';

const router = Router();
router.post('/register', auditAuth, register);
router.post('/login', auditAuth, login);
router.post('/logout', auditAuth, logout);

export default router;