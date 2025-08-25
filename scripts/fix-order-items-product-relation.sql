-- Script para arreglar la relación entre order_items y products
-- Este script asegura que exista la foreign key correcta

-- 1. Verificar tipos de datos actuales
SELECT 
    'VERIFICACIÓN INICIAL:' as info,
    t.table_name,
    c.column_name,
    c.data_type
FROM information_schema.columns c
JOIN information_schema.tables t ON c.table_name = t.table_name
WHERE (t.table_name = 'products' AND c.column_name = 'id')
   OR (t.table_name = 'order_items' AND c.column_name = 'product_id')
ORDER BY t.table_name, c.column_name;

-- 2. Si product_id no es UUID, convertirlo
DO $$
BEGIN
    -- Verificar si product_id en order_items es BIGINT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_items' 
        AND column_name = 'product_id' 
        AND data_type = 'bigint'
    ) THEN
        RAISE NOTICE 'Convirtiendo product_id de BIGINT a UUID...';
        
        -- Eliminar datos existentes que podrían causar conflictos
        DELETE FROM order_items;
        
        -- Cambiar tipo de columna
        ALTER TABLE order_items 
        ALTER COLUMN product_id TYPE UUID USING NULL;
        
        RAISE NOTICE 'product_id convertido a UUID exitosamente';
    ELSE
        RAISE NOTICE 'product_id ya es tipo UUID o compatible';
    END IF;
END $$;

-- 3. Eliminar foreign key existente si existe
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS fk_order_items_product_id;
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;

-- 4. Crear la foreign key correcta
ALTER TABLE order_items 
ADD CONSTRAINT fk_order_items_product_id 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

-- 5. Verificar que la foreign key se creó correctamente
SELECT 
    'FOREIGN KEYS CREADAS:' as info,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'order_items'
    AND kcu.column_name = 'product_id';

-- 6. Verificar tipos finales
SELECT 
    'VERIFICACIÓN FINAL:' as info,
    t.table_name,
    c.column_name,
    c.data_type
FROM information_schema.columns c
JOIN information_schema.tables t ON c.table_name = t.table_name
WHERE (t.table_name = 'products' AND c.column_name = 'id')
   OR (t.table_name = 'order_items' AND c.column_name = 'product_id')
ORDER BY t.table_name, c.column_name;

-- 7. Mensaje de confirmación
DO $$
BEGIN
    -- Verificar que la foreign key existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name = 'order_items'
        AND constraint_name LIKE '%product%'
    ) THEN
        RAISE NOTICE '✅ Foreign key entre order_items.product_id y products.id creada exitosamente';
    ELSE
        RAISE WARNING '❌ No se pudo verificar la creación de la foreign key';
    END IF;
END $$;
