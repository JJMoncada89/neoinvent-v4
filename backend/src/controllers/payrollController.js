/* NÓMINA VENEZOLANA — IVSS 4% · FAOV 2% · INCE 0.5% · ISLR progresivo (UT configurable) */
import { pool } from '../config/database.js';
import { registrarAuditoria } from '../services/auditService.js';

const UT = parseFloat(process.env.UT_VALUE || '100');
const PORC_IVSS = 0.04, PORC_FAOV = 0.02, PORC_INCE = 0.005;

export function calcularISLR(salarioMensual, meses = 12, ut = UT) {
  const ingresoAnual = salarioMensual * meses;
  const utAnual = ingresoAnual / ut;
  let impuesto = 0, tramo = 'EXENTO';
  if (utAnual > 1000) {
    const base = utAnual - 1000;
    if (utAnual <= 2000) { impuesto = base * 0.03; tramo = '3% exceso 1000 UT'; }
    else if (utAnual <= 3000) { impuesto = 30 + (base - 1000) * 0.06; tramo = '6% tramo 2001-3000 UT'; }
    else if (utAnual <= 4000) { impuesto = 90 + (base - 2000) * 0.09; tramo = '9% tramo 3001-4000 UT'; }
    else { impuesto = 180 + (base - 3000) * 0.12; tramo = '12% 4000+ UT'; }
    impuesto *= ut;
  }
  return { ingresoAnual, utAnual: Math.round(utAnual * 100) / 100, islrMensual: Math.round((impuesto / meses) * 100) / 100, tramo, ut };
}

export function calcularNominaEmpleado({ salario, dias = 30, horasExtra = [], asignaciones = [], cajaAhorro = 0, prestamos = 0 }) {
  const salarioPeriodo = (salario / 30) * dias;
  const totalAsignaciones = asignaciones.reduce((a, x) => a + (parseFloat(x.monto) || 0), 0);
  const totalHorasExtra = horasExtra.reduce((a, x) => a + (parseFloat(x.monto) || 0), 0);
  const salarioFinal = salarioPeriodo + totalAsignaciones + totalHorasExtra;
  const retencionIVSS = +(salarioFinal * PORC_IVSS).toFixed(2);
  const retencionFaov = +(salarioFinal * PORC_FAOV).toFixed(2);
  const retencionInce = +(salarioFinal * PORC_INCE).toFixed(2);
  const islr = calcularISLR(salarioFinal);
  const otras = cajaAhorro + prestamos;
  const totalDeducciones = +(retencionIVSS + retencionFaov + retencionInce + islr.islrMensual + otras).toFixed(2);
  return {
    dias, salarioPeriodo: +salarioPeriodo.toFixed(2), totalAsignaciones: +totalAsignaciones.toFixed(2),
    totalHorasExtra: +totalHorasExtra.toFixed(2), salarioFinal: +salarioFinal.toFixed(2),
    retencionIVSS, retencionFaov, retencionInce, retencionIslr: islr.islrMensual,
    cajaAhorro: +cajaAhorro.toFixed(2), prestamos: +prestamos.toFixed(2),
    totalDeducciones, netoPagar: +(salarioFinal - totalDeducciones).toFixed(2),
    islrInfo: { tramo: islr.tramo, utAnual: islr.utAnual, ut },
  };
}

export const runPayroll = async (req, res) => {
  try {
    const { periodo, tipo = 'MENSUAL', items } = req.body;
    if (!periodo || !items || items.length === 0) return res.status(400).json({ error: 'Periodo e items requeridos' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const runResult = await client.query("INSERT INTO payroll_runs (periodo, tipo, estado, creado_en) VALUES ($1,$2,'BORRADOR',NOW()) RETURNING *", [periodo, tipo]);
      const run = runResult.rows[0];
      let totalGross = 0, totalDed = 0, totalNeto = 0;
      const detalles = [];
      for (const it of items) {
        const emp = await client.query('SELECT * FROM employees WHERE id = $1', [it.employee_id]);
        if (emp.rows.length === 0) continue;
        const calc = calcularNominaEmpleado({
          salario: parseFloat(it.salario) || parseFloat(emp.rows[0].base_salary) || 0,
          dias: parseInt(it.dias) || 30, horasExtra: it.horas_extra || [], asignaciones: it.asignaciones || [],
          cajaAhorro: parseFloat(it.caja_ahorro) || 0, prestamos: parseFloat(it.prestamos) || 0,
        });
        const itemResult = await client.query(
          `INSERT INTO payroll_items (payroll_run_id, employee_id, salario_base, dias_trabajados, asignaciones, horas_extra, total_asignaciones, retencion_ivss, retencion_faov, retencion_ince, retencion_islr, caja_ahorro, prestamos, total_deducciones, neto_pagar)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
          [run.id, it.employee_id, calc.salarioPeriodo, calc.dias, JSON.stringify(it.asignaciones || []), JSON.stringify(it.horas_extra || []), calc.totalAsignaciones, calc.retencionIVSS, calc.retencionFaov, calc.retencionInce, calc.retencionIslr, calc.cajaAhorro, calc.prestamos, calc.totalDeducciones, calc.netoPagar]
        );
        totalGross += calc.salarioFinal; totalDed += calc.totalDeducciones; totalNeto += calc.netoPagar;
        detalles.push({ employee_id: it.employee_id, ...calc });
      }
      await client.query('UPDATE payroll_runs SET total_gross=$1,total_deducciones=$2,total_neto=$3 WHERE id=$4', [+totalGross.toFixed(2), +totalDed.toFixed(2), +totalNeto.toFixed(2), run.id]);
      await client.query('COMMIT');
      await registrarAuditoria({ entityType: 'payroll_runs', entityId: run.id, action: 'CREATE', userId: req.user?.userId, userName: req.user?.userName || 'system', afterData: { periodo, tipo, totalGross, totalDed, totalNeto }, ipAddress: req.ip });
      res.status(201).json({ message: 'Nómina procesada (borrador)', payroll: { ...run, total_gross: totalGross, total_deducciones: totalDed, total_neto: totalNeto }, detalles });
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  } catch (error) {
    console.error('Error en nómina:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export const getPayrollRuns = async (req, res) => {
  try { const r = await pool.query('SELECT * FROM payroll_runs ORDER BY creado_en DESC LIMIT 50'); res.json(r.rows); }
  catch (error) { res.status(500).json({ error: error.message }); }
};

export const getPayrollDetail = async (req, res) => {
  try {
    const items = await pool.query('SELECT pi.*, e.first_name, e.last_name, e.position FROM payroll_items pi JOIN employees e ON e.id=pi.employee_id WHERE pi.payroll_run_id=$1', [req.params.id]);
    res.json(items.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
};
