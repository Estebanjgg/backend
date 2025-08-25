const User = require('../models/User');

// Middleware para verificar si el usuario es administrador
const requireAdmin = async (req, res, next) => {
  try {
    // Verificar que el usuario esté autenticado
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Acceso no autorizado. Se requiere autenticación.'
      });
    }

    // Verificar que el usuario tenga rol de admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requieren privilegios de administrador.'
      });
    }

    next();
  } catch (error) {
    console.error('Error en requireAdmin:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Middleware para verificar permisos específicos de admin
const requireAdminPermission = (permission) => {
  return async (req, res, next) => {
    try {
      // Verificar que el usuario esté autenticado y sea admin
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado. Se requieren privilegios de administrador.'
        });
      }

      // En una implementación más compleja, aquí se verificarían permisos específicos
      // Por ahora, todos los admins tienen todos los permisos
      const adminPermissions = [
        'manage_orders',
        'manage_products', 
        'manage_users',
        'view_analytics',
        'manage_categories'
      ];

      if (!adminPermissions.includes(permission)) {
        return res.status(403).json({
          success: false,
          message: `Permiso '${permission}' no válido.`
        });
      }

      next();
    } catch (error) {
      console.error('Error en requireAdminPermission:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };
};

// Middleware para logs de acciones de admin
const logAdminAction = (action) => {
  return (req, res, next) => {
    try {
      const originalSend = res.send;
      
      res.send = function(data) {
        // Log de la acción del admin
        console.log(`[ADMIN ACTION] ${new Date().toISOString()} - User: ${req.user?.email || 'Unknown'} - Action: ${action} - IP: ${req.ip || req.connection.remoteAddress}`);
        
        // En una implementación más compleja, esto se guardaría en una tabla de audit logs
        
        originalSend.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Error en logAdminAction:', error);
      next();
    }
  };
};

module.exports = {
  requireAdmin,
  requireAdminPermission,
  logAdminAction
};