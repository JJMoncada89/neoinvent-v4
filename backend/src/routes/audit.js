import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { unlockAudit, getAuditTrail, getIntegrity, exportAudit } from '../controllers/auditController.js';

const router = Router();
router.use(authenticate);

// POST /api/v1/audit/unlock — Desbloquear con clave maestra
router.post('/unlock', unlockAudit);

// GET /api/v1/audit/trail — Consultar audit trail
router.get('/trail', getAuditTrail);

// GET /api/v1/audit/integrity — Verificar integridad de la cadena
router.get('/integrity', getIntegrity);

// GET /api/v1/audit/export — Exportar para análisis forense
router.get('/export', exportAudit);

export default router;