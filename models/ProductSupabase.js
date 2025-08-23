const supabase = require('../config/supabase');

class ProductSupabase {
  // Obtener todos los productos con filtros opcionales
  static async getAll(filters = {}) {
    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true);

      // Aplicar filtros
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.brand) {
        query = query.eq('brand', filters.brand);
      }
      if (filters.featured) {
        query = query.eq('is_featured', true);
      }
      if (filters.offer) {
        query = query.eq('is_offer', true);
      }
      if (filters.bestSeller) {
        query = query.eq('is_best_seller', true);
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,brand.ilike.%${filters.search}%`);
      }
      if (filters.minPrice) {
        query = query.gte('current_price', filters.minPrice);
      }
      if (filters.maxPrice) {
        query = query.lte('current_price', filters.maxPrice);
      }

      // Ordenamiento
      if (filters.sortBy) {
        const order = filters.sortOrder === 'desc' ? false : true;
        query = query.order(filters.sortBy, { ascending: order });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Paginación
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Error obteniendo productos: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error en ProductSupabase.getAll:', error);
      throw error;
    }
  }

  // Obtener producto por ID
  static async getById(id) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No encontrado
        }
        throw new Error(`Error obteniendo producto: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error en ProductSupabase.getById:', error);
      throw error;
    }
  }

  // Crear nuevo producto
  static async create(productData) {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (error) {
        throw new Error(`Error creando producto: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error en ProductSupabase.create:', error);
      throw error;
    }
  }

  // Actualizar producto
  static async update(id, productData) {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({ ...productData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Error actualizando producto: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error en ProductSupabase.update:', error);
      throw error;
    }
  }

  // Eliminar producto (soft delete)
  static async delete(id) {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Error eliminando producto: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error en ProductSupabase.delete:', error);
      throw error;
    }
  }

  // Obtener productos destacados
  static async getFeatured(limit = 10) {
    return this.getAll({ featured: true, limit });
  }

  // Obtener ofertas
  static async getOffers(limit = 10) {
    return this.getAll({ offer: true, limit });
  }

  // Obtener productos por categoría
  static async getByCategory(category, limit = 20) {
    return this.getAll({ category, limit });
  }

  // Buscar productos
  static async search(searchTerm, filters = {}) {
    return this.getAll({ ...filters, search: searchTerm });
  }

  // Obtener estadísticas
  static async getStats() {
    try {
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: featuredProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('is_featured', true);

      const { count: offerProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('is_offer', true);

      return {
        totalProducts: totalProducts || 0,
        featuredProducts: featuredProducts || 0,
        offerProducts: offerProducts || 0
      };
    } catch (error) {
      console.error('Error en ProductSupabase.getStats:', error);
      throw error;
    }
  }
}

module.exports = ProductSupabase;