const express = require('express');
const Order = require('../models/Order');
const { optionalAuth, ensureSession } = require('../middleware/auth');
const Joi = require('joi');
const router = express.Router();

// Aplicar middleware de autenticación opcional y sesión
router.use(optionalAuth);
router.use(ensureSession);

// Simulador de procesamiento de pagos
class PaymentSimulator {
  
  // Simular procesamiento de tarjeta de crédito/débito
  static async processCardPayment(paymentData, amount) {
    // Simular delay de procesamiento
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simular algunos casos de fallo aleatorio (5% de probabilidad)
    if (Math.random() < 0.05) {
      throw new Error('Pago rechazado por el banco');
    }
    
    // Generar ID de transacción ficticia
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      transaction_id: transactionId,
      status: 'approved',
      authorization_code: Math.random().toString(36).substr(2, 8).toUpperCase(),
      payment_method: paymentData.payment_method,
      last_four_digits: paymentData.cardNumber ? paymentData.cardNumber.slice(-4) : null,
      amount: amount,
      currency: 'BRL',
      processed_at: new Date().toISOString()
    };
  }
  
  // Simular PIX
  static async processPixPayment(orderNumber, amount) {
    const qrCode = `PIX_QR_${orderNumber}_${Date.now()}`;
    const pixKey = `pix.key.${Date.now()}@voke.com.br`;
    
    return {
      transaction_id: `PIX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      qr_code: qrCode,
      pix_key: pixKey,
      amount: amount,
      currency: 'BRL',
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutos
      instructions: 'Escaneie o código QR ou use a chave PIX para realizar o pagamento'
    };
  }
  
  // Simular Boleto
  static async processBoletoPayment(orderNumber, customerData, amount) {
    const boletoNumber = `${Date.now()}${Math.random().toString().substr(2, 8)}`;
    
    return {
      transaction_id: `BOLETO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      boleto_number: boletoNumber,
      barcode: `34191.09008 61207.954112 06009.584104 1 89370000${Math.floor(amount * 100).toString().padStart(8, '0')}`,
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 días
      amount: amount,
      currency: 'BRL',
      download_url: `/api/payments/boleto/${boletoNumber}/download`,
      instructions: 'Pague o boleto em qualquer banco, lotérica ou internet banking'
    };
  }
  
  // Simular confirmación de PIX (llamado automáticamente después de un tiempo)
  static async confirmPixPayment(transactionId) {
    // En un sistema real, esto vendría de un webhook del proveedor de pagos
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      transaction_id: transactionId,
      status: 'approved',
      paid_at: new Date().toISOString()
    };
  }
  
  // Simular confirmación de Boleto
  static async confirmBoletoPayment(transactionId) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      transaction_id: transactionId,
      status: 'approved',
      paid_at: new Date().toISOString()
    };
  }
}

// Esquema de validación para pagos
const paymentSchema = Joi.object({
  order_id: Joi.number().integer().required(),
  payment_method: Joi.string().valid('credit_card', 'debit_card', 'pix', 'boleto').required(),
  payment_data: Joi.object({
    cardNumber: Joi.when('...payment_method', {
      is: Joi.valid('credit_card', 'debit_card'),
      then: Joi.string().required(),
      otherwise: Joi.optional()
    }),
    expiryDate: Joi.when('...payment_method', {
      is: Joi.valid('credit_card', 'debit_card'),
      then: Joi.string().required(),
      otherwise: Joi.optional()
    }),
    cvv: Joi.when('...payment_method', {
      is: Joi.valid('credit_card', 'debit_card'),
      then: Joi.string().required(),
      otherwise: Joi.optional()
    }),
    cardName: Joi.when('...payment_method', {
      is: Joi.valid('credit_card', 'debit_card'),
      then: Joi.string().required(),
      otherwise: Joi.optional()
    }),
    installments: Joi.when('...payment_method', {
      is: 'credit_card',
      then: Joi.number().integer().min(1).max(12).default(1),
      otherwise: Joi.optional()
    })
  }).optional(),
  
  // Permitir campos de autenticación
  userId: Joi.string().allow(null).optional(),
  sessionId: Joi.string().allow(null).optional()
}).external(async (value) => {
  // Debug: mostrar qué valores estamos buscando
  console.log('🔍 Debug Payment validation - buscando orden:');
  console.log('  - order_id:', value.order_id);
  console.log('  - userId:', value.userId);
  console.log('  - sessionId:', value.sessionId);
  
  // Verificar que la orden existe y pertenece al usuario
  const order = await Order.getById(value.order_id, value.userId, value.sessionId);
  
  console.log('  - orden encontrada:', order ? 'SÍ' : 'NO');
  if (order) {
    console.log('  - orden.user_id:', order.user_id);
    console.log('  - orden.session_id:', order.session_id);
    console.log('  - orden.payment_status:', order.payment_status);
  }
  
  if (!order) {
    throw new Error('Orden no encontrada');
  }
  
  if (order.payment_status !== 'pending') {
    throw new Error('Esta orden ya fue procesada');
  }
  
  return { ...value, order };
});

