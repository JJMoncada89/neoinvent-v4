import { pool } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { SENIAT_CONFIG } from '../config/seniat.js';
import { generarFacturaElectronica } from '../services/invoiceGenerator.js';
import QRCode from 'qrcode';

export const createSale = async (req, res) => {
  try {
    const { items, customerId, paymentMethod, observaciones } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No hay items en la venta' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      let subtotal = 0;
      let iva = 0;
      let total = 0;
      const saleItems = [];

      for (const item of items) {
        const productResult = await client.query(
          'SELECT id, nombre, precio, stock, categoria, cost FROM productos WHERE id = $1 FOR UPDATE',
          [item.productId]
        );

        if (productResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: `Producto ${item.productId} no encontrado` });
        }

        const product = productResult.rows[0];

        if (product.stock < item.cantidad) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: `Stock insuficiente para ${product.nombre}. Disponible: ${product.stock}`,
          });
        }

        // Determinar tasa de IVA según categoría (SENIAT)
        let taxRate = SENIAT_CONFIG.TAX_RATES.GENERAL; // 16%
        if (product.categoria === 'alimentos') {
          taxRate = SENIAT_CONFIG.TAX_RATES.REDUCIDO; // 8%
        } else if (product.categoria === 'exento') {
          taxRate = SENIAT_CONFIG.TAX_RATES.EXENTO; // 0%
        }

        const precioUnitario = product.precio;
        const subtotalItem = precioUnitario * item.cantidad;
        const impuestoItem = (subtotalItem * taxRate) / 100;
        const totalItem = subtotalItem + impuestoItem;

        subtotal += subtotalItem;
        iva += impuestoItem;
        total += totalItem;

        // Descontar stock
        await client.query(
          'UPDATE productos SET stock = stock - $1 WHERE id = $2',
          [item.cantidad, item.productId]
        );

        saleItems.push({
          productId: product.id,
          nombre: product.nombre,
          cantidad: item.cantidad,
          precioUnitario,
          cost: product.cost || 0,
          tasaIVA: taxRate,
          montoIVA: impuestoItem,
          subtotal: subtotalItem,
        });
      }

      // Generar factura electrónica SENIAT
      const rifEmpresa = process.env.SENIAT_RIF || 'J-12345678-0';
      const facturaResult = await generarFacturaElectronica({
        rifEmisor: rifEmpresa,
        rifReceptor: customerId || 'EXENTO',
        tipoComprobante: SENIAT_CONFIG.COMPROBANT_TYPES.FACTURA_B,
        items: saleItems,
        subtotal,
        iva,
        total,
        observaciones,
        fechaEmision: new Date(),
      });

      // Registrar venta en BD
      const ventaResult = await client.query(
        `INSERT INTO ventas (id, cliente_id, subtotal, iva, total, metodo_pago, observaciones, creado_en)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING *`,
        [
          uuidv4(),
          customerId || null,
          subtotal,
          iva,
          total,
          paymentMethod || 'Efectivo',
          observaciones || null,
        ]
      );

      // Registrar items de venta
      for (const si of saleItems) {
        await client.query(
          `INSERT INTO venta_items (id, venta_id, producto_id, nombre, cantidad, precio_unitario, tasa_iva, monto_iva, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [uuidv4(), ventaResult.rows[0].id, si.productId, si.nombre, si.cantidad, si.precioUnitario, si.tasaIVA, si.montoIVA, si.subtotal]
        );
      }

      await client.query('COMMIT');

      // ASIENTO CONTABLE AUTOMÁTICO (Fase 4) — no bloquea la venta si falla
      try {
        const { asientoVenta } = await import('../controllers/accountingController.js');
        const costo = saleItems.reduce((a, si) => a + ((si.cost || 0) * si.cantidad), 0);
        await asientoVenta({ ventaId: ventaResult.rows[0].id, subtotal, iva, total, costo: +costo.toFixed(2) });
      } catch (accErr) {
        console.warn('⚠️ Asiento contable no generado:', accErr.message);
      }

      // Generar QR
      const autorizacion = facturaResult.numeroControl || ventaResult.rows[0].id;
      let qrData = '';
      try {
        qrData = await QRCode.toDataURL(`neoinvent://sale/${autorizacion}`);
      } catch (qrError) {
        console.warn('⚠️ No se pudo generar QR:', qrError.message);
      }

      res.status(201).json({
        message: 'Venta completada exitosamente',
        venta: ventaResult.rows[0],
        factura: facturaResult,
        items: saleItems,
        total,
        iva,
        subtotal,
        qrData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error al procesar venta:', error.message);
    res.status(500).json({
      error: 'Error al procesar la venta',
      details: error.message,
    });
  }
};
export const getVentas = async (req, res) => {
  try {
    const { page = 1, limit = 20, fechaInicio, fechaFin } = req.query;

    let condition = '';
    const params = [];

    if (fechaInicio || fechaFin) {
      condition = ' WHERE';
      if (fechaInicio) {
        condition += ` creado_en >= $${params.length + 1}`;
        params.push(fechaInicio);
      }
      if (fechaFin) {
        condition += fechaInicio ? ' AND' : ' WHERE';
        condition += ` creado_en <= $${params.length + 1}`;
        params.push(fechaFin);
      }
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM ventas${condition}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    const query = `SELECT id, cliente_id, subtotal, iva, total, metodo_pago, estado, observaciones, creado_en FROM ventas${condition} ORDER BY creado_en DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const result = await pool.query(query, params);

    res.json({
      ventas: result.rows,
      total: totalCount,
      page: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
    });
  } catch (error) {
    console.error('Error al obtener ventas:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export const getVentaById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM ventas WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const itemsResult = await pool.query(
      'SELECT * FROM venta_items WHERE venta_id = $1',
      [id]
    );

    res.json({ venta: result.rows[0], items: itemsResult.rows });
  } catch (error) {
    console.error('Error al obtener venta:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export const cancelSale = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    const ventaResult = await pool.query(
      "SELECT * FROM ventas WHERE id = $1 AND estado = 'COMPLETADA'",
      [id]
    );

    if (ventaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada o ya cancelada' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const itemsResult = await client.query(
        'SELECT producto_id, cantidad FROM venta_items WHERE venta_id = $1',
        [id]
      );
      for (const item of itemsResult.rows) {
        await client.query(
          'UPDATE productos SET stock = stock + $1 WHERE id = $2',
          [item.cantidad, item.producto_id]
        );
      }
      await client.query(
        "UPDATE ventas SET estado = 'CANCELADA', motivo_cancelacion = $1, actualizado_en = NOW() WHERE id = $2",
        [motivo || 'Sin especificar', id]
      );
      await client.query('COMMIT');
      res.json({ message: 'Venta cancelada, stock restaurado', ventaId: id });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error al cancelar venta:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const ventasHoy = await pool.query(
      "SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM ventas WHERE DATE(creado_en) = CURRENT_DATE AND estado != 'CANCELADA'"
    );
    const ventasMes = await pool.query(
      "SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM ventas WHERE EXTRACT(MONTH FROM creado_en) = EXTRACT(MONTH FROM CURRENT_DATE) AND estado != 'CANCELADA'"
    );
    const topProductos = await pool.query(
      `SELECT p.id, p.nombre, SUM(vi.cantidad) as vendidos, SUM(vi.subtotal) as ingresos
       FROM venta_items vi JOIN productos p ON p.id = vi.producto_id
       JOIN ventas v ON v.id = vi.venta_id WHERE v.estado != 'CANCELADA'
       GROUP BY p.id, p.nombre ORDER BY vendidos DESC LIMIT 10`
    );
    const stockBajo = await pool.query(
      'SELECT id, nombre, stock, stock_minimo FROM productos WHERE stock <= stock_minimo AND activo = true ORDER BY stock ASC LIMIT 20'
    );
    const porMetodo = await pool.query(
      "SELECT metodo_pago, COUNT(*) as cantidad, SUM(total) as total FROM ventas WHERE estado != 'CANCELADA' GROUP BY metodo_pago"
    );

    res.json({
      hoy: { ventas: parseInt(ventasHoy.rows[0].count), total: parseFloat(ventasHoy.rows[0].total) },
      mes: { ventas: parseInt(ventasMes.rows[0].count), total: parseFloat(ventasMes.rows[0].total) },
      topProductos: topProductos.rows,
      stockBajo: stockBajo.rows,
      porMetodoPago: porMetodo.rows,
    });
  } catch (error) {
    console.error('Error en dashboard:', error.message);
    res.status(500).json({ error: error.message });
  }
};
