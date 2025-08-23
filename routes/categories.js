const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const fs = require('fs').promises;
const path = require('path');

// Ruta del archivo de datos
const PRODUCTS_FILE = path.join(__dirname, '../data/products.json');

// Función auxiliar para leer productos del archivo
async function readProducts() {
  try {
    const data = await fs.readFile(PRODUCTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error leyendo productos:', error);
    return [];
  }
}

// GET /api/categories - Obtener todas las categorías con conteo de productos
router.get('/', async (req, res) => {
  try {
    const products = await readProducts();
    const activeProducts = products.filter(product => product.isActive);
    
    // Obtener categorías disponibles del modelo
    const availableCategories = Product.getCategories();
    
    // Contar productos por categoría
    const categoriesWithCount = availableCategories.map(category => {
      const count = activeProducts.filter(product => product.category === category).length;
      return {
        name: category,
        count,
        slug: category.toLowerCase().replace(/\s+/g, '-')
      };
    });
    
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
    
    const products = await readProducts();
    
    // Filtrar productos por categoría
    let categoryProducts = products.filter(product => 
      product.isActive && 
      product.category.toLowerCase() === category.toLowerCase().replace('-', ' ')
    );
    
    // Paginación
    const total = categoryProducts.length;
    const startIndex = offset ? parseInt(offset) : 0;
    const endIndex = limit ? startIndex + parseInt(limit) : categoryProducts.length;
    
    const paginatedProducts = categoryProducts.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedProducts,
      pagination: {
        total,
        count: paginatedProducts.length,
        offset: startIndex,
        limit: limit ? parseInt(limit) : total
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
    const products = await readProducts();
    const activeProducts = products.filter(product => product.isActive);
    
    // Categorías con más productos se consideran destacadas
    const categoryCount = {};
    activeProducts.forEach(product => {
      categoryCount[product.category] = (categoryCount[product.category] || 0) + 1;
    });
    
    // Ordenar por cantidad de productos y tomar las top 6
    const featuredCategories = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 6)
      .map(([category, count]) => ({
        name: category,
        count,
        slug: category.toLowerCase().replace(/\s+/g, '-'),
        isFeatured: true
      }));
    
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