const supabase = require('../config/supabase');

class Order {
  constructor(data = {}) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.session_id = data.session_id;
    this.order_number = data.order_number;
    this.status = data.status || 'pending'; // pending, confirmed, processing, shipped, delivered, cancelled
    this.subtotal = data.subtotal;
    this.discount = data.discount || 0;
    this.shipping = data.shipping || 0;
    this.tax = data.tax || 0;
    this.total = data.total;
    this.currency = data.currency || 'BRL';
    
    // Información de envío
    this.shipping_address = data.shipping_address;
    this.billing_address = data.billing_address;
    
    // Información de pago
    this.payment_method = data.payment_method;
    this.payment_status = data.payment_status || 'pending'; // pending, paid, failed, refunded
    this.payment_id = data.payment_id;
    
    // Datos de contacto
    this.customer_email = data.customer_email;
    this.customer_phone = data.customer_phone;
    this.customer_name = data.customer_name;
    
    // Notas y comentarios
    this.notes = data.notes;
    this.admin_notes = data.admin_notes;
    
    // Timestamps
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.shipped_at = data.shipped_at;
    this.delivered_at = data.delivered_at;
  }

  // Generar número de orden único
  static generateOrderNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `VK${timestamp}${random}`;
  }

  // Crear nueva orden desde el carrito
  static async createFromCart(orderData, userId = null, sessionId = null) {
    try {
      // Obtener items del carrito
      const Cart = require('./Cart');
      const cartItems = await Cart.getCart(userId, sessionId);
      
      if (!cartItems || cartItems.length === 0) {
        throw new Error('El carrito está vacío');
      }

      // Debug: Mostrar estructura de items del carrito
      console.log('🛒 Items del carrito:', JSON.stringify(cartItems[0], null, 2));

      // Verificar stock disponible para todos los productos
      for (const item of cartItems) {
        const { data: product, error } = await supabase
          .from('products')
          .select('stock, is_active')
          .eq('id', item.product_id)
          .single();

        if (error || !product) {
          throw new Error(`Producto ${item.product_id} no encontrado`);
        }

        if (!product.is_active) {
          throw new Error(`Producto ${item.products?.title || item.product_id} ya no está disponible`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`Stock insuficiente para ${item.products?.title || item.product_id}. Stock disponible: ${product.stock}`);
        }
      }

      // Calcular totales
      const subtotal = cartItems.reduce((sum, item) => {
        const price = item.price || item.products?.current_price || 0;
        return sum + (price * item.quantity);
      }, 0);
      
      const discount = cartItems.reduce((sum, item) => {
        if (item.products && item.products.original_price && item.products.current_price) {
          return sum + ((item.products.original_price - item.products.current_price) * item.quantity);
        }
        return sum;
      }, 0);

      const shipping = orderData.shipping || 0;
      const tax = orderData.tax || 0;
      const total = subtotal + shipping + tax;

      console.log('💰 Cálculos de totales:');
      console.log('  - Subtotal:', subtotal);
      console.log('  - Descuento:', discount);
      console.log('  - Envío:', shipping);
      console.log('  - Impuestos:', tax);
      console.log('  - Total:', total);

      // Crear la orden
      const orderNumber = this.generateOrderNumber();
      
      // Debug: mostrar con qué valores se va a crear la orden
      console.log('🔧 Debug Order creation:');
      console.log('  - userId pasado:', userId);
      console.log('  - sessionId pasado:', sessionId);
      console.log('  - orderNumber generado:', orderNumber);
      
      const newOrder = {
        user_id: userId,
        session_id: sessionId,
        order_number: orderNumber,
        status: 'pending',
        subtotal: subtotal,
        discount: discount,
        shipping: shipping,
        tax: tax,
        total: total,
        currency: orderData.currency || 'BRL',
        
        // Información de envío y facturación
        shipping_address: JSON.stringify(orderData.shipping_address),
        billing_address: JSON.stringify(orderData.billing_address || orderData.shipping_address),
        
        // Información de pago
        payment_method: orderData.payment_method,
        payment_status: 'pending',
        
        // Datos de contacto
        customer_email: orderData.customer_email,
        customer_phone: orderData.customer_phone,
        customer_name: orderData.customer_name,
        
        notes: orderData.notes,
        
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Insertar orden en la base de datos
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([newOrder])
        .select()
        .single();

      if (orderError) {
        console.error('Error creando orden:', orderError);
        throw orderError;
      }

      // Debug: mostrar orden creada
      console.log('✅ Orden creada exitosamente:');
      console.log('  - order.id:', order.id);
      console.log('  - order.user_id:', order.user_id);
      console.log('  - order.session_id:', order.session_id);
      console.log('  - order.order_number:', order.order_number);

      // Crear items de la orden
      const orderItems = cartItems.map(item => {
        // Usar product_id directamente ya que ahora ambos son UUIDs
        const productId = item.product_id || item.products?.id;
        const unitPrice = item.price || item.products?.current_price || 0;
        
        if (!productId) {
          throw new Error(`Product ID no encontrado para item: ${JSON.stringify(item)}`);
        }
        
        return {
          order_id: order.id,
          product_id: productId, // Ahora es UUID tanto en origen como destino
          quantity: item.quantity,
          unit_price: unitPrice,
          total_price: unitPrice * item.quantity,
          product_title: item.products?.title || 'Producto sin nombre',
          product_image: item.products?.image || item.products?.image_url,
          product_brand: item.products?.brand,
          created_at: new Date().toISOString()
        };
      });

      const { data: orderItemsData, error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)
        .select();

      if (itemsError) {
        console.error('Error creando items de orden:', itemsError);
        // Si falla la creación de items, eliminar la orden
        await supabase.from('orders').delete().eq('id', order.id);
        throw itemsError;
      }

      // Actualizar stock de productos
      for (const item of cartItems) {
        // Primero obtener el stock actual
        const { data: currentProduct, error: getError } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.product_id)
          .single();
          
        if (getError) {
          console.error('Error obteniendo stock actual:', getError);
          continue; // Continuar con el siguiente item
        }
        
        // Calcular nuevo stock
        const newStock = currentProduct.stock - item.quantity;
        
        // Actualizar stock
        const { error: stockError } = await supabase
          .from('products')
          .update({
            stock: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.product_id);

        if (stockError) {
          console.error('Error actualizando stock:', stockError);
          // En caso de error, podrías implementar rollback o logging adicional
        } else {
          console.log(`✅ Stock actualizado para producto ${item.product_id}: ${currentProduct.stock} → ${newStock}`);
        }
      }

      // Limpiar carrito después de crear la orden exitosamente
      await Cart.clearCart(userId, sessionId);

      // Retornar orden completa con items
      return {
        ...order,
        items: orderItemsData,
        shipping_address: JSON.parse(order.shipping_address),
        billing_address: JSON.parse(order.billing_address)
      };

    } catch (error) {
      console.error('Error en createFromCart:', error);
      throw error;
    }
  }

  // Obtener orden por ID
  static async getById(orderId, userId = null, sessionId = null) {
    try {
      // Debug: mostrar qué estamos buscando
      console.log('🔍 Debug Order.getById:');
      console.log('  - orderId:', orderId);
      console.log('  - userId:', userId);
      console.log('  - sessionId:', sessionId);
      
      // Intentar buscar la orden sin filtros para obtener información completa
      console.log('  - Buscando orden sin filtros primero...');
      const { data: orderWithoutFilters, error: noFilterError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
        
      if (noFilterError) {
        console.log('  - Orden no existe en absoluto:', noFilterError.message);
        throw noFilterError;
      }
      
      console.log('  - Orden encontrada:');
      console.log('    - order.user_id:', orderWithoutFilters.user_id);
      console.log('    - order.session_id:', orderWithoutFilters.session_id);
      
      // Verificar que el usuario/sesión tiene permisos para ver esta orden
      const canAccess = (
        // Si la orden tiene user_id y coincide con el userId pasado
        (orderWithoutFilters.user_id && userId && orderWithoutFilters.user_id === userId) ||
        // Si la orden tiene session_id y coincide con el sessionId pasado
        (orderWithoutFilters.session_id && sessionId && orderWithoutFilters.session_id === sessionId) ||
        // Si la orden es anónima (user_id null) y tenemos sessionId que coincide
        (!orderWithoutFilters.user_id && orderWithoutFilters.session_id && sessionId && orderWithoutFilters.session_id === sessionId) ||
        // Si no hay filtros específicos, permitir acceso (para casos de administrador)
        (!userId && !sessionId)
      );
      
      if (!canAccess) {
        console.log('  - Acceso denegado: los parámetros no coinciden con la orden');
        const error = new Error('JSON object requested, multiple (or no) rows returned');
        error.code = 'PGRST116';
        error.details = 'The result contains 0 rows';
        throw error;
      }
      
      console.log('  - Acceso permitido ✅');
      const order = orderWithoutFilters;

      if (!order) {
        return null;
      }

      // Obtener los items de la orden por separado
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) {
        console.error('Error obteniendo items de orden:', itemsError);
        // No lanzar error aquí, solo devolver orden sin items
        order.order_items = [];
      } else {
        // Si tenemos items, intentar obtener detalles de productos por separado
        const enrichedItems = [];
        
        for (const item of orderItems || []) {
          // Intentar obtener detalles del producto actual
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('title, image, brand, category')
            .eq('id', item.product_id)
            .single();

          // Agregar item con o sin detalles de producto
          enrichedItems.push({
            ...item,
            products: productError ? null : product
          });
        }
        
        order.order_items = enrichedItems;
      }

      // Parsear direcciones JSON
      if (order.shipping_address) {
        try {
          order.shipping_address = JSON.parse(order.shipping_address);
        } catch (e) {
          order.shipping_address = {};
        }
      }
      
      if (order.billing_address) {
        try {
          order.billing_address = JSON.parse(order.billing_address);
        } catch (e) {
          order.billing_address = {};
        }
      }

      return order;
    } catch (error) {
      console.error('Error en getById:', error);
      throw error;
    }
  }

  // Obtener orden por ID
  static async getById(orderId, userId, sessionId) {
    try {
      console.log('Getting order by ID:', { orderId, userId, sessionId });

      // Buscar la orden por ID
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error('Error obteniendo orden:', orderError);
        throw orderError;
      }

      if (!orderData) {
        return null;
      }

      // Verificar que la orden pertenece al usuario o sesión
      if (userId && orderData.user_id !== userId) {
        return null;
      }
      if (!userId && sessionId && orderData.session_id !== sessionId) {
        return null;
      }

      // Obtener los items de la orden
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          products:product_id (
            id,
            name,
            description,
            price,
            image_url,
            category_id,
            stock
          )
        `)
        .eq('order_id', orderId);

      if (itemsError) {
        console.error('Error obteniendo items de la orden:', itemsError);
        throw itemsError;
      }

      const order = {
        ...orderData,
        order_items: orderItems || []
      };

      return order;

    } catch (error) {
      console.error('Error en getById:', error);
      throw error;
    }
  }
  static async getByOrderNumber(orderNumber, userId = null, sessionId = null) {
    try {
      // Primero obtener la orden básica
      let query = supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber);

      if (userId) {
        query = query.eq('user_id', userId);
      } else if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data: order, error: orderError } = await query.single();

      if (orderError) {
        console.error('Error obteniendo orden:', orderError);
        throw orderError;
      }

      if (!order) {
        return null;
      }

      // Obtener los items de la orden por separado
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);

      if (itemsError) {
        console.error('Error obteniendo items de orden:', itemsError);
        order.order_items = [];
      } else {
        // Enriquecer items con detalles de productos
        const enrichedItems = [];
        
        for (const item of orderItems || []) {
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('title, image, brand, category')
            .eq('id', item.product_id)
            .single();

          enrichedItems.push({
            ...item,
            products: productError ? null : product
          });
        }
        
        order.order_items = enrichedItems;
      }

      // Parsear direcciones JSON
      if (order.shipping_address) {
        try {
          order.shipping_address = JSON.parse(order.shipping_address);
        } catch (e) {
          order.shipping_address = {};
        }
      }
      
      if (order.billing_address) {
        try {
          order.billing_address = JSON.parse(order.billing_address);
        } catch (e) {
          order.billing_address = {};
        }
      }

      return order;
    } catch (error) {
      console.error('Error en getByOrderNumber:', error);
      throw error;
    }
  }

  // Obtener órdenes del usuario
  static async getUserOrders(userId, sessionId = null, limit = 50, offset = 0) {
    try {
      let query = supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total,
          currency,
          payment_status,
          customer_name,
          created_at,
          updated_at,
          order_items (
            id,
            quantity,
            total_price,
            product_title,
            product_image
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (userId) {
        query = query.eq('user_id', userId);
      } else if (sessionId) {
        query = query.eq('session_id', sessionId);
      } else {
        throw new Error('Se requiere user_id o session_id');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error obteniendo órdenes del usuario:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error en getUserOrders:', error);
      throw error;
    }
  }

  // Actualizar estado de la orden
  static async updateStatus(orderId, newStatus, adminNotes = null) {
    try {
      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
      
      if (!validStatuses.includes(newStatus)) {
        throw new Error('Estado de orden inválido');
      }

      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Agregar timestamps especiales según el estado
      if (newStatus === 'shipped') {
        updateData.shipped_at = new Date().toISOString();
      } else if (newStatus === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }

      if (adminNotes) {
        updateData.admin_notes = adminNotes;
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('Error actualizando estado de orden:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error en updateStatus:', error);
      throw error;
    }
  }

  // Actualizar estado de pago
  static async updatePaymentStatus(orderId, paymentStatus, paymentId = null) {
    try {
      const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
      
      if (!validPaymentStatuses.includes(paymentStatus)) {
        throw new Error('Estado de pago inválido');
      }

      const updateData = {
        payment_status: paymentStatus,
        updated_at: new Date().toISOString()
      };

      if (paymentId) {
        updateData.payment_id = paymentId;
      }

      // Si el pago es exitoso, confirmar la orden automáticamente
      if (paymentStatus === 'paid') {
        updateData.status = 'confirmed';
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('Error actualizando estado de pago:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error en updatePaymentStatus:', error);
      throw error;
    }
  }

  // Buscar orden por ID (para admin)
  static async findById(orderId) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            id,
            product_id,
            quantity,
            price,
            product_title,
            product_image
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Orden no encontrada
        }
        throw error;
      }

      return new Order(data);
    } catch (error) {
      console.error('Error en findById:', error);
      throw error;
    }
  }

  // Obtener estadísticas de órdenes (para admin)
  static async getOrderStats(startDate = null, endDate = null) {
    try {
      let query = supabase
        .from('orders')
        .select('status, total, payment_status, created_at');

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error obteniendo estadísticas:', error);
        throw error;
      }

      // Calcular estadísticas
      const stats = {
        totalOrders: data.length,
        totalRevenue: data.reduce((sum, order) => sum + order.total, 0),
        ordersByStatus: {},
        ordersByPaymentStatus: {},
        averageOrderValue: 0
      };

      // Agrupar por estado
      data.forEach(order => {
        stats.ordersByStatus[order.status] = (stats.ordersByStatus[order.status] || 0) + 1;
        stats.ordersByPaymentStatus[order.payment_status] = (stats.ordersByPaymentStatus[order.payment_status] || 0) + 1;
      });

      // Calcular valor promedio de orden
      if (stats.totalOrders > 0) {
        stats.averageOrderValue = stats.totalRevenue / stats.totalOrders;
      }

      return stats;
    } catch (error) {
      console.error('Error en getOrderStats:', error);
      throw error;
    }
  }
}

module.exports = Order;
