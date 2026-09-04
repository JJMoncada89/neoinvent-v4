/* CONTABILIDAD — Asientos automáticos, Libro Diario, Balance, PyG, IVA */
import { pool } from '../config/database.js';
import { registrarAuditoria } from '../services/auditService.js';

const ENTRY_SEQ = { n: 0 };
function nextEntryNumber() {
  ENTRY_SEQ.n++;
  return 'AS-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(ENTRY_SEQ.n).padStart(4, '0');
}

async function nextEntryNumberDB(client) {
  const r = await client.query("SELECT COUNT(*)::int AS n FROM journal_entries");
  const n = (r.rows[0]?.n || 0) + 1;
  return 'AS-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(n).padStart(4, '0');
}

/**
 * Inserta un asiento con líneas y VALIDA cuadratura débito/crédito.
 * lines: [{account_code, account_name, debit, credit}]
 */
async function insertJournalEntry(client, { fecha, referencia, descripcion, source, sourceId, lines }) {
  const totalDebito = +lines.reduce((a, l) => a + (l.debit || 0), 0).toFixed(2);
  const totalCredito = +lines.reduce((a, l) => a + (l.credit || 0), 0).toFixed(2);
  if (Math.abs(totalDebito - totalCredito) > 0.01) {
    throw new Error(`Asiento descuadrado: débito ${totalDebito} ≠ crédito ${totalCredito} (${referencia || source})`);
  }
  const entryNumber = await nextEntryNumberDB(client);
  const e = await client.query(
    `INSERT INTO journal_entries (entry_number, fecha, referencia, descripcion, source, source_id, total_debito, total_credito)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [entryNumber, fecha || new Date(), referencia || null, descripcion || null, source, sourceId || null, totalDebito, totalCredito]
  );
  for (const l of lines) {
    await client.query(
      `INSERT INTO journal_entry_lines (entry_id, account_code, account_name, debit, credit) VALUES ($1,$2,$3,$4,$5)`,
      [e.rows[0].id, l.account_code, l.account_name, l.debit || 0, l.credit || 0]
    );
  }
  return e.rows[0];
}

/** ASIENTO DE VENTA: DB Caja total · Cr Ventas subtotal · Cr IVA por pagar iva · DB Costo ventas / Cr Inventario costo */
export const asientoVenta = async ({ ventaId, fecha, subtotal, iva, total, costo = 0 }, clientIn) => {
  const run = async (client) => {
    const lines = [
      { account_code: '1.1.1.01', account_name: 'Caja', debit: total, credit: 0 },
      { account_code: '4.1.1.01', account_name: 'Ventas de mercancías', debit: 0, credit: subtotal },
      { account_code: '2.1.2.01', account_name: 'IVA por pagar (ventas)', debit: 0, credit: iva },
    ];
    if (costo > 0) {
      lines.push({ account_code: '5.1.1.01', account_name: 'Costo de ventas', debit: costo, credit: 0 });
      lines.push({ account_code: '1.1.3.01', account_name: 'Inventario de mercancías', debit: 0, credit: costo });
    }
    const entry = await insertJournalEntry(client, { fecha, referencia: 'Venta ' + ventaId, descripcion: 'Venta registrada', source: 'VENTA', sourceId: ventaId, lines });
    await actualizarSaldoCuentas(client, lines);
    return entry;
  };
  return clientIn ? run(clientIn) : withClient(run);
};

/** ASIENTO DE COMPRA: DB Inventario subtotal · DB IVA acreditable iva · Cr Ctas por pagar total */
export const asientoCompra = async ({ poId, fecha, subtotal, iva, total }, clientIn) => {
  const run = async (client) => {
    const lines = [
      { account_code: '1.1.3.01', account_name: 'Inventario de mercancías', debit: subtotal, credit: 0 },
      { account_code: '1.1.4.01', account_name: 'IVA acreditable (compras)', debit: iva, credit: 0 },
      { account_code: '2.1.1.01', account_name: 'Cuentas por pagar proveedores', debit: 0, credit: total },
    ];
    const entry = await insertJournalEntry(client, { fecha, referencia: 'Compra ' + poId, descripcion: 'Compra registrada', source: 'COMPRA', sourceId: poId, lines });
    await actualizarSaldoCuentas(client, lines);
    return entry;
  };
  return clientIn ? run(clientIn) : withClient(run);
};

/** ASIENTO DE NÓMINA: DB Gasto sueldos gross · Cr retenciones IVSS/FAOV/ISLR · Cr Sueldos por pagar neto */
export const asientoNomina = async ({ payrollId, fecha, gross, ivss, faov, islr, neto }, clientIn) => {
  const run = async (client) => {
    const lines = [
      { account_code: '5.2.1.01', account_name: 'Gasto de sueldos y salarios', debit: gross, credit: 0 },
      { account_code: '2.1.3.01', account_name: 'Retenciones IVSS por pagar', debit: 0, credit: ivss },
      { account_code: '2.1.3.02', account_name: 'Retenciones FAOV por pagar', debit: 0, credit: faov },
      { account_code: '2.1.3.03', account_name: 'Retenciones ISLR por pagar', debit: 0, credit: islr },
      { account_code: '2.1.4.01', account_name: 'Sueldos por pagar', debit: 0, credit: neto },
    ];
    const entry = await insertJournalEntry(client, { fecha, referencia: 'Nómina ' + payrollId, descripcion: 'Nómina procesada', source: 'NOMINA', sourceId: payrollId, lines });
    await actualizarSaldoCuentas(client, lines);
    return entry;
  };
  return clientIn ? run(clientIn) : withClient(run);
};

async function withClient(fn) {
  const client = await pool.connect();
  try { return await fn(client); } finally { client.release(); }
}

async function actualizarSaldoCuentas(client, lines) {
  for (const l of lines) {
    await client.query(
      `UPDATE chart_of_accounts SET saldo = saldo + $1 WHERE code = $2`,
      [ (l.debit || 0) - (l.credit || 0), l.account_code ]
    );
  }
}

/** GET /api/v1/accounting/coa */
export const getChartOfAccounts = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM chart_of_accounts ORDER BY code');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/** GET /api/v1/accounting/journal?limit */
export const getJournal = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const entries = await pool.query('SELECT * FROM journal_entries ORDER BY fecha DESC, entry_number DESC LIMIT $1', [limit]);
    const withLines = [];
    for (const e of entries.rows) {
      const lines = await pool.query('SELECT * FROM journal_entry_lines WHERE entry_id = $1', [e.id]);
      withLines.push({ ...e, lines: lines.rows });
    }
    res.json(withLines);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/** GET /api/v1/accounting/balance — Balance general */
export const getBalance = async (req, res) => {
  try {
    const r = await pool.query("SELECT code, name, type, saldo FROM chart_of_accounts WHERE activa = true ORDER BY code");
    const groups = { ACTIVO: [], PASIVO: [], PATRIMONIO: [] };
    for (const row of r.rows) {
      if (groups[row.type]) groups[row.type].push(row);
    }
    const sum = arr => +arr.reduce((a, x) => a + parseFloat(x.saldo || 0), 0).toFixed(2);
    const totalActivo = sum(groups.ACTIVO);
    const totalPasivo = sum(groups.PASIVO);
    const totalPatrimonio = sum(groups.PATRIMONIO);
    res.json({
      activo: groups.ACTIVO, pasivo: groups.PASIVO, patrimonio: groups.PATRIMONIO,
      totalActivo, totalPasivo, totalPatrimonio,
      cuadra: Math.abs((totalActivo - totalPasivo - totalPatrimonio)) <= 0.01 ? '✅ CUADRA' : '⚠️ DESCUADRE (ingresos/gastos aún no cerrados al patrimonio: ' + (totalActivo - totalPasivo - totalPatrimonio).toFixed(2) + ')',
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/** GET /api/v1/accounting/pnl — Estado de resultados */
export const getPnL = async (req, res) => {
  try {
    const r = await pool.query("SELECT type, code, name, saldo FROM chart_of_accounts WHERE type IN ('INGRESO','GASTO') ORDER BY type, code");
    const ingresos = r.rows.filter(x => x.type === 'INGRESO');
    const gastos = r.rows.filter(x => x.type === 'GASTO');
    const totalIngresos = +ingresos.reduce((a, x) => a + parseFloat(x.saldo || 0), 0).toFixed(2);
    const totalGastos = +gastos.reduce((a, x) => a + parseFloat(x.saldo || 0), 0).toFixed(2);
    res.json({ ingresos, gastos, totalIngresos, totalGastos, utilidad: +(totalIngresos - totalGastos).toFixed(2) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/** GET /api/v1/accounting/iva?mes&anio — Declaración IVA (FORM 32 SENIAT ref) */
export const getDeclaracionIVA = async (req, res) => {
  try {
    const mes = parseInt(req.query.mes) || (new Date().getMonth() + 1);
    const anio = parseInt(req.query.anio) || new Date().getFullYear();
    const ventas = await pool.query(
      `SELECT COALESCE(SUM(subtotal),0) as base, COALESCE(SUM(iva),0) as iva_debito, COUNT(*) as facturas
       FROM ventas WHERE EXTRACT(MONTH FROM creado_en)=$1 AND EXTRACT(YEAR FROM creado_en)=$2 AND estado != 'CANCELADA'`,
      [mes, anio]
    );
    const compras = await pool.query(
      `SELECT COALESCE(SUM(subtotal),0) as base, COALESCE(SUM(iva),0) as iva_credito, COUNT(*) as ordenes
       FROM purchase_orders WHERE EXTRACT(MONTH FROM creado_en)=$1 AND EXTRACT(YEAR FROM creado_en)=$2`,
      [mes, anio]
    );
    const v = ventas.rows[0], c = compras.rows[0];
    const debito = parseFloat(v.iva_debito), credito = parseFloat(c.iva_credito);
    const aPagar = +(debito - credito).toFixed(2);
    res.json({
      periodo: `${String(mes).padStart(2,'0')}/${anio}`,
      ventas: { base: parseFloat(v.base), ivaDebito: debito, facturas: parseInt(v.facturas) },
      compras: { base: parseFloat(c.base), ivaCredito: credito, ordenes: parseInt(c.ordenes) },
      ivaAPagar: aPagar > 0 ? aPagar : 0,
      saldoFavor: aPagar < 0 ? Math.abs(aPagar) : 0,
      leyenda: 'Resumen para declaración mensual de IVA — verifique con su contador y el formulario vigente del SENIAT.',
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export default { asientoVenta, asientoCompra, asientoNomina };
