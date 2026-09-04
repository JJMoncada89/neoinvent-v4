import { pool } from '../config/database.js';
import jwt from 'jsonwebtoken';
import { ENV_VARS } from '../config/env.js';

/**
 * Middleware de autenticación JWT
 */
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticación requerido' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, ENV_VARS.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

/**
 * Middleware de autorización por rol
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        error: 'No tiene permisos para esta operación',
        required: roles,
      });
    }
    next();
  };
};