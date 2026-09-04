import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { pool } from '../config/database.js';

const router = Router();
router.use(authenticate);

// Reporte de ventas por rango de fechas
router.get('/sales', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const desdeDate = desde || '2024-01-01';
    const hastaDate = hasta || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT DATE(creado_en) as fecha, COUNT(*) as ventas, SUM(total) as total
       FROM ventas WHERE creado_en >= $1 AND creado_en <= $2 + INTERVAL '1 day' AND estado != 'CANCELADA'
       GROUP BY DATE(creado_en) ORDER BY fecha DESC`,
      [desdeDate, hastaDate]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reporte fiscal IVA
router.get('/fiscal/iva', async (req, res) => {
  try {
    const { mes, anio } = req.query;
    const mesActual = mes || new Date().getMonth() + 1;
    const anioActual = anio || new Date().getFullYear();

    const result = await pool.query(
      `SELECT COUNT(*) as facturas, SUM(subtotal) as base_imponible, SUM(iva) as total_iva, SUM(total) as total
       FROM ventas WHERE EXTRACT(MONTH FROM creado_en) = $1 AND EXTRACT(YEAR FROM creado_en) = $2 AND estado != 'CANCELADA'`,
      [mesActual, anioActual]
    );

    res.json({
      periodo: `${mesActual}/${anioActual}`,
      ...result.rows[0],
      iva_a_declarar: result.rows[0].total_iva,
      leyenda: 'Declaración de IVA según normativa SENIAT Venezuela',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Top productos más vendidos
router.get('/top-products', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.nombre, SUM(vi.cantidad) as unidades, SUM(vi.subtotal) as ingresos
       FROM venta_items vi JOIN productos p ON p.id = vi.producto_id
       GROUP BY p.nombre ORDER BY unidades DESC LIMIT 20`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;