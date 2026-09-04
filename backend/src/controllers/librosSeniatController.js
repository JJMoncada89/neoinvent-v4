// GET /api/v1/fiscal/libros?mes&anio&tipo=ventas|compras → TXT formato SENIAT (descarga)
import { pool } from '../config/database.js';

const forMatFecha = (d) => d ? new Date(d).toISOString().slice(0, 10).replace(/-/g, '/') : '';
const pad = (s, n) => String(s == null ? '' : s).padStart(n);
const rpad = (s, n) => String(s == null ? '' : s).padEnd(n);

export const getLibrosSENIAT = async (req, res) => {
  try {
    const mes = parseInt(req.query.mes) || (new Date().getMonth() + 1);
    const anio = parseInt(req.query.anio) || new Date().getFullYear();
    const tipo = (req.query.tipo || 'ventas').toLowerCase();
    const rifEmpresa = process.env.SENIAT_RIF || 'J-99999999-0';
    const filename = 'LIBRO_' + (tipo === 'ventas' ? 'VENTAS' : 'COMPRAS') + '_' + String(mes).padStart(2, '0') + '_' + anio;

    let header, body = [];
    if (tipo === 'ventas') {
      // Cabecera SENIAT Libro de Ventas
      header = 'PROVEEDOR DE SERVICIOS DE SOFTWARE\n' +
        'LIBRO DE VENTAS (IVA)\n' +
        'PERIODO: ' + String(mes).padStart(2, '0') + '/' + anio + '\n' +
        'RIF: ' + rifEmpresa + '\n' +
        'IDENTIFICACION DE LA VENTA|RIF/CI|NOMBRE O RAZON SOCIAL|TIPO DE OPERACION|NUMERO DE CONTROL|COMPROBANTE|FECHA|MONTO|BASE IMPONIBLE|IVA\n';
      const ventas = await pool.query(
        `SELECT v.*, c.rif AS cliente_rif, c.nombre AS cliente_nombre
         FROM ventas v LEFT JOIN clientes c ON c.id = v.cliente_id
         WHERE EXTRACT(MONTH FROM v.creado_en) = $1 AND EXTRACT(YEAR FROM v.creado_en) = $2 AND v.estado != 'CANCELADA'
         ORDER BY v.creado_en`,
        [mes, anio]
      );
      body = ventas.rows.map(v =>
        [
          v.estado === 'ANULADA' ? 'ANULADA' : 'VENTA',
          v.cliente_rif || 'V-00000000-0',
          (v.cliente_nombre || 'Consumidor Final').toUpperCase(),
          'NORMAL',
          v.numero_control || v.numero_factura || v.folio || v.id,
          v.numero_control ? 'FACTURA' : 'BOLETA',
          forMatFecha(v.creado_en),
          v.total || 0,
          v.subtotal || 0,
          v.iva || v.tax || 0,
        ].join('|')
      );
    } else {
      header = 'PROVEEDOR DE SERVICIOS DE SOFTWARE\n' +
        'LIBRO DE COMPRAS (IVA)\n' +
        'PERIODO: ' + String(mes).padStart(2, '0') + '/' + anio + '\n' +
        'RIF: ' + rifEmpresa + '\n' +
        'RIF PROVEEDOR|NOMBRE O RAZON SOCIAL|NUMERO DE FACTURA|NUMERO DE CONTROL|TIPO DE COMPROBANTE|FECHA|MONTO|BASE IMPONIBLE|IVA\n';
      const compras = await pool.query(
        `SELECT po.* FROM purchase_orders po
         WHERE EXTRACT(MONTH FROM po.creado_en) = $1 AND EXTRACT(YEAR FROM po.creado_en) = $2 AND po.status != 'CANCELADA'
         ORDER BY po.creado_en`,
        [mes, anio]
      );
      body = compras.rows.map(po =>
        [
          po.supplier_rif || 'J-00000000-0',
          (po.supplier_nombre || po.supplier || 'Proveedor').toUpperCase(),
          po.po_number,
          po.po_number,
          'FACTURA',
          forMatFecha(po.creado_en),
          po.total || 0,
          po.subtotal || 0,
          po.iva || 0,
        ].join('|')
      );
    }

    const content = header + (body.length ? body.join('\n') + '\n' : 'SIN MOVIMIENTOS EN EL PERIODO\n') +
      '\nTOTAL REGISTROS: ' + body.length + '\n' +
      'NOTA: ARCHIVO GENERADO PARA DECLARACION ANTE EL SENIAT. VERIFICAR CON CONTADOR.\n';

    res.setHeader('Content-Type', 'text/plain; charset=iso-8859-1');
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '.txt"');
    res.send(content);
  } catch (e) {
    console.error('Error Libros SENIAT:', e.message);
    res.status(500).json({ error: e.message });
  }
};
