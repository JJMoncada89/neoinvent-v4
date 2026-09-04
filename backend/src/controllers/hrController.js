import { pool } from '../config/database.js';
import { registrarAuditoria } from '../services/auditService.js';

const TIPOS_CONTRATO = {
  FIJO: { label: 'Tiempo Indeterminado', duracion: null },
  TEMPORAL: { label: 'Tiempo Determinado', duracion: 'hasta 1 año' },
  OBRA: { label: 'Por Obra Determinada', duracion: 'hasta final de obra' },
  PASANTIA: { label: 'Pasantía', duracion: 'hasta 6 meses' },
  TERCERIZADO: { label: 'Tercerizado', duracion: 'según servicio' },
  SUPERNUMERARIO: { label: 'Supernumerario', duracion: 'hasta 90 días' },
};

const DEDUCCIONES = { IVSS: 4, FAOV: 2, INCE: 0.5 };

const calcularPrestaciones = (employee, fechaIngreso, fechaCese) => {
  const meses = Math.floor((new Date(fechaCese) - new Date(fechaIngreso)) / (1000 * 60 * 60 * 24 * 30.44));
  const anios = Math.floor(meses / 12);
  const salario = parseFloat(employee.base_salary) || 0;
  const diasMes = 30;
  const diasPrest = 15 * anios + Math.min(anios * 2, 30);
  const diasVac = 15 + Math.min(anios, 15);
  const diasBono = 15 + Math.min(anios, 30);
  const diasIndem = anios >= 1 ? 45 + (anios - 1) * 30 : 0;
  const prest = Math.round((salario / diasMes) * diasPrest * 100) / 100;
  const vac = Math.round((salario / diasMes) * diasVac * 100) / 100;
  const bono = Math.round((salario / diasMes) * diasBono * 100) / 100;
  const indem = Math.round((salario / diasMes) * diasIndem * 100) / 100;
  return { mesesTrabajados: meses, aniosServicio: anios, diasPrestaciones: diasPrest, montoPrestaciones: prest, diasVacaciones: diasVac, montoVacaciones: vac, diasBonoVacacional: diasBono, montoBonoVacacional: bono, diasIndemnizacion: diasIndem, montoIndemnizacion: indem, totalLiquidacion: Math.round((prest + vac + bono + indem) * 100) / 100 };
};

export const getEmployees = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM employees WHERE status != 'DESPIDIDO' ORDER BY last_name, first_name");
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

