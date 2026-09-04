/* FASE 5 — Servicios, Activos TI, Órdenes de Trabajo con SLA */
import { pool } from '../config/database.js';
import { registrarAuditoria } from '../services/auditService.js';

// ----- Catálogo de servicios -----
export const getServices = async (req, res) => {
  try { const r = await pool.query('SELECT * FROM services WHERE activo = true ORDER BY nombre'); res.json(r.rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

export const createService = async (req, res) => {
  try {
    const { nombre, descripcion, precio, duracion_estimada_horas, categoria } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const r = await pool.query(
      'INSERT INTO services (nombre, descripcion, precio, duracion_estimada_horas, categoria) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [nombre, descripcion || null, precio || 0, duracion_estimada_horas || 0, categoria || 'general']
    );
    await registrarAuditoria({ entityType: 'services', entityId: r.rows[0].id, action: 'CREATE', userId: req.user?.userId, userName: req.user?.userName || 'system', afterData: { nombre, precio }, ipAddress: req.ip });
    res.status(201).json({ message: 'Servicio creado', service: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ----- Activos TI -----
export const getAssets = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT a.*, e.first_name || ' ' || e.last_name AS assigned_name
       FROM it_assets a LEFT JOIN employees e ON e.id = a.assigned_to
       WHERE a.status != 'RETIRADO' ORDER BY a.asset_tag`
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const createAsset = async (req, res) => {
  try {
    const { nombre, tipo, marca, modelo, serial, assigned_to, ubicacion, purchase_cost, warranty_until, license_key, license_expires } = req.body;
    if (!nombre || !tipo) return res.status(400).json({ error: 'Nombre y tipo requeridos' });
    const tag = 'TI-' + tipo.slice(0, 3).toUpperCase() + '-' + Date.now().toString(36).toUpperCase().slice(-6);
    const r = await pool.query(
      `INSERT INTO it_assets (asset_tag, nombre, tipo, marca, modelo, serial, assigned_to, ubicacion, purchase_cost, warranty_until, license_key, license_expires)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [tag, nombre, tipo, marca || null, modelo || null, serial || null, assigned_to || null, ubicacion || null, purchase_cost || 0, warranty_until || null, license_key || null, license_expires || null]
    );
    await registrarAuditoria({ entityType: 'it_assets', entityId: r.rows[0].id, action: 'CREATE', userId: req.user?.userId, userName: req.user?.userName || 'system', afterData: { tag, nombre, tipo }, ipAddress: req.ip });
    res.status(201).json({ message: 'Activo registrado', asset: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ----- Órdenes de Trabajo con SLA -----
export const getWorkOrders = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT w.*, c.nombre AS client_name, s.nombre AS service_name, e.first_name || ' ' || e.last_name AS tech_name,
              sl.sla_horas_resolucion
       FROM work_orders w
       LEFT JOIN clientes c ON c.id = w.client_id
       LEFT JOIN services s ON s.id = w.service_id
       LEFT JOIN employees e ON e.id = w.assigned_to
       LEFT JOIN sla_contracts sl ON sl.id = w.sla_id
       ORDER BY w.opened_at DESC LIMIT 200`
    );
    // Detectar SLA vencido
    const rows = r.rows.map(w => {
      let slaBreached = false;
      if (w.sla_due_at && !w.resolved_at && new Date(w.sla_due_at) < new Date()) slaBreached = true;
      return { ...w, slaBreached };
    });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const createWorkOrder = async (req, res) => {
  try {
    const { client_id, service_id, sla_id, title, description, priority, assigned_to, costo } = req.body;
    if (!title) return res.status(400).json({ error: 'Título requerido' });
    let slaDue = null;
    if (sla_id) {
      const sla = await pool.query('SELECT sla_horas_resolucion FROM sla_contracts WHERE id = $1', [sla_id]);
      if (sla.rows[0]) {
        slaDue = new Date(Date.now() + (sla.rows[0].sla_horas_resolucion || 24) * 3600 * 1000);
      }
    }
    const wo = 'WO-' + Date.now().toString().slice(-8);
    const r = await pool.query(
      `INSERT INTO work_orders (wo_number, client_id, service_id, sla_id, title, description, priority, assigned_to, sla_due_at, costo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [wo, client_id || null, service_id || null, sla_id || null, title, description || null, priority || 'NORMAL', assigned_to || null, slaDue, costo || 0]
    );
    await registrarAuditoria({ entityType: 'work_orders', entityId: r.rows[0].id, action: 'CREATE', userId: req.user?.userId, userName: req.user?.userName || 'system', afterData: { wo, title, priority, slaDue }, ipAddress: req.ip });
    res.status(201).json({ message: 'Orden de trabajo creada', workOrder: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const resolveWorkOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution_notes } = req.body;
    const breached = await pool.query(
      `SELECT sla_due_at FROM work_orders WHERE id = $1`, [id]
    );
    const wasBreached = breached.rows[0]?.sla_due_at && new Date(breached.rows[0].sla_due_at) < new Date();
    const r = await pool.query(
      `UPDATE work_orders SET status = 'RESUELTA', resolved_at = NOW(), resolution_notes = $1 WHERE id = $2 RETURNING *`,
      [resolution_notes || null, id]
    );
    await registrarAuditoria({ entityType: 'work_orders', entityId: id, action: 'UPDATE', userId: req.user?.userId, userName: req.user?.userName || 'system', afterData: { resolved: true, slaBreached: !!wasBreached }, ipAddress: req.ip });
    res.json({ message: 'Orden resuelta', slaBreached: !!wasBreached, workOrder: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
