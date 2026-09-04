import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { SENIAT_CONFIG } from '../config/seniat.js';
import { pool } from '../config/database.js';

const router = Router();
router.use(authenticate);

// Obtener configuración fiscal de la empresa
router.get('/config', async (req, res) => {
  res.json({
    rif: process.env.SENIAT_RIF || 'J-00000000-0',
    empresa: process.env.EMPRESA_NOMBRE || 'Mi Negocio C.A.',
    tasas_iva: SENIAT_CONFIG.TAX_RATES,
    tipos_comprobante: SENIAT_CONFIG.COMPROBANT_TYPES,
    leyendas: SENIAT_CONFIG.LEGENDS,
  });
});

// Emitir factura fiscal
router.post('/emit', async (req, res) => {
  try {
    const { venta_id, numero_control, rif_receptor } = req.body;
    // En producción: llamar a la API del SENIAT
    res.json({
      message: 'Factura emitida (modo local)',
      numero_control,
      estado: SENIAT_CONFIG.STATUSES.AUTORIZADA,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Consultar facturas emitidas
router.get('/invoices', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM facturas_seniat ORDER BY creado_en DESC LIMIT 100'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;