export const getEmployeeById = async (req, res) => {
  try {
    const empResult = await pool.query('SELECT * FROM employees WHERE id = $1', [req.params.id]);
    if (empResult.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    const contracts = await pool.query('SELECT * FROM employment_contracts WHERE employee_id = $1 ORDER BY start_date DESC', [req.params.id]);
    res.json({ employee: empResult.rows[0], contracts: contracts.rows });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

export const createEmployee = async (req, res) => {
  try {
    const { first_name, last_name, cedula, department, position, base_salary, phone, email, address } = req.body;
    if (!first_name || !last_name || !cedula || !base_salary) return res.status(400).json({ error: 'Campos requeridos: first_name, last_name, cedula, base_salary' });
    const code = 'EMP-' + Date.now().toString(36).toUpperCase();
    const result = await pool.query(
      "INSERT INTO employees (employee_code, first_name, last_name, cedula, hire_date, department, position, base_salary, phone, email, address, status) VALUES ($1,$2,$3,$4,CURRENT_DATE,$5,$6,$7,$8,$9,$10,'ACTIVO') RETURNING *",
      [code, first_name, last_name, cedula, department, position, base_salary, phone, email, address]
    );
    await registrarAuditoria({ entityType: 'employees', entityId: result.rows[0].id, action: 'CREATE', userId: req.user?.userId, userName: req.user?.userName || 'system', afterData: result.rows[0], ipAddress: req.ip, userAgent: req.headers['user-agent'] });
    res.status(201).json({ message: 'Empleado registrado', employee: result.rows[0], contractTypes: TIPOS_CONTRATO });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Cédula duplicada' });
    res.status(500).json({ error: error.message });
  }
};

export const createContract = async (req, res) => {
  try {
    const { employee_id, contract_type, start_date, end_date, salary, benefits } = req.body;
    const result = await pool.query(
      "INSERT INTO employment_contracts (employee_id, contract_type, start_date, end_date, salary, benefits, status, signed_date) VALUES ($1,$2,$3,$4,$5,$6,'VIGENTE',CURRENT_DATE) RETURNING *",
      [employee_id, contract_type, start_date, end_date, salary, JSON.stringify(benefits || [])]
    );
    await registrarAuditoria({ entityType: 'employment_contracts', entityId: result.rows[0].id, action: 'CREATE', userId: req.user?.userId, userName: req.user?.userName || 'system', afterData: result.rows[0], ipAddress: req.ip });
    res.status(201).json({ message: 'Contrato creado', contract: result.rows[0], typeInfo: TIPOS_CONTRATO[contract_type] });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

export const processTermination = async (req, res) => {
  try {
    const { employee_id, termination_type, termination_date, reason } = req.body;
    const empResult = await pool.query('SELECT * FROM employees WHERE id = $1', [employee_id]);
    if (empResult.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    const emp = empResult.rows[0];
    const fecha = termination_date || new Date().toISOString().split('T')[0];
    const calc = calcularPrestaciones(emp, emp.hire_date, fecha);
    const result = await pool.query(
      "INSERT INTO terminations (employee_id, termination_type, termination_date, reason, prestaciones_acumuladas, vacaciones_pendientes, indemnizacion_despido, total_liquidacion) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
      [employee_id, termination_type, fecha, reason, calc.montoPrestaciones, calc.montoVacaciones, calc.montoIndemnizacion, calc.totalLiquidacion]
    );
    await pool.query("UPDATE employees SET status = $1 WHERE id = $2", [termination_type === 'RENUNCIA' ? 'RENUNCIA' : 'DESPIDIDO', employee_id]);
    await registrarAuditoria({ entityType: 'terminations', entityId: result.rows[0].id, action: 'CREATE', userId: req.user?.userId, userName: req.user?.userName || 'system', beforeData: emp, afterData: result.rows[0], ipAddress: req.ip });
    res.status(201).json({ message: 'Terminación procesada', termination: result.rows[0], calculo: calc, deducciones: DEDUCCIONES });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

export const getDepartments = async (req, res) => {
  const r = await pool.query('SELECT DISTINCT department FROM employees WHERE department IS NOT NULL');
  res.json(r.rows.map(x => x.department));
};

// ----- 3.5 EVALUACIONES DE DESEMPEÑO -----
export const createEvaluation = async (req, res) => {
  try {
    const { employee_id, period, evaluator, punctuality, quality, teamwork, productivity, comments } = req.body;
    if (!employee_id || !period) return res.status(400).json({ error: 'employee_id y period requeridos' });
    const scores = [punctuality, quality, teamwork, productivity].map(Number);
    const overall = +(scores.reduce((a, x) => a + x, 0) / 4).toFixed(2);
    const r = await pool.query(
      `INSERT INTO employee_evaluations (employee_id, period, evaluator, punctuality, quality, teamwork, productivity, overall_score, comments)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [employee_id, period, evaluator || req.user?.userName || 'system', punctuality || 3, quality || 3, teamwork || 3, productivity || 3, overall, comments || null]
    );
    await registrarAuditoria({ entityType: 'employee_evaluations', entityId: r.rows[0].id, action: 'CREATE', userId: req.user?.userId, userName: req.user?.userName || 'system', afterData: { employee_id, period, overall }, ipAddress: req.ip });
    res.status(201).json({ message: 'Evaluación registrada', evaluation: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getEvaluations = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT ev.*, e.first_name, e.last_name FROM employee_evaluations ev
       JOIN employees e ON e.id = ev.employee_id ORDER BY ev.creado_en DESC LIMIT 100`
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export { calcularPrestaciones, TIPOS_CONTRATO, DEDUCCIONES };
