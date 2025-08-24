const express = require('express');
const router = express.Router();
const ProductSupabase = require('../models/ProductSupabase');
const supabase = require('../config/supabase');

// GET /api/categories - Obtener todas las categorías con conteo de productos
router.get('/', async (req, res) => {
  try {
    // Obtener todas las categorías disponibles desde Supabase
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true);

    if (categoriesError) {
      throw new Error(`Error obteniendo categorías: ${categoriesError.message}`);
    }

    // Obtener conteo de productos por categoría
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const products = await ProductSupabase.getByCategory(category.name);
        return {
          id: category.id,
          name: category.name,
          description: category.description,
          count: products.length,
          slug: category.name.toLowerCase().replace(/\s+/g, '-'),
          is_active: category.is_active
        };
      })
    );
    
    res.json({
      success: true,
      data: categoriesWithCount
    });
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// GET /api/categories/:category/products - Obtener productos de una categoría específica
router.get('/:category/products', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit, offset } = req.query;
    
    console.log('Buscando productos para categoría:', category);
    
    // Obtener productos por categoría usando Supabase
    const products = await ProductSupabase.getByCategory(category, limit ? parseInt(limit) : 50);
    
    console.log('Productos encontrados:', products.length);
    
    // Aplicar offset si se especifica
    const startIndex = offset ? parseInt(offset) : 0;
    const paginatedProducts = products.slice(startIndex);
    
    res.json({
      success: true,
      data: paginatedProducts,
      pagination: {
        total: products.length,
        count: paginatedProducts.length,
        offset: startIndex,
        limit: limit ? parseInt(limit) : products.length
      },
      category: {
        name: category,
        displayName: category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')
      }
    });
  } catch (error) {
    console.error('Error obteniendo productos de categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// GET /api/categories/featured - Obtener categorías destacadas
router.get('/featured', async (req, res) => {
  try {
    // Obtener categorías con más productos como destacadas
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true);

    if (error) {
      throw new Error(`Error obteniendo categorías: ${error.message}`);
    }

    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const products = await ProductSupabase.getByCategory(category.name);
        return {
          id: category.id,
          name: category.name,
          description: category.description,
          count: products.length,
          slug: category.name.toLowerCase().replace(/\s+/g, '-'),
          isFeatured: true
        };
      })
    );

    // Ordenar por cantidad de productos y tomar las top 6
    const featuredCategories = categoriesWithCount
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
    
    res.json({
      success: true,
      data: featuredCategories
    });
  } catch (error) {
    console.error('Error obteniendo categorías destacadas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router;