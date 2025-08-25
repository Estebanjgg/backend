const express = require('express');
const supabase = require('../config/supabase');
const router = express.Router();

// POST /api/admin/update-stock-emergency - Actualizar stock de productos (temporal, sin auth)
router.post('/update-stock-emergency', async (req, res) => {
  try {
    console.log('🔧 === ACTUALIZACION DE STOCK DE EMERGENCIA ===');
    
    const productId = '04a2382e-8fcb-48de-b1e0-f3cc19d96c55';
    const newStock = 10;
    
    // Primero verificar el producto actual
    const { data: currentProduct, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();
    
    if (fetchError) {
      console.error('❌ Error obteniendo producto:', fetchError);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo producto',
        error: fetchError
      });
    }
    
    console.log('📦 Producto actual:', {
      id: currentProduct.id,
      title: currentProduct.title,
      stock_actual: currentProduct.stock
    });
    
    // Actualizar stock
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', productId)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error actualizando stock:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Error actualizando stock',
        error: updateError
      });
    }
    
    console.log('✅ Stock actualizado exitosamente:', {
      id: updatedProduct.id,
      title: updatedProduct.title,
      stock_anterior: currentProduct.stock,
      stock_nuevo: updatedProduct.stock
    });
    
    res.json({
      success: true,
      message: 'Stock actualizado exitosamente',
      data: {
        product: updatedProduct,
        stock_anterior: currentProduct.stock,
        stock_nuevo: updatedProduct.stock
      }
    });
    
  } catch (error) {
    console.error('💥 Error general:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// POST /api/admin/update-stock - Actualizar stock de productos (requiere auth)
router.post('/update-stock', async (req, res) => {
  try {
    console.log('🔧 === ACTUALIZACION DE STOCK ===');
    
    const productId = '04a2382e-8fcb-48de-b1e0-f3cc19d96c55';
    const newStock = 10;
    
    // Primero verificar el producto actual
    const { data: currentProduct, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();
    
    if (fetchError) {
      console.error('❌ Error obteniendo producto:', fetchError);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo producto',
        error: fetchError
      });
    }
    
    console.log('📦 Producto actual:', {
      id: currentProduct.id,
      title: currentProduct.title,
      stock_actual: currentProduct.stock
    });
    
    // Actualizar stock
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', productId)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error actualizando stock:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Error actualizando stock',
        error: updateError
      });
    }
    
    console.log('✅ Stock actualizado exitosamente:', {
      id: updatedProduct.id,
      title: updatedProduct.title,
      stock_anterior: currentProduct.stock,
      stock_nuevo: updatedProduct.stock
    });
    
    res.json({
      success: true,
      message: 'Stock actualizado exitosamente',
      data: {
        product: updatedProduct,
        stock_anterior: currentProduct.stock,
        stock_nuevo: updatedProduct.stock
      }
    });
    
  } catch (error) {
    console.error('💥 Error general:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router;
