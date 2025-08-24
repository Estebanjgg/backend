const supabase = require('../config/supabase');

class Favorite {
  // Agregar producto a favoritos
  static async addToFavorites(userId, productId) {
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .insert([
          { 
            user_id: userId, 
            product_id: productId 
          }
        ])
        .select();

      if (error) {
        // Si es error de duplicado, significa que ya está en favoritos
        if (error.code === '23505') {
          throw new Error('El producto ya está en favoritos');
        }
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error agregando a favoritos:', error);
      throw error;
    }
  }

  // Remover producto de favoritos
  static async removeFromFavorites(userId, productId) {
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId)
        .select();

      if (error) throw error;

      return data[0];
    } catch (error) {
      console.error('Error removiendo de favoritos:', error);
      throw error;
    }
  }

  // Obtener todos los favoritos de un usuario
  static async getUserFavorites(userId) {
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('product_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error obteniendo favoritos:', error);
      throw error;
    }
  }

  // Verificar si un producto está en favoritos
  static async isFavorite(userId, productId) {
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error verificando favorito:', error);
      return false;
    }
  }

  // Obtener productos favoritos con detalles (join con productos)
  static async getFavoritesWithDetails(userId) {
    try {
      // Esta consulta necesitará ajustarse según tu esquema de productos
      const { data, error } = await supabase
        .from('user_favorites')
        .select(`
          product_id,
          created_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error obteniendo favoritos con detalles:', error);
      throw error;
    }
  }

  // Contar favoritos de un usuario
  static async getFavoritesCount(userId) {
    try {
      const { count, error } = await supabase
        .from('user_favorites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Error contando favoritos:', error);
      return 0;
    }
  }
}

module.exports = Favorite;
