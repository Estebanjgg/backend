const express = require('express');
const Order = require('../models/Order');
const { authenticateToken, optionalAuth, ensureSession } = require('../middleware/auth');
const router = express.Router();

// Aplicar middleware de autenticación (opcional para usuarios no registrados con sesión)
router.use(optionalAuth);
router.use(ensureSession);

// GET /api/orders - Obtener pedidos del usuario
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    if (!req.userId && !req.sessionId) {
      return res.status(401).json({
        success: false,
        message: 'Debes estar autenticado para ver tus pedidos'
      });
    }

    // Construir query
    const supabase = require('../config/supabase');
    let query = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        payment_status,
        total,
        currency,
        customer_name,
        created_at,
        updated_at,
        shipped_at,
        delivered_at,
        tracking_number,
        shipping_company,
        order_items(
          id,
          quantity,
          unit_price,
          total_price,
          product_title,
          product_image,
          product_brand,
          products(
            id,
            title,
            image,
            brand,
            category
          )
        ),
        payment_details(
          transaction_id,
          payment_method,
          status as payment_detail_status
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    // Filtrar por usuario o sesión
    if (req.userId) {
      query = query.eq('user_id', req.userId);
    } else {
      query = query.eq('session_id', req.sessionId);
    }

    // Filtrar por estado si se proporciona
    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error, count } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: orders || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error obteniendo pedidos del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// GET /api/orders/:orderNumber - Obtener pedido específico por número
router.get('/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;

    if (!req.userId && !req.sessionId) {
      return res.status(401).json({
        success: false,
        message: 'Debes estar autenticado para ver este pedido'
      });
    }

    const order = await Order.getByOrderNumber(orderNumber, req.userId, req.sessionId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    // Obtener información adicional de pago
    const supabase = require('../config/supabase');
    const { data: paymentDetails } = await supabase
      .from('payment_details')
      .select('*')
      .eq('order_id', order.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const orderWithPayment = {
      ...order,
      payment_details: paymentDetails?.[0] ? {
        ...paymentDetails[0],
        payment_data: JSON.parse(paymentDetails[0].payment_data || '{}')
      } : null
    };

    res.json({
      success: true,
      data: orderWithPayment
    });

  } catch (error) {
    console.error('Error obteniendo pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// POST /api/orders/:orderId/cancel - Cancelar pedido
router.post('/:orderId/cancel', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    if (!req.userId && !req.sessionId) {
      return res.status(401).json({
        success: false,
        message: 'Debes estar autenticado para cancelar este pedido'
      });
    }

    // Verificar que el pedido pertenece al usuario
    const order = await Order.getById(orderId, req.userId, req.sessionId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    // Verificar que el pedido se puede cancelar
    const cancellableStatuses = ['pending', 'confirmed'];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Este pedido no se puede cancelar en su estado actual'
      });
    }

    // Cancelar pedido
    const cancelNotes = `Cancelado por el cliente. Razón: ${reason || 'No especificada'}`;
    const updatedOrder = await Order.updateStatus(orderId, 'cancelled', cancelNotes);

    // Si el pago ya se procesó, actualizar también el estado del pago
    if (order.payment_status === 'paid') {
      await Order.updatePaymentStatus(orderId, 'refunded');
    }

    res.json({
      success: true,
      message: 'Pedido cancelado exitosamente',
      data: updatedOrder
    });

  } catch (error) {
    console.error('Error cancelando pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// GET /api/orders/:orderId/tracking - Obtener información de seguimiento
router.get('/:orderId/tracking', async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!req.userId && !req.sessionId) {
      return res.status(401).json({
        success: false,
        message: 'Debes estar autenticado para ver el seguimiento'
      });
    }

    const order = await Order.getById(orderId, req.userId, req.sessionId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    // Generar timeline de eventos del pedido
    const timeline = [];

    timeline.push({
      status: 'pending',
      title: 'Pedido Creado',
      description: 'Tu pedido ha sido recibido y está siendo procesado',
      date: order.created_at,
      completed: true
    });

    if (order.payment_status === 'paid') {
      timeline.push({
        status: 'paid',
        title: 'Pago Confirmado',
        description: 'El pago de tu pedido ha sido confirmado',
        date: order.updated_at,
        completed: true
      });
    }

    if (order.status === 'confirmed') {
      timeline.push({
        status: 'confirmed',
        title: 'Pedido Confirmado',
        description: 'Tu pedido está siendo preparado para el envío',
        date: order.updated_at,
        completed: true
      });
    }

    if (order.status === 'shipped' || order.status === 'delivered') {
      timeline.push({
        status: 'shipped',
        title: 'Pedido Enviado',
        description: order.tracking_number ? 
          `Tu pedido fue enviado. Código de seguimiento: ${order.tracking_number}` :
          'Tu pedido fue enviado',
        date: order.shipped_at,
        completed: true,
        tracking_number: order.tracking_number,
        shipping_company: order.shipping_company
      });
    }

    if (order.status === 'delivered') {
      timeline.push({
        status: 'delivered',
        title: 'Pedido Entregado',
        description: 'Tu pedido ha sido entregado exitosamente',
        date: order.delivered_at,
        completed: true
      });
    }

    if (order.status === 'cancelled') {
      timeline.push({
        status: 'cancelled',
        title: 'Pedido Cancelado',
        description: 'Tu pedido ha sido cancelado',
        date: order.updated_at,
        completed: true,
        is_final: true
      });
    }

    // Agregar próximos pasos si el pedido no está finalizado
    if (!['delivered', 'cancelled'].includes(order.status)) {
      if (order.status === 'pending' && order.payment_status === 'pending') {
        timeline.push({
          status: 'pending_payment',
          title: 'Esperando Pago',
          description: 'Completa el pago para continuar con tu pedido',
          date: null,
          completed: false
        });
      } else if (order.status === 'confirmed') {
        timeline.push({
          status: 'preparing',
          title: 'Preparando Envío',
          description: 'Tu pedido está siendo preparado para el envío',
          date: null,
          completed: false
        });
      } else if (order.status === 'shipped') {
        timeline.push({
          status: 'in_transit',
          title: 'En Tránsito',
          description: 'Tu pedido está en camino',
          date: null,
          completed: false
        });
      }
    }

    res.json({
      success: true,
      data: {
        order_number: order.order_number,
        current_status: order.status,
        payment_status: order.payment_status,
        timeline: timeline,
        estimated_delivery: order.status === 'shipped' && !order.delivered_at ? 
          new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() : null
      }
    });

  } catch (error) {
    console.error('Error obteniendo seguimiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// GET /api/orders/summary/stats - Obtener resumen de pedidos del usuario
router.get('/summary/stats', async (req, res) => {
  try {
    if (!req.userId && !req.sessionId) {
      return res.status(401).json({
        success: false,
        message: 'Debes estar autenticado para ver el resumen'
      });
    }

    const supabase = require('../config/supabase');
    let query = supabase
      .from('orders')
      .select('status, payment_status, total, created_at');

    if (req.userId) {
      query = query.eq('user_id', req.userId);
    } else {
      query = query.eq('session_id', req.sessionId);
    }

    const { data: orders, error } = await query;

    if (error) {
      throw error;
    }

    const stats = {
      total_orders: orders.length,
      total_spent: orders.reduce((sum, order) => sum + order.total, 0),
      orders_by_status: {},
      recent_orders: orders
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 3)
    };

    // Agrupar por estado
    orders.forEach(order => {
      stats.orders_by_status[order.status] = (stats.orders_by_status[order.status] || 0) + 1;
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error obteniendo resumen de pedidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router;
