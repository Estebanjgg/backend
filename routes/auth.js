const express = require('express');
const User = require('../models/User');
const Cart = require('../models/Cart');
const emailService = require('../utils/emailService');
const {
  authenticateToken,
  validateRegistration,
  validateLogin,
  rateLimitLogin,
  clearLoginAttempts
} = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register - Registro de usuario
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone, session_id } = req.body;

    // Crear usuario
    const user = await User.create({
      email,
      password,
      first_name,
      last_name,
      phone
    });

    // Generar token
    const token = user.generateToken();

    // Si hay session_id, migrar carrito
    if (session_id) {
      try {
        await Cart.migrateSessionCartToUser(session_id, user.id);
      } catch (error) {
        console.error('Error migrando carrito:', error);
        // No fallar el registro por esto
      }
    }

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        user: user.toPublicJSON(),
        token
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    
    if (error.message.includes('ya está registrado')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// POST /api/auth/login - Login de usuario
router.post('/login', validateLogin, rateLimitLogin, async (req, res) => {
  try {
    const { email, password, session_id } = req.body;

    // Buscar usuario
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar contraseña
    const isPasswordValid = await user.verifyPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Actualizar último login
    await user.updateLastLogin();

    // Generar token
    const token = user.generateToken();

    // Si hay session_id, migrar carrito
    if (session_id) {
      try {
        await Cart.migrateSessionCartToUser(session_id, user.id);
      } catch (error) {
        console.error('Error migrando carrito:', error);
        // No fallar el login por esto
      }
    }

    // Limpiar intentos de login
    clearLoginAttempts(req, res, () => {});

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: user.toPublicJSON(),
        token
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// POST /api/auth/logout - Logout de usuario
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // En un sistema más complejo, aquí se invalidaría el token
    // Por ahora, solo confirmamos el logout
    res.json({
      success: true,
      message: 'Logout exitoso'
    });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/auth/me - Obtener perfil del usuario actual
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user.toPublicJSON()
      }
    });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/auth/profile - Actualizar perfil del usuario
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { first_name, last_name, phone } = req.body;
    console.log('Datos recibidos para actualizar perfil:', { first_name, last_name, phone });

    // Validaciones básicas
    if (first_name && first_name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'El nombre debe tener al menos 2 caracteres'
      });
    }

    if (last_name && last_name.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: 'El apellido no puede estar vacío'
      });
    }

    if (phone && phone.trim().length < 8 && phone.trim().length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El teléfono debe tener al menos 8 caracteres'
      });
    }

    // Actualizar perfil - pasar todos los campos, incluso si están vacíos
    const updateData = { first_name, last_name, phone };
    console.log('Datos enviados a updateProfile:', updateData);
    await req.user.updateProfile(updateData);

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: {
        user: req.user.toPublicJSON()
      }
    });
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    
    if (error.message.includes('No hay campos válidos')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/auth/change-password - Cambiar contraseña
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual y nueva contraseña son requeridas'
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    if (current_password === new_password) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe ser diferente a la actual'
      });
    }

    // Cambiar contraseña
    await req.user.changePassword(current_password, new_password);

    res.json({
      success: true,
      message: 'Contraseña cambiada exitosamente'
    });
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    
    if (error.message.includes('Contraseña actual incorrecta')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/auth/account - Desactivar cuenta
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña requerida para desactivar la cuenta'
      });
    }

    // Verificar contraseña
    const isPasswordValid = await req.user.verifyPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña incorrecta'
      });
    }

    // Desactivar usuario
    await req.user.deactivate();

    res.json({
      success: true,
      message: 'Cuenta desactivada exitosamente'
    });
  } catch (error) {
    console.error('Error desactivando cuenta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/auth/verify-token - Verificar si un token es válido
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token requerido'
      });
    }

    const decoded = User.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    // Verificar que el usuario existe
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Token válido',
      data: {
        user: user.toPublicJSON()
      }
    });
  } catch (error) {
    console.error('Error verificando token:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/auth/forgot-password - Solicitar recuperación de contraseña
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'El email es requerido'
      });
    }

    // Buscar usuario
    const user = await User.findByEmail(email);
    if (!user) {
      // Por seguridad, no revelar si el email existe o no
      return res.json({
        success: true,
        message: 'Si el email existe, recibirás un enlace de recuperación'
      });
    }

    // Generar token de recuperación
    const resetToken = user.generateResetToken();
    
    // Enviar email de recuperación usando EmailJS
    console.log(`📧 Generando token de recuperación para ${email}: ${resetToken}`);
    
    if (emailService.isConfigured()) {
      const emailResult = await emailService.sendPasswordResetEmail(email, resetToken);
      
      if (emailResult.success) {
        console.log('✅ Email de recuperación enviado exitosamente');
      } else {
        console.error('❌ Error enviando email:', emailResult.error);
        // Continuar sin fallar - el usuario no debe saber si falló el email
      }
    } else {
      console.warn('⚠️ EmailJS no está configurado. Email no enviado.');
    }
    
    res.json({
      success: true,
      message: 'Si el email existe, recibirás un enlace de recuperación',
      // En desarrollo, mostrar el token para testing
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  } catch (error) {
    console.error('Error en forgot-password:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/auth/verify-reset-token/:token - Verificar token de recuperación
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token requerido'
      });
    }

    // Verificar token
    const user = await User.findByResetToken(token);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    res.json({
      success: true,
      message: 'Token válido',
      data: {
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error verificando token:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/auth/reset-password - Restablecer contraseña
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token y contraseña son requeridos'
      });
    }

    // Validar contraseña
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Buscar usuario por token
    const user = await User.findByResetToken(token);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    // Actualizar contraseña
    await user.updatePassword(password);
    
    // Limpiar token de recuperación
    await user.clearResetToken();

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error en reset-password:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;