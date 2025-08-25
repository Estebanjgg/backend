const express = require('express');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const { optionalAuth, ensureSession } = require('../middleware/auth');
const Joi = require('joi');
const router = express.Router();

// Aplicar middleware de autenticación opcional y sesión
router.use(optionalAuth);
router.use(ensureSession);

// Esquemas de validación
const checkoutSchema = Joi.object({
  customer_name: Joi.string().required().min(2).max(100),
  customer_email: Joi.string().email().required(),
  customer_phone: Joi.string().required().min(10).max(20),
  
  shipping_address: Joi.object({
    street: Joi.string().required(),
    number: Joi.string().required(),
    complement: Joi.string().allow(''),
    neighborhood: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    postal_code: Joi.string().required(),
    country: Joi.string().default('Brasil')
  }).required(),
  
  billing_address: Joi.object({
    street: Joi.string().required(),
    number: Joi.string().required(),
    complement: Joi.string().allow(''),
    neighborhood: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    postal_code: Joi.string().required(),
    country: Joi.string().default('Brasil')
  }).optional(),
  
  payment_method: Joi.string().valid('credit_card', 'debit_card', 'pix', 'boleto').required(),
  
  same_as_shipping: Joi.boolean().default(true),
  notes: Joi.string().allow('').max(500),
  
  // Campos opcionales para cálculos
  shipping: Joi.number().min(0).default(0),
  tax: Joi.number().min(0).default(0)
});

// POST /api/checkout/validate - Validar datos de checkout sin crear orden
router.post('/validate', async (req, res) => {
  try {
    // Validar datos del formulario
    const { error, value } = checkoutSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Datos de checkout inválidos',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    // Verificar que el carrito no esté vacío
    const cartItems = await Cart.getCart(req.userId, req.sessionId);
    
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El carrito está vacío'
      });
    }

    // Verificar stock de todos los productos
    const stockErrors = [];
    for (const item of cartItems) {
      const supabase = require('../config/supabase');
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('stock, is_active, title')
        .eq('id', item.product_id)
        .single();

      if (productError || !product) {
        stockErrors.push(`Producto ${item.product_id} no encontrado`);
        continue;
      }

      if (!product.is_active) {
        stockErrors.push(`${product.title} ya no está disponible`);
        continue;
      }

      if (product.stock < item.quantity) {
        stockErrors.push(`Stock insuficiente para ${product.title}. Disponible: ${product.stock}`);
      }
    }

    if (stockErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Problemas con el inventario',
        errors: stockErrors
      });
    }

    // Si la dirección de facturación es la misma que la de envío
    if (value.same_as_shipping) {
      value.billing_address = value.shipping_address;
    }

    // Calcular totales
    const cartSummary = await Cart.getCartSummary(req.userId, req.sessionId);
    
    const totals = {
      subtotal: cartSummary.subtotal,
      discount: cartSummary.totalDiscount,
      shipping: value.shipping,
      tax: value.tax,
      total: cartSummary.subtotal + value.shipping + value.tax
    };

    res.json({
      success: true,
      message: 'Datos de checkout válidos',
      data: {
        validated_data: value,
        cart_summary: cartSummary,
        totals: totals
      }
    });

  } catch (error) {
    console.error('Error validando checkout:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// POST /api/checkout/create-order - Crear orden
router.post('/create-order', async (req, res) => {
  try {
    // Validar datos del formulario
    const { error, value } = checkoutSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Datos de checkout inválidos',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    // Si la dirección de facturación es la misma que la de envío
    if (value.same_as_shipping) {
      value.billing_address = value.shipping_address;
    }

    // Crear orden desde el carrito
    const order = await Order.createFromCart(value, req.userId, req.sessionId);

    res.status(201).json({
      success: true,
      message: 'Orden creada exitosamente',
      data: {
        order: order,
        order_number: order.order_number,
        total: order.total
      }
    });

  } catch (error) {
    console.error('Error creando orden:', error);
    
    if (error.message.includes('carrito está vacío') || 
        error.message.includes('Stock insuficiente') ||
        error.message.includes('no está disponible')) {
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

// GET /api/checkout/order/:orderNumber - Obtener orden por número
router.get('/order/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    
    const order = await Order.getByOrderNumber(orderNumber, req.userId, req.sessionId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Orden no encontrada'
      });
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Error obteniendo orden:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// GET /api/checkout/orders - Obtener órdenes del usuario
router.get('/orders', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const orders = await Order.getUserOrders(req.userId, req.sessionId, parseInt(limit), offset);
    
    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: orders.length
      }
    });

  } catch (error) {
    console.error('Error obteniendo órdenes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// PUT /api/checkout/order/:orderId/payment - Actualizar estado de pago
router.put('/order/:orderId/payment', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { payment_status, payment_id } = req.body;
    
    if (!payment_status) {
      return res.status(400).json({
        success: false,
        message: 'payment_status es requerido'
      });
    }

    // Verificar que la orden pertenece al usuario/sesión
    const order = await Order.getById(orderId, req.userId, req.sessionId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Orden no encontrada'
      });
    }

    const updatedOrder = await Order.updatePaymentStatus(orderId, payment_status, payment_id);
    
    res.json({
      success: true,
      message: 'Estado de pago actualizado',
      data: updatedOrder
    });

  } catch (error) {
    console.error('Error actualizando pago:', error);
    
    if (error.message.includes('Estado de pago inválido')) {
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

// GET /api/checkout/shipping-options - Obtener opciones de envío
router.get('/shipping-options', async (req, res) => {
  try {
    const { postal_code, total_weight = 1 } = req.query;
    
    // Aquí podrías integrar con APIs de correos como Correios
    // Por ahora, devolvemos opciones estáticas
    
    const shippingOptions = [
      {
        id: 'standard',
        name: 'Envío Estándar',
        description: 'Entrega en 5-10 días hábiles',
        price: 15.00,
        estimated_days: '5-10'
      },
      {
        id: 'express',
        name: 'Envío Express',
        description: 'Entrega en 2-3 días hábiles',
        price: 25.00,
        estimated_days: '2-3'
      },
      {
        id: 'same_day',
        name: 'Entrega el mismo día',
        description: 'Solo para São Paulo capital',
        price: 35.00,
        estimated_days: '1',
        restrictions: ['São Paulo capital']
      }
    ];

    res.json({
      success: true,
      data: shippingOptions,
      postal_code: postal_code
    });

  } catch (error) {
    console.error('Error obteniendo opciones de envío:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// GET /api/checkout/payment-methods - Obtener métodos de pago disponibles
router.get('/payment-methods', async (req, res) => {
  try {
    const paymentMethods = [
      {
        id: 'credit_card',
        name: 'Tarjeta de Crédito',
        description: 'Visa, Mastercard, American Express',
        icon: 'credit-card',
        installments: true,
        max_installments: 12
      },
      {
        id: 'debit_card',
        name: 'Tarjeta de Débito',
        description: 'Pago inmediato con débito',
        icon: 'debit-card',
        installments: false
      },
      {
        id: 'pix',
        name: 'PIX',
        description: 'Pago instantáneo 24/7',
        icon: 'pix',
        installments: false,
        discount: 0.05 // 5% de descuento
      },
      {
        id: 'boleto',
        name: 'Boleto Bancário',
        description: 'Vencimiento en 3 días',
        icon: 'boleto',
        installments: false,
        processing_days: 1
      }
    ];

    res.json({
      success: true,
      data: paymentMethods
    });

  } catch (error) {
    console.error('Error obteniendo métodos de pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router;
