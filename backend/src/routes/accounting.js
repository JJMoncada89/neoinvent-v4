import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getChartOfAccounts, getJournal, getBalance, getPnL, getDeclaracionIVA } from '../controllers/accountingController.js';

const router = Router();
router.use(authenticate);
router.get('/coa', getChartOfAccounts);
router.get('/journal', getJournal);
router.get('/balance', getBalance);
router.get('/pnl', getPnL);
router.get('/iva', getDeclaracionIVA);

export default router;