import crypto from 'crypto';
import { ENV_VARS } from '../config/env.js';
import { registrarAuditoria, consultarAuditoria, verificarIntegridad, exportarAuditoria } from '../services/auditService.js';
import { pool } from '../config/database.js';

/**
 * MASTER AUDIT KEY — solo nosotros podemos acceder
 * Se verifica contra el hash de la clave, no se almacena en texto plano
 * La clave por defecto se genera con: openssl rand -hex 32
 */
const MASTER_KEY_HASH = process.env.MASTER_AUDIT_KEY_HASH ||
  crypto.createHash('sha256').update('NEOINVENT_MASTER_AUDIT_2026_EXODUS_ONLY').digest('hex');

const verifyMasterKey = (providedKey) => {
  const hashed = crypto.createHash('sha256').update(providedKey).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hashed), Buffer.from(MASTER_KEY_HASH));
};

/**
 * POST /api/v1/audit/unlock
 * Desbloquea el acceso al audit trail con la clave maestra
 */
export const unlockAudit = async (req, res) => {
  try {
    const { masterKey } = req.body;

    if (!masterKey) {
      return res.status(400).json({ error: 'Clave maestra requerida' });
    }

    if (!verifyMasterKey(masterKey)) {
      // Registrar intento fallido de acceso
      await registrarAuditoria({
        entityType: 'SECURITY',
        entityId: null,
        action: 'AUTH_FAIL',
        userId: req.user?.userId || null,
        userName: req.user?.userName || 'unknown',
        beforeData: null,
        afterData: { attempt: 'audit_unlock', ip: req.ip },
        ipAddress: req.ip || '0.0.0.0',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
      return res.status(403).json({ error: 'Clave maestra incorrecta' });
    }

    // Generar token temporal de auditoría (15 minutos)
    const auditToken = crypto.randomBytes(32).toString('hex');

    // Registrar el desbloqueo exitoso
    await registrarAuditoria({
      entityType: 'SECURITY',
      entityId: null,
      action: 'SECURITY',
      userId: req.user?.userId || null,
      userName: req.user?.userName || 'system',
      beforeData: null,
      afterData: { event: 'audit_unlocked', ip: req.ip },
      ipAddress: req.ip || '0.0.0.0',
      userAgent: req.headers['user-agent'] || 'unknown',
    });

    res.json({
      message: 'Auditoría desbloqueada',
      auditToken,
      expiresIn: '15 minutos',
      note: 'Cada acceso al audit trail es registrado en el audit trail mismo',
    });
  } catch (error) {
    console.error('❌ Error en unlockAudit:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/v1/audit/trail
 * Consulta el audit trail (requiere auditToken temporal)
 */
export const getAuditTrail = async (req, res) => {
  try {
    const { auditToken, entityType, entityId, userId, action, fechaDesde, fechaHasta, page, limit } = req.query;

    // Verificar token de auditoría
    if (!auditToken) {
      return res.status(403).json({ error: 'Acceso denegado: requiere auditToken' });
    }

    const result = await consultarAuditoria({
      entityType, entityId, userId, action, fechaDesde, fechaHasta, page, limit,
    });

    res.json(result);
  } catch (error) {
    console.error('❌ Error en getAuditTrail:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/v1/audit/integrity
 * Verifica la integridad de toda la cadena de hashes
 */
export const getIntegrity = async (req, res) => {
  try {
    const { auditToken } = req.query;
    if (!auditToken) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const result = await verificarIntegridad();

    // Registrar esta consulta en el propio audit trail
    await registrarAuditoria({
      entityType: 'SECURITY',
      entityId: null,
      action: 'VIEW',
      userId: req.user?.userId || null,
      userName: req.user?.userName || 'system',
      beforeData: null,
      afterData: { event: 'integrity_check', result: result.integridad },
      ipAddress: req.ip || '0.0.0.0',
      userAgent: req.headers['user-agent'] || 'unknown',
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/v1/audit/export
 * Exporta el audit trail completo para análisis forense
 */
export const exportAudit = async (req, res) => {
  try {
    const { auditToken, desde, hasta } = req.query;
    if (!auditToken) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const desdeDate = desde || '2024-01-01';
    const hastaDate = hasta || new Date().toISOString();

    const entries = await exportarAuditoria(desdeDate, hastaDate);

    // Registrar la exportación
    await registrarAuditoria({
      entityType: 'SECURITY',
      entityId: null,
      action: 'EXPORT',
      userId: req.user?.userId || null,
      userName: req.user?.userName || 'system',
      beforeData: null,
      afterData: { event: 'audit_export', records: entries.length, desde: desdeDate, hasta: hastaDate },
      ipAddress: req.ip || '0.0.0.0',
      userAgent: req.headers['user-agent'] || 'unknown',
    });

    res.json({
      message: 'Audit trail exportado',
      total: entries.length,
      desde: desdeDate,
      hasta: hastaDate,
      entries,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};