// POST /api/payments/process - Procesar pago
router.post('/process', async (req, res) => {
  try {
    const validationResult = await paymentSchema.validateAsync({
      ...req.body,
      userId: req.userId,
      sessionId: req.sessionId
    }, {
      context: { payment_method: req.body.payment_method }
    });

    const { order_id, payment_method, payment_data } = validationResult;
    const order = validationResult.order;
    
    let paymentResult;
    
    // Procesar según el método de pago
    try {
      switch (payment_method) {
        case 'credit_card':
        case 'debit_card':
          paymentResult = await PaymentSimulator.processCardPayment(
            { ...payment_data, payment_method }, 
            order.total
          );
          break;
          
        case 'pix':
          paymentResult = await PaymentSimulator.processPixPayment(
            order.order_number, 
            order.total
          );
          break;
          
        case 'boleto':
          paymentResult = await PaymentSimulator.processBoletoPayment(
            order.order_number,
            {
              name: order.customer_name,
              email: order.customer_email
            },
            order.total
          );
          break;
          
        default:
          throw new Error('Método de pago no soportado');
      }
      
      // Actualizar el estado del pago en la orden
      const paymentStatus = paymentResult.status === 'approved' ? 'paid' : 'pending';
      await Order.updatePaymentStatus(order_id, paymentStatus, paymentResult.transaction_id);
      
      // Guardar detalles del pago
      const supabase = require('../config/supabase');
      await supabase.from('payment_details').insert({
        order_id: order_id,
        transaction_id: paymentResult.transaction_id,
        payment_method: payment_method,
        payment_data: JSON.stringify(paymentResult),
        status: paymentResult.status,
        created_at: new Date().toISOString()
      });
      
      res.json({
        success: true,
        message: 'Pago procesado exitosamente',
        data: {
          payment_result: paymentResult,
          order_status: paymentStatus === 'paid' ? 'confirmed' : 'pending'
        }
      });
      
    } catch (paymentError) {
      // Marcar pago como fallido
      await Order.updatePaymentStatus(order_id, 'failed');
      
      res.status(400).json({
        success: false,
        message: paymentError.message || 'Error procesando el pago',
        error_code: 'PAYMENT_FAILED'
      });
    }
    
    } catch (error) {
      console.error('Error procesando pago:', error);
      
      // Manejar errores de validación específicamente
      if (error.isJoi) {
        return res.status(400).json({
          success: false,
          message: 'Datos de pago inválidos',
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
      }
      
      // Manejar errores de orden no encontrada
      if (error.message.includes('Orden no encontrada') || 
          error.message.includes('ya fue procesada')) {
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

// POST /api/payments/pix/:transactionId/confirm - Simular confirmación de PIX
router.post('/pix/:transactionId/confirm', async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    // Buscar el pago
    const supabase = require('../config/supabase');
    const { data: paymentDetail, error } = await supabase
      .from('payment_details')
      .select('*, orders(*)')
      .eq('transaction_id', transactionId)
      .single();
    
    if (error || !paymentDetail) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }
    
    if (paymentDetail.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Este pago ya fue procesado'
      });
    }
    
    // Confirmar pago
    const confirmResult = await PaymentSimulator.confirmPixPayment(transactionId);
    
    // Actualizar estado del pago
    await supabase
      .from('payment_details')
      .update({
        status: 'approved',
        payment_data: JSON.stringify({
          ...JSON.parse(paymentDetail.payment_data),
          ...confirmResult
        }),
        updated_at: new Date().toISOString()
      })
      .eq('transaction_id', transactionId);
    
    // Actualizar estado de la orden
    await Order.updatePaymentStatus(paymentDetail.order_id, 'paid', transactionId);
    
    res.json({
      success: true,
      message: 'Pago PIX confirmado exitosamente'
    });
    
  } catch (error) {
    console.error('Error confirmando PIX:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// POST /api/payments/boleto/:transactionId/confirm - Simular confirmación de Boleto
router.post('/boleto/:transactionId/confirm', async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    // Buscar el pago
    const supabase = require('../config/supabase');
    const { data: paymentDetail, error } = await supabase
      .from('payment_details')
      .select('*, orders(*)')
      .eq('transaction_id', transactionId)
      .single();
    
    if (error || !paymentDetail) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }
    
    if (paymentDetail.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Este pago ya fue procesado'
      });
    }
    
    // Confirmar pago
    const confirmResult = await PaymentSimulator.confirmBoletoPayment(transactionId);
    
    // Actualizar estado del pago
    await supabase
      .from('payment_details')
      .update({
        status: 'approved',
        payment_data: JSON.stringify({
          ...JSON.parse(paymentDetail.payment_data),
          ...confirmResult
        }),
        updated_at: new Date().toISOString()
      })
      .eq('transaction_id', transactionId);
    
    // Actualizar estado de la orden
    await Order.updatePaymentStatus(paymentDetail.order_id, 'paid', transactionId);
    
    res.json({
      success: true,
      message: 'Pago de boleto confirmado exitosamente'
    });
    
  } catch (error) {
    console.error('Error confirmando boleto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// GET /api/payments/status/:transactionId - Verificar estado del pago
router.get('/status/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    const supabase = require('../config/supabase');
    const { data: paymentDetail, error } = await supabase
      .from('payment_details')
      .select('*')
      .eq('transaction_id', transactionId)
      .single();
    
    if (error || !paymentDetail) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: {
        transaction_id: paymentDetail.transaction_id,
        status: paymentDetail.status,
        payment_method: paymentDetail.payment_method,
        payment_data: JSON.parse(paymentDetail.payment_data),
        created_at: paymentDetail.created_at,
        updated_at: paymentDetail.updated_at
      }
    });
    
  } catch (error) {
    console.error('Error verificando estado del pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// GET /api/payments/boleto/:boletoNumber/download - Simular descarga de boleto
router.get('/boleto/:boletoNumber/download', async (req, res) => {
  try {
    const { boletoNumber } = req.params;
    
    // En un sistema real, esto generaría un PDF del boleto
    const boletoData = {
      numero: boletoNumber,
      beneficiario: 'VOKE TECH LTDA',
      valor: 'R$ 150,00', // Esto vendría de la base de datos
      vencimento: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
      codigo_barras: `34191.09008 61207.954112 06009.584104 1 89370000015000`,
      instrucoes: 'Pagar preferencialmente em agências do Banco do Brasil'
    };
    
    res.json({
      success: true,
      message: 'Boleto gerado com sucesso',
      data: boletoData,
      download_url: `data:text/plain;charset=utf-8,${encodeURIComponent(JSON.stringify(boletoData, null, 2))}`
    });
    
  } catch (error) {
    console.error('Error generando boleto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router;
