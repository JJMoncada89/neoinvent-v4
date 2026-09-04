/**
 * SERVICIO DE AUDITORÍA FORENSE
 * Sistema de registro transaccional inviolable con hash chaining
 * Cada registro enlaza al anterior mediante SHA-256 — alterar uno rompe toda la cadena
 */
import crypto from 'crypto';
import { pool } from '../config/database.js';

/**
 * Calcula el hash SHA-256 de un registro de auditoría
 * El hash incluye el hash previo → blockchain-like
 */
const calcularHash = ({ prevHash, entityType, entityId, action, userId, userName, beforeData, afterData, timestamp }) => {
  const data = JSON.stringify({
    prevHash,
    entityType,
    entityId,
    action,
    userId,
    userName,
    beforeData,
    afterData,
    timestamp: timestamp || new Date().toISOString(),
  });
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Registra una entrada de auditoría
 * Se llama automáticamente desde el middleware
 */
export const registrarAuditoria = async ({
  entityType,
  entityId,
  action,
  userId,
  userName,
  beforeData = null,
  afterData = null,
  ipAddress = '0.0.0.0',
  userAgent = 'unknown',
  sessionId = null,
}) => {
  try {
    // Obtener el hash del último registro para enlazar
    const lastEntry = await pool.query(
      'SELECT hash FROM audit_trail ORDER BY timestamp DESC LIMIT 1'
    );
    const prevHash = lastEntry.rows[0]?.hash || 'GENESIS';

    const now = new Date();
    const hash = calcularHash({
      prevHash,
      entityType,
      entityId,
      action,
      userId,
      userName,
      beforeData,
      afterData,
      timestamp: now.toISOString(),
    });

    await pool.query(
      `INSERT INTO audit_trail (prev_hash, hash, entity_type, entity_id, action, user_id, user_name, before_data, after_data, ip_address, user_agent, session_id, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [prevHash, hash, entityType, entityId, action, userId, userName,
       beforeData ? JSON.stringify(beforeData) : null,
       afterData ? JSON.stringify(afterData) : null,
       ipAddress, userAgent, sessionId, now]
    );

    return { hash, prevHash, timestamp: now };
  } catch (error) {
    // La auditoría NUNCA debe bloquear la operación principal
    // pero se registra el error silenciosamente
    console.error('⚠️ [AUDIT] No se pudo registrar:', error.message);
  }
};

/**
 * Verifica la integridad de la cadena de auditoría
 * Recorre todos los hashes y valida que cada uno coincida
 */
export const verificarIntegridad = async () => {
  const entries = await pool.query(
    'SELECT id, prev_hash, hash, entity_type, entity_id, action, user_id, user_name, before_data, after_data, timestamp FROM audit_trail ORDER BY timestamp ASC'
  );

  let prevHash = 'GENESIS';
  let broken = 0;
  const issues = [];

  for (const entry of entries.rows) {
    const expectedHash = calcularHash({
      prevHash,
      entityType: entry.entity_type,
      entityId: entry.entity_id,
      action: entry.action,
      userId: entry.user_id,
      userName: entry.user_name,
      beforeData: entry.before_data,
      afterData: entry.after_data,
      timestamp: entry.timestamp ? new Date(entry.timestamp).toISOString() : null,
    });

    if (entry.hash !== expectedHash) {
      broken++;
      issues.push({
        id: entry.id,
        timestamp: entry.timestamp,
        expected: expectedHash,
        actual: entry.hash,
      });
    }

    prevHash = entry.hash;
  }

  return {
    total: entries.rows.length,
    intactos: entries.rows.length - broken,
    alterados: broken,
    integridad: broken === 0 ? '✅ INVIOLE' : `❌ ${broken} registros alterados`,
    issues: issues.slice(0, 20),
  };
};

/**
 * Consulta el audit trail (REQUIERE CLAVE MAESTRA)
 */
export const consultarAuditoria = async (filtros = {}) => {
  const { entityType, entityId, userId, action, fechaDesde, fechaHasta, page = 1, limit = 50 } = filtros;

  let where = ' WHERE 1=1';
  const params = [];

  if (entityType) { where += ` AND entity_type = $${params.length + 1}`; params.push(entityType); }
  if (entityId) { where += ` AND entity_id = $${params.length + 1}`; params.push(entityId); }
  if (userId) { where += ` AND user_id = $${params.length + 1}`; params.push(userId); }
  if (action) { where += ` AND action = $${params.length + 1}`; params.push(action); }
  if (fechaDesde) { where += ` AND timestamp >= $${params.length + 1}`; params.push(fechaDesde); }
  if (fechaHasta) { where += ` AND timestamp <= $${params.length + 1}`; params.push(fechaHasta); }

  // Contar total
  const countResult = await pool.query(`SELECT COUNT(*) as count FROM audit_trail${where}`, params);
  const total = parseInt(countResult.rows[0].count);

  // Paginar
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const result = await pool.query(
    `SELECT id, prev_hash, hash, entity_type, entity_id, action, user_id, user_name, before_data, after_data, ip_address, user_agent, session_id, timestamp
     FROM audit_trail${where}
     ORDER BY timestamp DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, parseInt(limit), offset]
  );

  return {
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit)),
    entries: result.rows,
  };
};

/**
 * Exporta el audit trail completo para análisis forense externo
 */
export const exportarAuditoria = async (fechaDesde, fechaHasta) => {
  const result = await pool.query(
    `SELECT * FROM audit_trail WHERE timestamp >= $1 AND timestamp <= $2 ORDER BY timestamp ASC`,
    [fechaDesde, fechaHasta]
  );
  return result.rows;
};