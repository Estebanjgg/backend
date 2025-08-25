-- Crear tabla de órdenes
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Estados
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  
  -- Totales
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  shipping DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  
  -- Información de envío y facturación (JSON)
  shipping_address JSONB NOT NULL,
  billing_address JSONB NOT NULL,
  
  -- Información de pago
  payment_method VARCHAR(20) CHECK (payment_method IN ('credit_card', 'debit_card', 'pix', 'boleto')),
  payment_id VARCHAR(255),
  
  -- Datos de contacto
  customer_name VARCHAR(100) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  
  -- Notas
  notes TEXT,
  admin_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  -- Índices y constraints
  CONSTRAINT valid_user_or_session CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

-- Crear tabla de items de órdenes
CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL,
  
  -- Información del producto en el momento de la compra
  product_title VARCHAR(255) NOT NULL,
  product_image VARCHAR(500),
  product_brand VARCHAR(100),
  
  -- Precios y cantidades
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint para validar total_price
  CONSTRAINT valid_total_price CHECK (total_price = quantity * unit_price)
);

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_session_id ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Crear trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Crear función para generar número de orden
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    order_num TEXT;
    counter INTEGER;
BEGIN
    -- Generar un número basado en timestamp + contador
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 3) AS BIGINT)), 0) + 1
    INTO counter
    FROM orders
    WHERE order_number LIKE 'VK%';
    
    order_num := 'VK' || LPAD(counter::TEXT, 10, '0');
    
    RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- Crear política RLS (Row Level Security) para órdenes
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Política para usuarios autenticados (pueden ver sus propias órdenes)
CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT
    USING (auth.uid() = user_id);

-- Política para insertar órdenes (usuarios autenticados o con sesión)
CREATE POLICY "Users can create orders" ON orders
    FOR INSERT
    WITH CHECK (
        (auth.uid() = user_id) OR 
        (auth.uid() IS NULL AND session_id IS NOT NULL)
    );

-- Política para actualizar órdenes (solo el propietario)
CREATE POLICY "Users can update their own orders" ON orders
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Políticas para order_items (hereda de orders)
CREATE POLICY "Users can view their order items" ON order_items
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM orders 
        WHERE orders.id = order_items.order_id 
        AND orders.user_id = auth.uid()
    ));

CREATE POLICY "Users can create order items" ON order_items
    FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM orders 
        WHERE orders.id = order_items.order_id 
        AND (orders.user_id = auth.uid() OR (auth.uid() IS NULL AND orders.session_id IS NOT NULL))
    ));

-- Comentarios para documentación
COMMENT ON TABLE orders IS 'Tabla principal de órdenes de compra';
COMMENT ON TABLE order_items IS 'Items individuales de cada orden';

COMMENT ON COLUMN orders.order_number IS 'Número único de orden visible para el cliente';
COMMENT ON COLUMN orders.status IS 'Estado actual de la orden';
COMMENT ON COLUMN orders.payment_status IS 'Estado del pago de la orden';
COMMENT ON COLUMN orders.shipping_address IS 'Dirección de envío en formato JSON';
COMMENT ON COLUMN orders.billing_address IS 'Dirección de facturación en formato JSON';

-- Verificar que las tablas fueron creadas correctamente
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        RAISE NOTICE 'Tabla orders creada exitosamente';
    ELSE
        RAISE EXCEPTION 'Error: No se pudo crear la tabla orders';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN
        RAISE NOTICE 'Tabla order_items creada exitosamente';
    ELSE
        RAISE EXCEPTION 'Error: No se pudo crear la tabla order_items';
    END IF;
END $$;
