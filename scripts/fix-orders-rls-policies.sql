-- Arreglar políticas RLS para órdenes
-- Este script permite a usuarios anónimos con session_id crear órdenes

-- Eliminar políticas existentes (incluir las nuevas que podrían existir)
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON orders;
DROP POLICY IF EXISTS "Users can view their order items" ON order_items;
DROP POLICY IF EXISTS "Users can create order items" ON order_items;

-- Eliminar políticas nuevas si existen
DROP POLICY IF EXISTS "orders_select_policy" ON orders;
DROP POLICY IF EXISTS "orders_insert_policy" ON orders;
DROP POLICY IF EXISTS "orders_update_policy" ON orders;
DROP POLICY IF EXISTS "order_items_select_policy" ON order_items;
DROP POLICY IF EXISTS "order_items_insert_policy" ON order_items;

-- Crear nuevas políticas más permisivas para órdenes

-- Política para ver órdenes (usuarios autenticados ven sus órdenes, usuarios anónimos ven por session_id)
CREATE POLICY "orders_select_policy" ON orders
    FOR SELECT
    USING (
        (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
        (auth.uid() IS NULL AND session_id IS NOT NULL)
    );

-- Política para insertar órdenes (permite tanto usuarios autenticados como anónimos con session_id)
CREATE POLICY "orders_insert_policy" ON orders
    FOR INSERT
    WITH CHECK (
        (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
        (auth.uid() IS NULL AND session_id IS NOT NULL) OR
        (user_id IS NULL AND session_id IS NOT NULL)
    );

-- Política para actualizar órdenes (solo propietarios autenticados o por session_id)
CREATE POLICY "orders_update_policy" ON orders
    FOR UPDATE
    USING (
        (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
        (auth.uid() IS NULL AND session_id IS NOT NULL)
    );

-- Políticas para order_items

-- Política para ver items de órdenes
CREATE POLICY "order_items_select_policy" ON order_items
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM orders 
        WHERE orders.id = order_items.order_id 
        AND (
            (auth.uid() IS NOT NULL AND orders.user_id = auth.uid()) OR
            (auth.uid() IS NULL AND orders.session_id IS NOT NULL)
        )
    ));

-- Política para insertar items de órdenes
CREATE POLICY "order_items_insert_policy" ON order_items
    FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM orders 
        WHERE orders.id = order_items.order_id 
        AND (
            (auth.uid() IS NOT NULL AND orders.user_id = auth.uid()) OR
            (auth.uid() IS NULL AND orders.session_id IS NOT NULL) OR
            (orders.user_id IS NULL AND orders.session_id IS NOT NULL)
        )
    ));

-- Verificar que las políticas fueron aplicadas
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'orders' 
        AND policyname = 'orders_insert_policy'
    ) THEN
        RAISE NOTICE 'Políticas RLS para orders actualizadas exitosamente';
    ELSE
        RAISE EXCEPTION 'Error: No se pudieron actualizar las políticas RLS para orders';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'order_items' 
        AND policyname = 'order_items_insert_policy'
    ) THEN
        RAISE NOTICE 'Políticas RLS para order_items actualizadas exitosamente';
    ELSE
        RAISE EXCEPTION 'Error: No se pudieron actualizar las políticas RLS para order_items';
    END IF;
END $$;

-- Mostrar las políticas actuales para verificación
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('orders', 'order_items')
ORDER BY tablename, policyname;
