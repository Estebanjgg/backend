const supabase = require('../config/supabase');

async function updateProductStock() {
  try {
    console.log('🔍 Actualizando stock del MacBook Pro...');
    
    const productId = '04a2382e-8fcb-48de-b1e0-f3cc19d96c55';
    
    // Primero verificar el producto actual
    const { data: currentProduct, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();
    
    if (fetchError) {
      console.error('❌ Error obteniendo producto:', fetchError);
      return;
    }
    
    console.log('📦 Producto actual:', {
      id: currentProduct.id,
      title: currentProduct.title,
      stock_actual: currentProduct.stock
    });
    
    // Actualizar stock a 10
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update({ stock: 10 })
      .eq('id', productId)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error actualizando stock:', updateError);
      return;
    }
    
    console.log('✅ Stock actualizado exitosamente:', {
      id: updatedProduct.id,
      title: updatedProduct.title,
      stock_nuevo: updatedProduct.stock
    });
    
  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

updateProductStock();
