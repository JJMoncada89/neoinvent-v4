import { pool } from '../config/database.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ENV_VARS } from '../config/env.js';

export const register = async (req, res) => {
  try {
    const { nombre, email, password, rol, rif, telefono } = req.body;

    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios: nombre, email, password, rol',
      });
    }

    // Validar rol
    const validRoles = ['admin', 'cajero', 'cliente'];
    if (!validRoles.includes(rol)) {
      return res.status(400).json({
        error: 'Rol inválido. Roles permitidos: admin, cajero, cliente',
      });
    }

    // Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insertar usuario
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, rif, telefono, creado_en)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, nombre, email, rol, rif, creado_en`,
      [nombre, email, passwordHash, rol, rif || null, telefono || null]
    );

    const user = result.rows[0];

    // Generar JWT
    const token = jwt.sign(
      { userId: user.id, rol: user.rol },
      ENV_VARS.JWT_SECRET,
      { expiresIn: ENV_VARS.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        rif: user.rif,
      },
    });
  } catch (error) {
    console.error('❌ Error en registro:', error.message);

    // Manejar error de correo duplicado
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'El correo electrónico ya está registrado',
      });
    }

    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const usuario = req.body.username || req.body.identificador || null;

    if ((!email && !usuario) || !password) {
      return res.status(400).json({
        error: 'Usuario/email y password son obligatorios',
      });
    }

    // Buscar por email (el identificador de acceso se almacena en la columna email)
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email || usuario]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
      });
    }

    const user = result.rows[0];

    // Verificar cuenta activa
    if (user.activo === false) {
      return res.status(403).json({ error: 'Usuario desactivado' });
    }

    // Comparar contraseña
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
      });
    }

    // Generar JWT
    const token = jwt.sign(
      { userId: user.id, rol: user.rol },
      ENV_VARS.JWT_SECRET,
      { expiresIn: ENV_VARS.JWT_EXPIRES_IN }
    );

    // Omitir password hash del response
    const { password_hash, ...userData } = user;

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        ...userData,
        username: user.email,
        name: user.nombre,
        email: user.email,
        role: user.rol,
      },
    });
  } catch (error) {
    console.error('❌ Error en login:', error.message);
    res.status(500).json({
      error: 'Error interno del servidor',
    });
  }
};

export const logout = async (req, res) => {
  try {
    // En un sistema con refresh tokens, aquí invalidarías el token
    res.json({ message: 'Logout exitoso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};