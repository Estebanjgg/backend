const express = require('express');
const router = express.Router();
const Favorite = require('../models/Favorite');
const { authenticateToken } = require('../middleware/auth');

// Todas las rutas de favoritos requieren autenticación
router.use(authenticateToken);

/**
 * @swagger
 * components:
 *   schemas:
 *     Favorite:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID único del favorito
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: ID del usuario
 *         product_id:
 *           type: string
 *           format: uuid
 *           description: ID del producto
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación
 */

/**
 * @swagger
 * /api/favorites:
 *   get:
 *     summary: Obtener favoritos del usuario
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de productos favoritos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Favorite'
 *       401:
 *         description: No autorizado
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const favorites = await Favorite.getUserFavorites(userId);
    
    res.json({
      success: true,
      data: favorites
    });
  } catch (error) {
    console.error('Error obteniendo favoritos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/favorites/count:
 *   get:
 *     summary: Obtener cantidad de favoritos del usuario
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cantidad de favoritos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 */
router.get('/count', async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await Favorite.getFavoritesCount(userId);
    
    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error contando favoritos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/favorites/{productId}:
 *   post:
 *     summary: Agregar producto a favoritos
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del producto (UUID)
 *     responses:
 *       201:
 *         description: Producto agregado a favoritos
 *       400:
 *         description: Producto ya está en favoritos
 *       401:
 *         description: No autorizado
 */
router.post('/:productId', async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = req.params.productId;

    // Validar que el productId sea un UUID válido
    if (!productId || typeof productId !== 'string' || productId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'ID de producto inválido'
      });
    }

    const favorite = await Favorite.addToFavorites(userId, productId);
    
    res.status(201).json({
      success: true,
      message: 'Producto agregado a favoritos',
      data: favorite
    });
  } catch (error) {
    console.error('Error agregando a favoritos:', error);
    
    if (error.message === 'El producto ya está en favoritos') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/favorites/{productId}:
 *   delete:
 *     summary: Remover producto de favoritos
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del producto (UUID)
 *     responses:
 *       200:
 *         description: Producto removido de favoritos
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Producto no encontrado en favoritos
 */
router.delete('/:productId', async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = req.params.productId;

    // Validar que el productId sea un UUID válido
    if (!productId || typeof productId !== 'string' || productId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'ID de producto inválido'
      });
    }

    const result = await Favorite.removeFromFavorites(userId, productId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado en favoritos'
      });
    }
    
    res.json({
      success: true,
      message: 'Producto removido de favoritos'
    });
  } catch (error) {
    console.error('Error removiendo de favoritos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/favorites/check/{productId}:
 *   get:
 *     summary: Verificar si un producto está en favoritos
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del producto (UUID)
 *     responses:
 *       200:
 *         description: Estado del favorito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 isFavorite:
 *                   type: boolean
 */
router.get('/check/:productId', async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = req.params.productId;

    // Validar que el productId sea un UUID válido
    if (!productId || typeof productId !== 'string' || productId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'ID de producto inválido'
      });
    }

    const isFavorite = await Favorite.isFavorite(userId, productId);
    
    res.json({
      success: true,
      isFavorite
    });
  } catch (error) {
    console.error('Error verificando favorito:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;
