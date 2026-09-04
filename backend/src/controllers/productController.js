import { pool } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { SENIAT_CONFIG } from '../config/seniat.js';

export const getProducts = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, codigo, precio, stock, categoria, activo FROM productos WHERE activo = true ORDER BY nombre'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error al obtener productos:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, nombre, codigo, precio, stock, categoria, activo, descripcion FROM productos WHERE id = $1 AND activo = true',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error al obtener producto:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { nombre, codigo, precio, stock, categoria, descripcion } = req.body;

    if (!nombre || !precio || !categoria) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios: nombre, precio, categoria',
      });
    }

    const result = await pool.query(
      `INSERT INTO productos (id, nombre, codigo, precio, stock, categoria, descripcion, creado_en)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, nombre, codigo, precio, stock, categoria, descripcion`,
      [uuidv4(), nombre, codigo || null, precio, stock || 0, categoria, descripcion || null]
    );

    res.status(201).json({
      message: 'Producto creado exitosamente',
      product: result.rows[0],
    });
  } catch (error) {
    console.error('❌ Error al crear producto:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, codigo, precio, stock, categoria, descripcion } = req.body;

    // Verificar que el producto existe
    const existing = await pool.query(
      'SELECT id, nombre, precio, stock FROM productos WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const result = await pool.query(
      `UPDATE productos 
       SET nombre = $1, codigo = $2, precio = $3, stock = $4, categoria = $5, descripcion = $6, actualizado_en = NOW()
       WHERE id = $7
       RETURNING id, nombre, codigo, precio, stock, categoria, descripcion`,
      [nombre, codigo || existing.rows[0].precio, precio || existing.rows[0].precio, 
        stock || existing.rows[0].stock, categoria || existing.rows[0].categoria, 
        descripcion, id]
    );

    res.json({
      message: 'Producto actualizado exitosamente',
      product: result.rows[0],
    });
  } catch (error) {
    console.error('❌ Error al actualizar producto:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Soft delete - marcar como inactivo
    const result = await pool.query(
      `UPDATE productos SET activo = false, actualizado_en = NOW() WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ message: 'Producto desactivado exitosamente' });
  } catch (error) {
    console.error('❌ Error al desactivar producto:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Realizar venta de producto
export const addProductStock = async (req, res) => {
  try {
    const { id, qty } = req.body;

    if (!qty || qty <= 0) {
      return res.status(400).json({ error: 'Cantidad inválida' });
    }

    const result = await pool.query(
      `UPDATE productos SET stock = stock + $1 WHERE id = $2 RETURNING id, nombre, stock`,
      [qty, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({
      message: 'Stock incrementado exitosamente',
      product: result.rows[0],
    });
  } catch (error) {
    console.error('❌ Error al incrementar stock:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export const removeProductStock = async (req, res) => {
  try {
    const { id, qty } = req.body;

    if (!qty || qty <= 0) {
      return res.status(400).json({ error: 'Cantidad inválida' });
    }

    // Verificar stock disponible
    const product = await pool.query(
      'SELECT id, nombre, stock FROM productos WHERE id = $1',
      [id]
    );

    if (product.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    if (product.rows[0].stock < qty) {
      return res.status(400).json({
        error: `Stock insuficiente. Disponible: ${product.rows[0].stock}`,
      });
    }

    const result = await pool.query(
      `UPDATE productos SET stock = stock - $1 WHERE id = $2 RETURNING id, nombre, stock`,
      [qty, id]
    );

    res.json({
      message: 'Stock decrementado exitosamente',
      product: result.rows[0],
    });
  } catch (error) {
    console.error('❌ Error al decrementar stock:', error.message);
    res.status(500).json({ error: error.message });
  }
};