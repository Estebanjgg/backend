const express = require('express');
const supabase = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin, requireAdminPermission, logAdminAction } = require('../middleware/adminAuth');
const Joi = require('joi');
const router = express.Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateToken);
router.use(requireAdmin);

// ===== GESTIÓN DE ÓRDENES =====

// GET /api/admin/orders - Obtener todas las órdenes con filtros
router.get('/orders', requireAdminPermission('manage_orders'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      payment_status,
      start_date,
      end_date,
      search,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Consulta básica de órdenes sin relaciones problemáticas
    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (status) {
      query = query.eq('status', status);
    }
    
    if (payment_status) {
      query = query.eq('payment_status', payment_status);
    }
    
    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    
    if (end_date) {
      query = query.lte('created_at', end_date);
    }
    
    if (search) {
      query = query.or(`order_number.ilike.%${search}%,customer_email.ilike.%${search}%,customer_name.ilike.%${search}%`);
    }

    // Aplicar ordenamiento
    query = query.order(sort_by, { ascending: sort_order === 'asc' });
    
    // Aplicar paginación
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: orders, error, count } = await query;

    if (error) {
      throw error;
    }

    // Procesar datos básicos
    const processedOrders = orders.map(order => ({
      ...order,
      shipping_address: order.shipping_address ? JSON.parse(order.shipping_address) : null,
      billing_address: order.billing_address ? JSON.parse(order.billing_address) : null
    }));

    res.json({
      success: true,
      data: processedOrders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit))
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

// GET /api/admin/orders/:id - Obtener orden específica
router.get('/orders/:id', requireAdminPermission('manage_orders'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener orden básica
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();
    
    if (orderError) {
      if (orderError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada'
        });
      }
      throw orderError;
    }

    // Obtener items de la orden por separado
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', id);

    if (itemsError) {
      console.error('Error obteniendo items:', itemsError);
      // Continuar sin items si hay error
    }

    // Procesar datos
    const processedOrder = {
      ...order,
      shipping_address: order.shipping_address ? JSON.parse(order.shipping_address) : null,
      billing_address: order.billing_address ? JSON.parse(order.billing_address) : null,
      order_items: orderItems || []
    };

    res.json({
      success: true,
      data: processedOrder
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

// PUT /api/admin/orders/:id/status - Actualizar estado de orden
router.put('/orders/:id/status', 
  requireAdminPermission('manage_orders'),
  logAdminAction('update_order_status'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      // Validar estado
      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Estado de orden inválido'
        });
      }

      // Verificar que la orden existe
      const { data: existingOrder, error: checkError } = await supabase
        .from('orders')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError || !existingOrder) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada'
        });
      }

      // Actualizar orden
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          status: status,
          admin_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      res.json({
        success: true,
        message: 'Estado de orden actualizado exitosamente',
        data: updatedOrder
      });
    } catch (error) {
      console.error('Error actualizando estado de orden:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

// PUT /api/admin/orders/:id/payment-status - Actualizar estado de pago
router.put('/orders/:id/payment-status',
  requireAdminPermission('manage_orders'),
  logAdminAction('update_payment_status'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { payment_status } = req.body;

      // Validar estado de pago
      const validPaymentStatuses = ['pending', 'processing', 'completed', 'failed', 'refunded'];
      if (!validPaymentStatuses.includes(payment_status)) {
        return res.status(400).json({
          success: false,
          message: 'Estado de pago inválido'
        });
      }

      // Verificar que la orden existe
      const { data: existingOrder, error: checkError } = await supabase
        .from('orders')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError || !existingOrder) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada'
        });
      }

      // Actualizar estado de pago
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: payment_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      res.json({
        success: true,
        message: 'Estado de pago actualizado exitosamente',
        data: updatedOrder
      });
    } catch (error) {
      console.error('Error actualizando estado de pago:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

// GET /api/admin/orders/stats - Obtener estadísticas de órdenes
router.get('/orders/stats', requireAdminPermission('view_analytics'), async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calcular fecha de inicio según el período
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Obtener estadísticas directamente de Supabase
    const { data: orders, error } = await supabase
      .from('orders')
      .select('status, payment_status, total, created_at')
      .gte('created_at', startDate.toISOString());

    if (error) {
      throw error;
    }

    // Procesar estadísticas
    const stats = {
      total_orders: orders.length,
      total_revenue: orders.reduce((sum, order) => sum + (order.total || 0), 0),
      orders_by_status: {},
      orders_by_payment_status: {},
      average_order_value: orders.length > 0 ? orders.reduce((sum, order) => sum + (order.total || 0), 0) / orders.length : 0
    };

    // Agrupar por estado
    orders.forEach(order => {
      stats.orders_by_status[order.status] = (stats.orders_by_status[order.status] || 0) + 1;
      stats.orders_by_payment_status[order.payment_status] = (stats.orders_by_payment_status[order.payment_status] || 0) + 1;
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// GET /api/admin/orders/ready-to-ship - Obtener órdenes listas para envío
router.get('/orders/ready-to-ship', requireAdminPermission('manage_orders'), async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_name,
        customer_email,
        customer_phone,
        total,
        created_at,
        shipping_address,
        order_items(
          quantity,
          product_title,
          product_image
        )
      `)
      .eq('status', 'confirmed')
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    const processedOrders = orders.map(order => ({
      ...order,
      shipping_address: JSON.parse(order.shipping_address),
      items_count: order.order_items?.length || 0
    }));

    res.json({
      success: true,
      data: processedOrders
    });
  } catch (error) {
    console.error('Error obteniendo órdenes para envío:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// POST /api/admin/orders/:id/ship - Marcar orden como enviada
router.post('/orders/:id/ship',
  requireAdminPermission('manage_orders'),
  logAdminAction('ship_order'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { tracking_number, shipping_company, notes } = req.body;

      // Verificar que la orden existe y tiene el estado correcto
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, status, payment_status')
        .eq('id', id)
        .single();

      if (orderError || !order) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada'
        });
      }

      if (order.status !== 'confirmed' || order.payment_status !== 'paid') {
        return res.status(400).json({
          success: false,
          message: 'La orden debe estar confirmada y pagada para ser enviada'
        });
      }

      // Actualizar orden con información de envío
      const supabase = require('../config/supabase');
      const { data: updatedOrder, error } = await supabase
        .from('orders')
        .update({
          status: 'shipped',
          tracking_number: tracking_number,
          shipping_company: shipping_company,
          admin_notes: notes,
          shipped_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        message: 'Orden marcada como enviada exitosamente',
        data: updatedOrder
      });
    } catch (error) {
      console.error('Error enviando orden:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

// GET /api/admin/orders/pending-payment - Obtener órdenes con pago pendiente
router.get('/orders/pending-payment', requireAdminPermission('manage_orders'), async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_name,
        customer_email,
        total,
        payment_method,
        created_at,
        payment_details(
          transaction_id,
          payment_method,
          status,
          payment_data
        )
      `)
      .eq('payment_status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error obteniendo órdenes con pago pendiente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// ===== GESTIÓN DE PRODUCTOS =====

// GET /api/admin/products - Obtener todos los productos con filtros
router.get('/products', requireAdminPermission('manage_products'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      brand,
      search,
      sort_by = 'created_at',
      sort_order = 'desc',
      in_stock
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Construir query de productos
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (category) {
      query = query.eq('category', category);
    }
    
    if (brand) {
      query = query.eq('brand', brand);
    }
    
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    if (in_stock === 'true') {
      query = query.gt('stock', 0);
    } else if (in_stock === 'false') {
      query = query.eq('stock', 0);
    }

    // Aplicar ordenamiento
    query = query.order(sort_by, { ascending: sort_order === 'asc' });
    
    // Aplicar paginación
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: products, error, count } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// POST /api/admin/products - Crear nuevo producto
router.post('/products',
  requireAdminPermission('manage_products'),
  logAdminAction('create_product'),
  async (req, res) => {
    try {
      const productData = req.body;
      
      // Validar datos del producto
      const schema = Joi.object({
        title: Joi.string().required().min(3).max(200),
        description: Joi.string().required().min(10),
        price: Joi.number().required().min(0),
        category: Joi.string().required(),
        brand: Joi.string().required(),
        image: Joi.string().uri().required(),
        stock: Joi.number().integer().min(0).default(0),
        is_featured: Joi.boolean().default(false),
        is_active: Joi.boolean().default(true)
      });

      const { error, value } = schema.validate(productData);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Datos de producto inválidos',
          errors: error.details
        });
      }

      // Criar produto diretamente no Supabase
      const { data: product, error: createError } = await supabase
        .from('products')
        .insert([value])
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      res.status(201).json({
        success: true,
        message: 'Produto criado exitosamente',
        data: product
      });
    } catch (error) {
      console.error('Error creando producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

// PUT /api/admin/products/:id - Actualizar producto
router.put('/products/:id',
  requireAdminPermission('manage_products'),
  logAdminAction('update_product'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Verificar que el producto existe
      const { data: existingProduct, error: checkError } = await supabase
        .from('products')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError || !existingProduct) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      // Actualizar producto
      const { data: updatedProduct, error: updateError } = await supabase
        .from('products')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      res.json({
        success: true,
        message: 'Producto actualizado exitosamente',
        data: updatedProduct
      });
    } catch (error) {
      console.error('Error actualizando producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

// DELETE /api/admin/products/:id - Eliminar producto
router.delete('/products/:id',
  requireAdminPermission('manage_products'),
  logAdminAction('delete_product'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar que el producto existe
      const { data: existingProduct, error: checkError } = await supabase
        .from('products')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError || !existingProduct) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      // Eliminar producto
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      res.json({
        success: true,
        message: 'Producto eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error eliminando producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

// ===== GESTIÓN DE USUARIOS =====

// GET /api/admin/users - Obtener todos los usuarios
router.get('/users', requireAdminPermission('manage_users'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      is_active
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = supabase
      .from('users')
      .select('id, email, first_name, last_name, phone, role, is_active, email_verified, created_at, last_login', { count: 'exact' });

    // Aplicar filtros
    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    }
    
    if (role) {
      query = query.eq('role', role);
    }
    
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    // Aplicar paginación
    query = query.range(offset, offset + parseInt(limit) - 1);
    query = query.order('created_at', { ascending: false });

    const { data: users, error, count } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// PUT /api/admin/users/:id/role - Actualizar rol de usuario
router.put('/users/:id/role',
  requireAdminPermission('manage_users'),
  logAdminAction('update_user_role'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      // Validar rol
      const validRoles = ['user', 'admin', 'moderator'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Rol inválido'
        });
      }

      // No permitir que un admin se quite sus propios privilegios
      if (id === req.user.id && role !== 'admin') {
        return res.status(400).json({
          success: false,
          message: 'No puedes cambiar tu propio rol de administrador'
        });
      }

      const { data, error } = await supabase
        .from('users')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Rol de usuario actualizado exitosamente',
        data: {
          id: data.id,
          email: data.email,
          role: data.role
        }
      });
    } catch (error) {
      console.error('Error actualizando rol de usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

// ===== DASHBOARD Y ANALYTICS =====

// GET /api/admin/dashboard - Obtener datos del dashboard
router.get('/dashboard', requireAdminPermission('view_analytics'), async (req, res) => {
  try {
    // Obtener estadísticas generales
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Estadísticas de órdenes directamente de Supabase
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('status, payment_status, total, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (orderError) {
      throw orderError;
    }

    // Procesar estadísticas de órdenes
    const orderStats = {
      total_orders: orderData.length,
      total_revenue: orderData.reduce((sum, order) => sum + (order.total || 0), 0),
      orders_by_status: {},
      orders_by_payment_status: {},
      average_order_value: orderData.length > 0 ? orderData.reduce((sum, order) => sum + (order.total || 0), 0) / orderData.length : 0
    };

    // Agrupar por estado
    orderData.forEach(order => {
      orderStats.orders_by_status[order.status] = (orderStats.orders_by_status[order.status] || 0) + 1;
      orderStats.orders_by_payment_status[order.payment_status] = (orderStats.orders_by_payment_status[order.payment_status] || 0) + 1;
    });
    
    // Estadísticas de usuarios
    const { data: userStats, error: userError } = await supabase
      .from('users')
      .select('role, is_active, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (userError) {
      throw userError;
    }

    // Estadísticas de productos
    const { data: productStats, error: productError } = await supabase
      .from('products')
      .select('category, is_active, stock');

    if (productError) {
      throw productError;
    }

    // Procesar estadísticas
    const dashboard = {
      orders: orderStats,
      users: {
        total: userStats.length,
        new_this_month: userStats.filter(u => new Date(u.created_at) >= thirtyDaysAgo).length,
        active: userStats.filter(u => u.is_active).length,
        by_role: userStats.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {})
      },
      products: {
        total: productStats.length,
        active: productStats.filter(p => p.is_active).length,
        out_of_stock: productStats.filter(p => p.stock === 0).length,
        low_stock: productStats.filter(p => p.stock > 0 && p.stock <= 10).length,
        by_category: productStats.reduce((acc, product) => {
          acc[product.category] = (acc[product.category] || 0) + 1;
          return acc;
        }, {})
      }
    };

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('Error obteniendo datos del dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router;