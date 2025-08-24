const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const cartRoutes = require('./routes/cart');
const authRoutes = require('./routes/auth');
const { setupSwagger } = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares de seguridad y logging
app.use(helmet());
app.use(morgan('combined'));

// CORS configuration
// Procesar FRONTEND_URL que puede contener múltiples URLs separadas por comas
const frontendUrls = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:5173'];

const allowedOrigins = [
  ...frontendUrls,
  'http://localhost:5174',
  'http://localhost:5175',
  'https://projecto-final-toti-voke-x5vm.vercel.app', // Dominio real de Vercel
  'https://projecto-final-toti-voke.vercel.app', // Dominio alternativo de Vercel
  'https://projecto-final-toti-voke-e08f1d84i-estebanjggs-projects.vercel.app' // Nueva URL de Vercel
];

console.log('🌐 URLs permitidas para CORS:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware para parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Configurar Swagger Documentation
setupSwagger(app);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Voke API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    documentation: {
      interactive: `${req.protocol}://${req.get('host')}/api-docs`,
      json: `${req.protocol}://${req.get('host')}/api-docs.json`,
      info: `${req.protocol}://${req.get('host')}/docs`
    }
  });
});

// Routes
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/auth', authRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Bienvenido a la API de Voke',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      products: '/api/products',
      categories: '/api/categories'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Algo salió mal!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    message: `La ruta ${req.originalUrl} no existe`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Servidor Voke corriendo en puerto ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;