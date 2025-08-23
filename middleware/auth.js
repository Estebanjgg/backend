const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware para verificar autenticación JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    // Verificar token
    const decoded = User.verifyToken(token);
    if (!decoded) {
      return res.status(403).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    // Buscar usuario en la base de datos
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(403).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Agregar usuario a la request
    req.user = user;
    next();
  } catch (error) {
    console.error('Error en authenticateToken:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Middleware opcional de autenticación (no falla si no hay token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = User.verifyToken(token);
      if (decoded) {
        const user = await User.findById(decoded.id);
        if (user) {
          req.user = user;
        }
      }
    }

    next();
  } catch (error) {
    console.error('Error en optionalAuth:', error);
    // No fallar, solo continuar sin usuario
    next();
  }
};

// Middleware para generar o recuperar session_id
const ensureSession = (req, res, next) => {
  try {
    // Si hay usuario autenticado, usar su ID
    if (req.user) {
      req.userId = req.user.id;
      req.sessionId = null;
      return next();
    }

    // Para usuarios anónimos, generar o usar session_id
    let sessionId = req.headers['x-session-id'] || req.query.session_id;
    
    if (!sessionId) {
      // Generar nuevo session_id
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Enviar session_id en la respuesta
      res.setHeader('X-Session-ID', sessionId);
    }

    req.userId = null;
    req.sessionId = sessionId;
    next();
  } catch (error) {
    console.error('Error en ensureSession:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Middleware para validar datos de registro
const validateRegistration = (req, res, next) => {
  try {
    const { email, password, first_name } = req.body;

    // Validaciones básicas
    if (!email || !password || !first_name) {
      return res.status(400).json({
        success: false,
        message: 'Email, contraseña y nombre son requeridos'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido'
      });
    }

    // Validar contraseña
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Validar nombre
    if (first_name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'El nombre debe tener al menos 2 caracteres'
      });
    }

    next();
  } catch (error) {
    console.error('Error en validateRegistration:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Middleware para validar datos de login
const validateLogin = (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido'
      });
    }

    next();
  } catch (error) {
    console.error('Error en validateLogin:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Middleware para rate limiting básico (prevenir ataques de fuerza bruta)
const loginAttempts = new Map();

const rateLimitLogin = (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutos
    const maxAttempts = 5;

    // Limpiar intentos antiguos
    if (loginAttempts.has(ip)) {
      const attempts = loginAttempts.get(ip).filter(time => now - time < windowMs);
      loginAttempts.set(ip, attempts);
    }

    const currentAttempts = loginAttempts.get(ip) || [];
    
    if (currentAttempts.length >= maxAttempts) {
      return res.status(429).json({
        success: false,
        message: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos'
      });
    }

    // Registrar intento
    currentAttempts.push(now);
    loginAttempts.set(ip, currentAttempts);

    next();
  } catch (error) {
    console.error('Error en rateLimitLogin:', error);
    next(); // No bloquear por errores en rate limiting
  }
};

// Middleware para limpiar intentos de login exitosos
const clearLoginAttempts = (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    loginAttempts.delete(ip);
    next();
  } catch (error) {
    console.error('Error en clearLoginAttempts:', error);
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  ensureSession,
  validateRegistration,
  validateLogin,
  rateLimitLogin,
  clearLoginAttempts
};