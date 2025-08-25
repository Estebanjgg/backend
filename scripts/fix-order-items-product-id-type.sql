AFTER-- Arreglar el tipo de datos de product_id en order_items
-- Cambiar de BIGINT a UUID para que coincida con la tabla products

-- Primero verificar el tipo actual
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND column_name = 'product_id';

-- Eliminar constraint si existe
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS valid_total_price;

-- Cambiar el tipo de columna de bigint a UUID
ALTER TABLE order_items 
ALTER COLUMN product_id TYPE UUID USING product_id::text::UUID;

-- Recrear constraint si es necesario
ALTER TABLE order_items 
ADD CONSTRAINT valid_total_price CHECK (total_price = quantity * unit_price);

-- Verificar el cambio
SELECT 
    'DESPUÉS DEL CAMBIO:' as info,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND column_name = 'product_id';

-- Mostrar estructura completa de order_items para verificar
SELECT 
    'ESTRUCTURA COMPLETA order_items:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'order_items' 
ORDER BY ordinal_position;
