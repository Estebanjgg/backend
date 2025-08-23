const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

// Cargar la documentación YAML
const swaggerDocument = YAML.load(path.join(__dirname, '../docs/api-documentation.yaml'));

// Configuración personalizada de Swagger UI
const swaggerOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #4A90E2; }
    .swagger-ui .scheme-container { background: #f8f9fa; }
    .swagger-ui .btn.authorize { background-color: #4A90E2; border-color: #4A90E2; }
    .swagger-ui .btn.authorize:hover { background-color: #357ABD; }
  `,
  customSiteTitle: 'Voke API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestHeaders: true,
    tryItOutEnabled: true,
    requestInterceptor: (req) => {
      // Agregar headers personalizados si es necesario
      req.headers['Accept'] = 'application/json';
      return req;
    }
  }
};

// Función para configurar Swagger en Express
const setupSwagger = (app) => {
  // Endpoint para servir la documentación
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));
  
  // Endpoint para obtener el JSON de la documentación
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocument);
  });
  
  // Endpoint de información sobre la documentación
  app.get('/docs', (req, res) => {
    res.json({
      message: 'Voke API Documentation',
      endpoints: {
        'Interactive Documentation': `${req.protocol}://${req.get('host')}/api-docs`,
        'JSON Schema': `${req.protocol}://${req.get('host')}/api-docs.json`,
        'Health Check': `${req.protocol}://${req.get('host')}/health`,
        'API Base': `${req.protocol}://${req.get('host')}/api`
      },
      version: '1.0.0',
      description: 'API completa para la tienda electrónica Voke'
    });
  });
  
  console.log('📚 Swagger documentation configured:');
  console.log(`   📖 Interactive docs: /api-docs`);
  console.log(`   📄 JSON schema: /api-docs.json`);
  console.log(`   ℹ️  Info endpoint: /docs`);
};

module.exports = {
  setupSwagger,
  swaggerDocument,
  swaggerOptions
};