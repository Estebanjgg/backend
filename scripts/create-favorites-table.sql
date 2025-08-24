-- Tabla para almacenar los productos favoritos de los usuarios
CREATE TABLE IF NOT EXISTS user_favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Evitar duplicados: un usuario solo puede tener un producto como favorito una vez
  UNIQUE(user_id, product_id)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_product_id ON user_favorites(product_id);

-- Comentarios para documentación
COMMENT ON TABLE user_favorites IS 'Almacena los productos favoritos de cada usuario';
COMMENT ON COLUMN user_favorites.user_id IS 'ID del usuario que marcó el producto como favorito';
COMMENT ON COLUMN user_favorites.product_id IS 'ID del producto marcado como favorito';
COMMENT ON COLUMN user_favorites.created_at IS 'Fecha y hora cuando se agregó a favoritos';
