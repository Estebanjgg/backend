const express = require('express');
const Cart = require('../models/Cart');
const { optionalAuth, ensureSession } = require('../middleware/auth');
const router = express.Router();

// Aplicar middleware de autenticación opcional y sesión a todas las rutas
router.use(optionalAuth);
router.use(ensureSession);

// GET /api/cart - Obtener carrito
router.get('/', async (req, res) => {
  try {
    const cartItems = await Cart.getCart(req.userId, req.sessionId);
    
    res.json({
      success: true,
      data: cartItems,
      count: cartItems.length,
      user: req.user ? req.user.toPublicJSON() : null,
      session_id: req.sessionId
    });
  } catch (error) {
    console.error('Error obteniendo carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// GET /api/cart/summary - Obtener resumen del carrito
router.get('/summary', async (req, res) => {
  try {
    const summary = await Cart.getCartSummary(req.userId, req.sessionId);
    
    res.json({
      success: true,
      data: summary,
      user: req.user ? req.user.toPublicJSON() : null,
      session_id: req.sessionId
    });
  } catch (error) {
    console.error('Error obteniendo resumen del carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// POST /api/cart/add - Agregar producto al carrito
router.post('/add', async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    
    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: 'product_id es requerido'
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad debe ser mayor a 0'
      });
    }

    const cartItem = await Cart.addToCart(product_id, quantity, req.userId, req.sessionId);
    
    res.status(201).json({
      success: true,
      message: 'Producto agregado al carrito',
      data: cartItem,
      user: req.user ? req.user.toPublicJSON() : null,
      session_id: req.sessionId
    });
  } catch (error) {
    console.error('Error agregando al carrito:', error);
    
    if (error.message.includes('Stock insuficiente') || 
        error.message.includes('Producto no encontrado')) {
      return res.status(400).json({
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

// PUT /api/cart/update/:id - Actualizar cantidad de producto
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    
    if (!quantity || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Cantidad inválida'
      });
    }

    const result = await Cart.updateQuantity(id, quantity, req.userId, req.sessionId);
    
    if (quantity === 0) {
      res.json({
        success: true,
        message: 'Producto eliminado del carrito',
        user: req.user ? req.user.toPublicJSON() : null,
        session_id: req.sessionId
      });
    } else {
      res.json({
        success: true,
        message: 'Cantidad actualizada',
        data: result,
        user: req.user ? req.user.toPublicJSON() : null,
        session_id: req.sessionId
      });
    }
  } catch (error) {
    console.error('Error actualizando cantidad:', error);
    
    if (error.message.includes('Stock insuficiente') || 
        error.message.includes('Item del carrito no encontrado')) {
      return res.status(400).json({
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

// DELETE /api/cart/remove/:id - Eliminar producto del carrito
router.delete('/remove/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await Cart.removeFromCart(id, req.userId, req.sessionId);
    
    res.json({
      success: true,
      message: result.message,
      user: req.user ? req.user.toPublicJSON() : null,
      session_id: req.sessionId
    });
  } catch (error) {
    console.error('Error eliminando del carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// DELETE /api/cart/clear - Limpiar todo el carrito
router.delete('/clear', async (req, res) => {
  try {
    const result = await Cart.clearCart(req.userId, req.sessionId);
    
    res.json({
      success: true,
      message: result.message,
      user: req.user ? req.user.toPublicJSON() : null,
      session_id: req.sessionId
    });
  } catch (error) {
    console.error('Error limpiando carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// POST /api/cart/migrate - Migrar carrito de sesión a usuario (solo para usuarios autenticados)
const { authenticateToken } = require('../middleware/auth');
router.post('/migrate', authenticateToken, async (req, res) => {
  try {
    const { session_id } = req.body;
    
    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'session_id es requerido'
      });
    }

    // Usar el ID del usuario autenticado
    const result = await Cart.migrateSessionCartToUser(session_id, req.user.id);
    
    res.json({
      success: true,
      message: 'Carrito migrado exitosamente',
      data: result,
      user: req.user.toPublicJSON()
    });
  } catch (error) {
    console.error('Error migrando carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router;