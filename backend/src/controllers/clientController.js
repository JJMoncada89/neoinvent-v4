import { pool } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

// Validar formato RIF venezolano
const validarRIF = (rif) => {
  if (!rif) return false;
  const regex = /^[VEJG]-\d{7,9}-\d$/;
  return regex.test(rif);
};

export const getClientes = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, rif, telefono, email, direccion, tipo_cliente, creado_en FROM clientes ORDER BY nombre'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener clientes:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export const getClienteById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM clientes WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createCliente = async (req, res) => {
  try {
    const { nombre, rif, telefono, email, direccion, tipo_cliente } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    // Si tiene RIF, validarlo según formato SENIAT
    if (rif && !validarRIF(rif)) {
      return res.status(400).json({
        error: 'Formato RIF inválido. Formato esperado: V-12345678-9, J-12345678-9, E-12345678-9',
      });
    }

    const result = await pool.query(
      `INSERT INTO clientes (id, nombre, rif, telefono, email, direccion, tipo_cliente, creado_en)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [uuidv4(), nombre, rif || null, telefono || null, email || null, direccion || null, tipo_cliente || 'CLIENTE_FINAL']
    );

    res.status(201).json({ message: 'Cliente creado', cliente: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'El RIF ya está registrado' });
    }
    console.error('Error al crear cliente:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export const updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, rif, telefono, email, direccion, tipo_cliente } = req.body;

    if (rif && !validarRIF(rif)) {
      return res.status(400).json({ error: 'Formato RIF inválido' });
    }

    const result = await pool.query(
      `UPDATE clientes SET nombre = $1, rif = $2, telefono = $3, email = $4, direccion = $5, tipo_cliente = $6, actualizado_en = NOW()
       WHERE id = $7 RETURNING *`,
      [nombre, rif, telefono, email, direccion, tipo_cliente, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json({ message: 'Cliente actualizado', cliente: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM clientes WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json({ message: 'Cliente eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};