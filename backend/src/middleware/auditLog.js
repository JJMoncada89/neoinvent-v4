import { registrarAuditoria } from '../services/auditService.js';
import { ENV_VARS } from '../config/env.js';

/**
 * Middleware de auditoría automática
 * Intercepta peticiones POST/PUT/DELETE y registra en el audit trail
 * Información capturada: quién, qué, cuándo, IP, navegador y payload
 */
export const audit = (entityType, action) => {
  return async (req, res, next) => {
    // Guardar el JSON original para registrar el cambio
    const originalJson = res.json;

    res.json = function (data) {
      // Registrar después de enviar la respuesta
      const safeData = JSON.parse(JSON.stringify(data || {}));

      // Extraer información relevante del request para el before/after
      const afterData = action === 'DELETE' ? null : safeData;
      const beforeData = action === 'DELETE' ? { id: req.params.id } : null;

      registrarAuditoria({
        entityType,
        entityId: req.params.id || safeData?.id || safeData?.venta?.id || null,
        action,
        userId: req.user?.userId || null,
        userName: req.user?.userName || req.user?.sub || 'anonymous',
        beforeData,
        afterData: afterData?.message ? { ...afterData, message: undefined, ...(afterData?.data || {}) } : afterData,
        ipAddress: req.ip?.replace('::ffff:', '') || '0.0.0.0',
        userAgent: req.headers['user-agent'] || 'unknown',
      });

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Middleware que registra el inicio/cierre de sesión de cada usuario
 */
export const auditAuth = async (req, res, next) => {
  const originalJson = res.json;

  res.json = function (data) {
    const action = req.path.includes('login') ? 'LOGIN' : req.path.includes('logout') ? 'LOGOUT' : 'AUTH';
    registrarAuditoria({
      entityType: 'auth',
      entityId: null,
      action,
      userId: req.user?.userId || data?.user?.id || null,
      userName: req.user?.userName || data?.user?.nombre || req.body?.email || 'unknown',
      beforeData: null,
      afterData: action === 'LOGIN' ? { login: req.body?.email, success: true } : null,
      ipAddress: req.ip?.replace('::ffff:', '') || '0.0.0.0',
      userAgent: req.headers['user-agent'] || 'unknown',
    });
    return originalJson.call(this, data);
  };
  next();
};