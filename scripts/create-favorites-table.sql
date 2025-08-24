-- Tabla para almacenar los productos favoritos de los usuarios
-- IMPORTANTE: Ejecutar solo después de verificar que las tablas 'users' y 'products' existen

-- Verificar que las tablas necesarias existen
DO $$
BEGIN
    -- Verificar tabla users
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE EXCEPTION 'Tabla "users" no existe. Ejecuta primero el script setup-database.sql';
    END IF;
    
    -- Verificar tabla products
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        RAISE EXCEPTION 'Tabla "products" no existe. Crea primero la tabla de productos en Supabase';
    END IF;
    
    RAISE NOTICE 'Tablas verificadas correctamente. Creando tabla user_favorites...';
END
$$;

-- Crear tabla user_favorites con foreign keys apropiadas
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys con referencia a las tablas existentes
  CONSTRAINT fk_user_favorites_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_favorites_product_id 
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  
  -- Evitar duplicados: un usuario solo puede tener un producto como favorito una vez
  CONSTRAINT unique_user_product UNIQUE(user_id, product_id)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_product_id ON user_favorites(product_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_created_at ON user_favorites(created_at);

-- Habilitar RLS (Row Level Security)
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas las operaciones (ya que manejamos la seguridad en el backend)
DROP POLICY IF EXISTS "Allow all operations on user_favorites" ON user_favorites;
CREATE POLICY "Allow all operations on user_favorites" ON user_favorites
    FOR ALL USING (true) WITH CHECK (true);

-- Comentarios para documentación
COMMENT ON TABLE user_favorites IS 'Almacena los productos favoritos de cada usuario con foreign keys';
COMMENT ON COLUMN user_favorites.user_id IS 'ID del usuario que marcó el producto como favorito (FK a users.id)';
COMMENT ON COLUMN user_favorites.product_id IS 'ID del producto marcado como favorito (FK a products.id UUID)';
COMMENT ON COLUMN user_favorites.created_at IS 'Fecha y hora cuando se agregó a favoritos';

-- Verificar que la tabla se creó correctamente
SELECT 
    'TABLA USER_FAVORITES CREADA:' as status,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_favorites' 
ORDER BY ordinal_position;

-- Mostrar las foreign keys creadas
SELECT 
    'FOREIGN KEYS CREADAS:' as status,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'user_favorites';

-- Mostrar productos existentes para referencia
SELECT 
    'PRODUCTOS DISPONIBLES PARA FAVORITOS:' as info,
    id,
    title,
    brand,
    category,
    current_price
FROM products 
WHERE is_active = true 
ORDER BY id
LIMIT 10;
