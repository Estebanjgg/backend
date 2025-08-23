const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const ProductSupabase = require('../models/ProductSupabase');
const supabase = require('../config/supabase');

// GET /api/products - Obtener todos los productos
router.get('/', async (req, res) => {
  try {
    // Filtros opcionales
    const { 
      category, 
      brand, 
      minPrice, 
      maxPrice, 
      condition, 
      featured, 
      offer, 
      bestseller,
      search,
      limit,
      offset 
    } = req.query;
    
    // Construir filtros para Supabase
    const filters = {};
    
    if (category) filters.category = category;
    if (brand) filters.brand = brand;
    if (minPrice) filters.minPrice = parseFloat(minPrice);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
    if (featured === 'true') filters.featured = true;
    if (offer === 'true') filters.offer = true;
    if (bestseller === 'true') filters.bestSeller = true;
    if (search) filters.search = search;
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);
    
    // Obtener productos usando Supabase
    const products = await ProductSupabase.getAll(filters);
    
    res.json({
      success: true,
      data: products,
      pagination: {
        count: products.length,
        offset: parseInt(offset) || 0,
        limit: parseInt(limit) || products.length
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

// GET /api/products/:id - Obtener un producto por ID
router.get('/:id', async (req, res) => {
  try {
    const product = await ProductSupabase.getById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error obteniendo producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// POST /api/products - Crear un nuevo producto
router.post('/', async (req, res) => {
  try {
    // Validar datos usando el modelo Product
    const newProduct = new Product(req.body);
    
    // Transformar datos para Supabase
    const productData = {
      title: newProduct.title,
      brand: newProduct.brand,
      category: newProduct.category,
      original_price: newProduct.originalPrice,
      current_price: newProduct.currentPrice,
      discount: newProduct.discount,
      installments: newProduct.installments,
      image: newProduct.image,
      description: newProduct.description,
      stock: newProduct.stock,
      is_active: newProduct.isActive,
      is_featured: newProduct.isFeatured,
      is_offer: newProduct.isOffer,
      is_best_seller: newProduct.isBestSeller,
      condition: newProduct.condition,
      warranty: newProduct.warranty,
      specifications: newProduct.specifications
    };
    
    const createdProduct = await ProductSupabase.create(productData);
    
    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      data: createdProduct
    });
  } catch (error) {
    console.error('Error creando producto:', error);
    res.status(400).json({
      success: false,
      message: 'Error creando producto',
      error: error.message
    });
  }
});

// PUT /api/products/:id - Actualizar un producto
router.put('/:id', async (req, res) => {
  try {
    // Transformar datos para Supabase
    const updateData = {};
    
    if (req.body.title) updateData.title = req.body.title;
    if (req.body.brand) updateData.brand = req.body.brand;
    if (req.body.category) updateData.category = req.body.category;
    if (req.body.originalPrice) updateData.original_price = req.body.originalPrice;
    if (req.body.currentPrice) updateData.current_price = req.body.currentPrice;
    if (req.body.discount !== undefined) updateData.discount = req.body.discount;
    if (req.body.installments) updateData.installments = req.body.installments;
    if (req.body.image) updateData.image = req.body.image;
    if (req.body.description) updateData.description = req.body.description;
    if (req.body.stock !== undefined) updateData.stock = req.body.stock;
    if (req.body.isActive !== undefined) updateData.is_active = req.body.isActive;
    if (req.body.isFeatured !== undefined) updateData.is_featured = req.body.isFeatured;
    if (req.body.isOffer !== undefined) updateData.is_offer = req.body.isOffer;
    if (req.body.isBestSeller !== undefined) updateData.is_best_seller = req.body.isBestSeller;
    if (req.body.condition) updateData.condition = req.body.condition;
    if (req.body.warranty) updateData.warranty = req.body.warranty;
    if (req.body.specifications) updateData.specifications = req.body.specifications;
    
    const updatedProduct = await ProductSupabase.update(req.params.id, updateData);
    
    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      data: updatedProduct
    });
  } catch (error) {
    console.error('Error actualizando producto:', error);
    res.status(400).json({
      success: false,
      message: 'Error actualizando producto',
      error: error.message
    });
  }
});

// DELETE /api/products/:id - Eliminar un producto (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const deletedProduct = await ProductSupabase.delete(req.params.id);
    
    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
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
});

// GET /api/products/categories - Obtener categorías disponibles
router.get('/meta/categories', async (req, res) => {
  try {
    const categories = Product.getCategories();
    res.json({
      success: true,
      data: categories
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

// GET /api/products/meta/brands - Obtener marcas disponibles
router.get('/meta/brands', async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('brand')
      .eq('is_active', true);
    
    if (error) throw error;
    
    const brands = [...new Set(products.map(p => p.brand))].filter(Boolean).sort();
    
    res.json({
      success: true,
      data: brands
    });
  } catch (error) {
    console.error('Error obteniendo marcas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// GET /api/products/meta/conditions - Obtener condiciones disponibles
router.get('/meta/conditions', async (req, res) => {
  try {
    const conditions = Product.getConditions();
    res.json({
      success: true,
      data: conditions
    });
  } catch (error) {
    console.error('Error obteniendo condiciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router;