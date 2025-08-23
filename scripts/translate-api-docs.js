const fs = require('fs');
const path = require('path');

// Translation mappings from Spanish to English
const translations = {
  // General terms
  'Filtrar por': 'Filter by',
  'Buscar por': 'Search by',
  'Ordenar por': 'Sort by',
  'Página': 'Page',
  'Límite': 'Limit',
  'Precio mínimo': 'Minimum price',
  'Precio máximo': 'Maximum price',
  'Condición del producto': 'Product condition',
  'Marca del producto': 'Product brand',
  'Término de búsqueda': 'Search term',
  'Número de página': 'Page number',
  'Número de productos por página': 'Number of products per page',
  'Orden de los resultados': 'Order of results',
  'pracutos': 'products',
  'Pracutos': 'Products',
  'marca': 'brand',
  'Marca': 'Brand',
  'precio': 'price',
  'Precio': 'Price',
  'condición': 'condition',
  'Condición': 'Condition',
  'límite': 'limit',
  'página': 'page',
  'búsqueda': 'search',
  'Búsqueda': 'Search',
  'orden': 'order',
  'Orden': 'Order',
  
  // Product operations
  'Obtener todos los productos': 'Get all products',
  'Obtener producto por ID': 'Get product by ID',
  'Crear nuevo producto': 'Create new product',
  'Crear un nuevo producto': 'Create new product',
  'Obtener un producto por ID': 'Get product by ID',
  'Actualizar producto': 'Update product',
  'Actualizar un producto': 'Update product',
  'Eliminar producto': 'Delete product',
  'Eliminar un producto': 'Delete product',
  'Obtener productos destacados': 'Get featured products',
  'Obtener ofertas del día': 'Get daily offers',
  'Buscar productos': 'Search products',
  'Productos': 'Products',
  'Categorías': 'Categories',
  'Carrito': 'Cart',
  'Autenticación': 'Authentication',
  
  // Category operations
  'Obtener todas las categorías': 'Get all categories',
  'Obtener categorías destacadas': 'Get featured categories',
  'Obtener productos por categoría': 'Get products by category',
  
  // Cart operations
  'Obtener carrito de compras': 'Get shopping cart',
  'Obtener resumen del carrito': 'Get cart summary',
  'Agregar producto al carrito': 'Add product to cart',
  'Actualizar cantidad en el carrito': 'Update cart quantity',
  'Eliminar producto del carrito': 'Remove product from cart',
  'Delete product del carrito': 'Remove product from cart',
  'Vaciar carrito': 'Clear cart',
  'Limpiar carrito': 'Clear cart',
  'Migrar carrito de sesión a usuario': 'Migrate session cart to user',
  
  // Authentication operations
  'Registrar nuevo usuario': 'Register new user',
  'Iniciar sesión': 'Login user',
  'Cerrar sesión': 'Logout user',
  'Obtener perfil del usuario': 'Get user profile',
  'Actualizar perfil del usuario': 'Update user profile',
  'Cambiar contraseña': 'Change password',
  'Verificar token JWT': 'Verify JWT token',
  'Desactivar cuenta': 'Deactivate account',
  
  // Response messages
  'Productos obtenidos exitosamente': 'Products retrieved successfully',
  'Producto obtenido exitosamente': 'Product retrieved successfully',
  'Producto creado exitosamente': 'Product created successfully',
  'Producto actualizado exitosamente': 'Product updated successfully',
  'Producto eliminado exitosamente': 'Product deleted successfully',
  'Categorías obtenidas exitosamente': 'Categories retrieved successfully',
  'Carrito obtenido exitosamente': 'Cart retrieved successfully',
  'Resumen del carrito obtenido exitosamente': 'Cart summary retrieved successfully',
  'Producto agregado al carrito': 'Product added to cart',
  'Cantidad actualizada en el carrito': 'Cart quantity updated',
  'Producto eliminado del carrito': 'Product removed from cart',
  'Carrito vaciado exitosamente': 'Cart cleared successfully',
  'Carrito migrado exitosamente': 'Cart migrated successfully',
  'Usuario registrado exitosamente': 'User registered successfully',
  'Login exitoso': 'Login successful',
  'Logout exitoso': 'Logout successful',
  'Perfil obtenido exitosamente': 'Profile retrieved successfully',
  'Perfil actualizado exitosamente': 'Profile updated successfully',
  'Contraseña cambiada exitosamente': 'Password changed successfully',
  'Token válido': 'Token valid',
  'Cuenta desactivada exitosamente': 'Account deactivated successfully',
  
  // Error messages
  'Producto no encontrado': 'Product not found',
  'Categoría no encontrada': 'Category not found',
  'Usuario no encontrado': 'User not found',
  'Credenciales inválidas': 'Invalid credentials',
  'Token inválido o expirado': 'Invalid or expired token',
  'Token inválido': 'Invalid token',
  'Token requerido': 'Token required',
  'Email ya registrado': 'Email already registered',
  'Datos inválidos': 'Invalid data',
  'Parámetros inválidos': 'Invalid parameters',
  'Solicitud inválida': 'Invalid request',
  'No autorizado': 'Unauthorized',
  'No encontrado': 'Not found',
  'Error interno del servidor': 'Internal server error',
  'Demasiados intentos de login': 'Too many login attempts',
  'Contraseña requerida': 'Password required',
  'Contraseña actual incorrecta': 'Current password incorrect',
  'Datos inválidos o contraseña actual incorrecta': 'Invalid data or current password incorrect',
  'Token inválido o contraseña incorrecta': 'Invalid token or incorrect password',
  'Stock insuficiente': 'Insufficient stock',
  
  // Descriptions
  'Retorna una lista de productos': 'Returns a list of products',
  'Retorna un producto específico': 'Returns a specific product',
  'Crea un nuevo producto': 'Creates a new product',
  'Actualiza un producto existente': 'Updates an existing product',
  'Elimina un producto': 'Deletes a product',
  'Retorna todas las categorías': 'Returns all categories',
  'Retorna los productos en el carrito': 'Returns products in the cart',
  'Retorna el resumen con totales del carrito': 'Returns cart summary with totals',
  'Agrega un producto al carrito': 'Adds a product to the cart',
  'Actualiza la cantidad de un producto': 'Updates product quantity',
  'Elimina un producto del carrito': 'Removes a product from cart',
  'Vacía completamente el carrito': 'Completely empties the cart',
  'Migra los productos del carrito': 'Migrates cart products',
  'Crea una nueva cuenta de usuario': 'Creates a new user account',
  'Autentica un usuario': 'Authenticates a user',
  'Cierra la sesión del usuario': 'Logs out the user',
  'Obtiene la información del perfil': 'Gets profile information',
  'Actualiza la información del perfil': 'Updates profile information',
  'Cambia la contraseña del usuario': 'Changes user password',
  'Verifica si un token JWT es válido': 'Verifies if a JWT token is valid',
  'Desactiva la cuenta del usuario': 'Deactivates user account',
  
  // Field descriptions
  'ID único del producto': 'Unique product ID',
  'Nombre del producto': 'Product name',
  'Descripción del producto': 'Product description',
  'Precio del producto': 'Product price',
  'Categoría del producto': 'Product category',
  'Marca del producto': 'Product brand',
  'Condición del producto': 'Product condition',
  'Stock disponible': 'Available stock',
  'URL de la imagen': 'Image URL',
  'Si el producto está destacado': 'If the product is featured',
  'Si el producto está en oferta': 'If the product is on sale',
  'Fecha de creación': 'Creation date',
  'Fecha de última actualización': 'Last update date',
  'ID único del usuario': 'Unique user ID',
  'Email del usuario': 'User email',
  'Email único del usuario': 'Unique user email',
  'Nombre del usuario': 'User first name',
  'Apellido del usuario': 'User last name',
  'Teléfono del usuario': 'User phone',
  'Si el usuario está activo': 'If the user is active',
  'Contraseña del usuario': 'User password',
  'Contraseña hasheada': 'Hashed password',
  'Nueva contraseña': 'New password',
  'Contraseña actual': 'Current password',
  'Token JWT': 'JWT token',
  'Token JWT para autenticación': 'JWT token for authentication',
  'Token JWT a verificar': 'JWT token to verify',
  'ID del usuario': 'User ID',
  'ID de sesión': 'Session ID',
  'ID del producto': 'Product ID',
  'Cantidad del producto': 'Product quantity',
  'Precio al momento de agregar': 'Price when added',
  'Número de productos únicos': 'Number of unique products',
  'Precio total': 'Total price',
  'Precio subtotal': 'Subtotal price',
  'Impuestos': 'Taxes',
  'Descuentos': 'Discounts',
  
  // Categories
  'Electrónicos': 'Electronics',
  'Teléfonos': 'Phones',
  'Computadoras': 'Computers',
  'Accesorios': 'Accessories',
  
  // Conditions
  'Nuevo': 'New',
  'Usado': 'Used',
  'Reacondicionado': 'Refurbished',
  
  // Sort options
  'precio_asc': 'price_asc',
  'precio_desc': 'price_desc',
  'nombre_asc': 'name_asc',
  'nombre_desc': 'name_desc',
  'fecha_asc': 'date_asc',
  'fecha_desc': 'date_desc',
  
  // Additional terms
  'opcional': 'optional',
  'requerido': 'required',
  'mínimo': 'minimum',
  'máximo': 'maximum',
  'caracteres': 'characters',
  'ejemplo': 'example',
  'formato': 'format',
  'tipo': 'type',
  'valor': 'value',
  'por defecto': 'default',
  'exitosamente': 'successfully',
  'correctamente': 'correctly'
};

function translateApiDocs() {
  const filePath = path.join(__dirname, '../docs/api-documentation.yaml');
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Apply translations
    Object.entries(translations).forEach(([spanish, english]) => {
      // Use global regex to replace all occurrences
      const regex = new RegExp(spanish.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      content = content.replace(regex, english);
    });
    
    // Write back the translated content
    fs.writeFileSync(filePath, content, 'utf8');
    
    console.log('✅ API documentation translated successfully!');
    console.log(`📄 File: ${filePath}`);
    console.log(`🔄 Applied ${Object.keys(translations).length} translations`);
    
  } catch (error) {
    console.error('❌ Error translating API documentation:', error.message);
    process.exit(1);
  }
}

// Run the translation
translateApiDocs();