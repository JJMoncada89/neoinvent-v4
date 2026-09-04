/** CRUD de usuarios (multi-admin/multi-vendedor) — backend PostgreSQL */
import { pool } from '../config/database.js';
import { registrarAuditoria } from '../services/auditService.js';
import bcrypt from 'bcryptjs';

// Mapea fila DB a DTO seguro (sin password_hash)
const safeUser = (r) => ({
  id: r.id, username: r.email, email: r.email, name: r.nombre, nombre: r.nombre,
  role: r.rol, rol: r.rol, activo: r.activo, telefono: r.telefono, rif: r.rif, creado_en: r.creado_en,
});

export const listUsers = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM usuarios ORDER BY nombre');
    res.json(r.rows.map(safeUser));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { email, username, password, nombre, name, rol, role, telefono } = req.body;
    const userEmail = (email || username || '').trim().toLowerCase();
    const userName = (nombre || name || '').trim();
    const userRole = (rol || role || 'cajero').toLowerCase();
    if (!userEmail || !password || !userName) {
      return res.status(400).json({ error: 'email, password y nombre son obligatorios' });
    }
    if (!['admin', 'cajero', 'vendedor', 'cliente'].includes(userRole)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const r = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, telefono)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userName, userEmail, hash, userRole, telefono || null]
    );
    await registrarAuditoria({ entityType: 'usuarios', entityId: r.rows[0].id, action: 'CREATE', userId: req.user?.userId, userName: req.user?.userName || 'system', afterData: { email: userEmail, role: userRole }, ipAddress: req.ip });
    res.status(201).json({ message: 'Usuario creado', user: safeUser(r.rows[0]) });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Ese email/usuario ya existe' });
    res.status(500).json({ error: e.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, nombre, name, rol, role, password, activo } = req.body;
    const current = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    const nextEmail = (email || username || current.rows[0].email).trim().toLowerCase();
    const nextName = (nombre || name || current.rows[0].nombre).trim();
    const nextRole = (rol || role || current.rows[0].rol).toLowerCase();

    let hash = current.rows[0].password_hash;
    if (password) hash = await bcrypt.hash(password, await bcrypt.genSalt(10));

    const r = await pool.query(
      `UPDATE usuarios SET nombre=$1, email=$2, password_hash=$3, rol=$4, activo=$5 WHERE id=$6 RETURNING *`,
      [nextName, nextEmail, hash, nextRole, activo !== undefined ? activo : current.rows[0].activo, id]
    );
    await registrarAuditoria({ entityType: 'usuarios', entityId: id, action: 'UPDATE', userId: req.user?.userId, userName: req.user?.userName || 'system', afterData: { email: nextEmail, role: nextRole, passwordChanged: !!password }, ipAddress: req.ip });
    res.json({ message: 'Usuario actualizado', user: safeUser(r.rows[0]) });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Ese email/usuario ya existe' });
    res.status(500).json({ error: e.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    // Proteger: no permitir borrar el último admin / a sí mismo
    const admins = await pool.query("SELECT COUNT(*)::int AS n FROM usuarios WHERE rol='admin' AND activo=true");
    const target = await pool.query('SELECT rol FROM usuarios WHERE id=$1', [id]);
    if (target.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (target.rows[0].rol === 'admin' && admins.rows[0].n <= 1) {
      return res.status(400).json({ error: 'No se puede eliminar el último admin' });
    }
    await pool.query('DELETE FROM usuarios WHERE id=$1', [id]);
    await registrarAuditoria({ entityType: 'usuarios', entityId: id, action: 'DELETE', userId: req.user?.userId, userName: req.user?.userName || 'system', afterData: null, ipAddress: req.ip });
    res.json({ message: 'Usuario eliminado' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};