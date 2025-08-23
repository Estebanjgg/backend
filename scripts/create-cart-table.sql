-- Crear tabla cart_items para el carrito de compras
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NULL, -- ID del usuario logueado (opcional)
    session_id TEXT NULL, -- ID de sesión para usuarios anónimos (opcional)
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL, -- Precio al momento de agregar al carrito
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: debe tener user_id O session_id, pero no ambos
    CONSTRAINT cart_user_or_session CHECK (
        (user_id IS NOT NULL AND session_id IS NULL) OR 
        (user_id IS NULL AND session_id IS NOT NULL)
    )
    
    -- Nota: La unicidad se maneja con índices únicos parciales más abajo
);

-- Índices únicos parciales para garantizar unicidad
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_product 
    ON cart_items(user_id, product_id) 
    WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_session_product 
    ON cart_items(session_id, product_id) 
    WHERE session_id IS NOT NULL;

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cart_items_session_id ON cart_items(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_created_at ON cart_items(created_at);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_cart_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_cart_items_updated_at ON cart_items;
CREATE TRIGGER trigger_update_cart_items_updated_at
    BEFORE UPDATE ON cart_items
    FOR EACH ROW
    EXECUTE FUNCTION update_cart_items_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas las operaciones (ya que manejamos la seguridad en el backend)
CREATE POLICY "Allow all operations on cart_items" ON cart_items
    FOR ALL USING (true) WITH CHECK (true);

-- Comentarios para documentación
COMMENT ON TABLE cart_items IS 'Tabla para almacenar items del carrito de compras';
COMMENT ON COLUMN cart_items.user_id IS 'ID del usuario logueado (opcional, para carritos persistentes)';
COMMENT ON COLUMN cart_items.session_id IS 'ID de sesión para usuarios anónimos (opcional)';
COMMENT ON COLUMN cart_items.product_id IS 'Referencia al producto en el carrito';
COMMENT ON COLUMN cart_items.quantity IS 'Cantidad del producto en el carrito';
COMMENT ON COLUMN cart_items.price IS 'Precio del producto al momento de agregarlo al carrito';

-- Verificar que la tabla se creó correctamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'cart_items' 
ORDER BY ordinal_position;