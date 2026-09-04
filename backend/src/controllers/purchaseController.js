/* COMPRAS — Requisiciones, Órdenes de Compra y Recepciones */
import { pool } from '../config/database.js';
import { registrarAuditoria } from '../services/auditService.js';

// ----- Requisiciones -----
export const getRequisitions = async (req, res) => {
  try { const r = await pool.query('SELECT * FROM purchase_requisitions ORDER BY creado_en DESC'); res.json(r.rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

export const createRequisition = async (req, res) => {
  try {
    const { department, priority, justification, items } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: 'Items requeridos' });
    const r = await pool.query(
      `INSERT INTO purchase_requisitions (requestor_id, department, priority, justification, items, status) VALUES ($1,$2,$3,$4,$5,'BORRADOR') RETURNING *`,
      [req.user?.userId, department || 'GENERAL', priority || 'NORMAL', justification || null, JSON.stringify(items)]
    );
    await registrarAuditoria({ entityType: 'purchase_requisitions', entityId: r.rows[0].id, action: 'CREATE', userId: req.user?.userId, userName: req.user?.userName || 'system', afterData: { department, priority, items }, ipAddress: req.ip });
    res.status(201).json({ message: 'Requisición creada', requisition: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ----- Órdenes de Compra -----
export const getPurchaseOrders = async (req, res) => {
  try { const r = await pool.query('SELECT * FROM purchase_orders ORDER BY creado_en DESC'); res.json(r.rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

export const createPurchaseOrder = async (req, res) => {
  try {
    const { requisition_id, supplier_id, items, delivery_date, observaciones } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: 'Items requeridos' });
    const subtotal = items.reduce((a, i) => a + (parseFloat(i.precio) || 0) * (parseInt(i.cantidad) || 0), 0);
    const iva = +(subtotal * 0.16).toFixed(2);
    const total = +(subtotal + iva).toFixed(2);
    const poNumber = 'PO-' + Date.now().toString().slice(-8) + '-' + String(Math.floor(Math.random() * 900) + 100);
    const r = await pool.query(
      `INSERT INTO purchase_orders (po_number, supplier_id, requisition_id, subtotal, iva, total, status, items, delivery_date, observaciones) VALUES ($1,$2,$3,$4,$5,$6,'EMITIDA',$7,$8,$9) RETURNING *`,
      [poNumber, supplier_id || null, requisition_id || null, +subtotal.toFixed(2), iva, total, JSON.stringify(items), delivery_date || null, observaciones || null]
    );
    // Marcar requisición como procesada si existe
    if (requisition_id) await pool.query("UPDATE purchase_requisitions SET status='EN_PROCESO' WHERE id=$1", [requisition_id]);
    // ASIENTO CONTABLE AUTOMÁTICO (Fase 4)
    try {
      const { asientoCompra } = await import('../controllers/accountingController.js');
      await asientoCompra({ poId: r.rows[0].id, subtotal: +subtotal.toFixed(2), iva, total });
    } catch (accErr) {
      console.warn('⚠️ Asiento contable no generado:', accErr.message);
    }
    await registrarAuditoria({ entityType: 'purchase_orders', entityId: r.rows[0].id, action: 'CREATE', userId: req.user?.userId, userName: req.user?.userName || 'system', afterData: { poNumber, subtotal, iva, total }, ipAddress: req.ip });
    res.status(201).json({ message: 'Orden de compra creada', purchaseOrder: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ----- Recepción de mercancía -----
export const createGoodsReceipt = async (req, res) => {
  try {
    const { po_id, items, observaciones } = req.body;
    if (!po_id) return res.status(400).json({ error: 'po_id requerido' });
    const r = await pool.query(
      `INSERT INTO goods_receipts (po_id, items, received_by, qc_status, observaciones) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [po_id, JSON.stringify(items || []), req.user?.userId, 'ACEPTADA', observaciones || null]
    );
    // Marcar PO como recibida
    await pool.query("UPDATE purchase_orders SET status='RECIBIDA' WHERE id=$1", [po_id]);
    await registrarAuditoria({ entityType: 'goods_receipts', entityId: r.rows[0].id, action: 'CREATE', userId: req.user?.userId, userName: req.user?.userName || 'system', afterData: { po_id, items }, ipAddress: req.ip });
    res.status(201).json({ message: 'Mercancía recibida', receipt: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ----- 2.4 EVALUACIÓN DE PROVEEDORES (rating 1-5) -----
export const rateSupplier = async (req, res) => {
  try {
    const { supplier_id, po_id, quality, timeliness, price_competitiveness, comments } = req.body;
    if (!supplier_id) return res.status(400).json({ error: 'supplier_id requerido' });
    const overall = +((Number(quality) + Number(timeliness) + Number(price_competitiveness)) / 3).toFixed(1);
    const r = await pool.query(
      `INSERT INTO supplier_ratings (supplier_id, po_id, quality, timeliness, price_competitiveness, overall, comments)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [supplier_id, po_id || null, quality || 3, timeliness || 3, price_competitiveness || 3, overall, comments || null]
    );
    await registrarAuditoria({ entityType: 'supplier_ratings', entityId: r.rows[0].id, action: 'CREATE', userId: req.user?.userId, userName: req.user?.userName || 'system', afterData: { supplier_id, overall }, ipAddress: req.ip });
    res.status(201).json({ message: 'Proveedor evaluado', rating: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getSupplierRatings = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT supplier_id, COUNT(*)::int AS evaluaciones, ROUND(AVG(overall)::numeric, 1) AS promedio
       FROM supplier_ratings GROUP BY supplier_id ORDER BY promedio DESC`
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};
