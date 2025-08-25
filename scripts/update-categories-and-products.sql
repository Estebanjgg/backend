
-- ===================================================================
-- SCRIPT COMPLETO DE ACTUALIZACIÓN DE CATEGORÍAS - VOKE STORE
-- Fecha: 2025-08-24 03:16:52
-- ===================================================================

-- 1. INSERTAR NUEVAS CATEGORÍAS

-- Insertar nuevas categorías en la tabla categories
INSERT INTO categories (name, description, is_active, created_at, updated_at) VALUES
  ('Desktops', 'Computadoras de escritorio y all-in-one', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Monitores', 'Monitores, TVs y pantallas', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Acessórios', 'Accesorios y periféricos tecnológicos', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);


-- 2. ACTUALIZAR NOMBRES DE CATEGORÍAS EXISTENTES

-- Actualizar nombres de categorías existentes para coincidir con frontend
UPDATE categories SET name = 'Smartphones' WHERE name = 'Smartphone';
UPDATE categories SET name = 'Tablets' WHERE name = 'Tablet';
UPDATE categories SET name = 'Notebooks' WHERE name = 'Notebook';


-- 3. ACTUALIZAR PRODUCTOS CON NUEVAS CATEGORÍAS

-- Actualizar productos a categoría 'Desktops'
UPDATE products 
SET category = 'Desktops', updated_at = CURRENT_TIMESTAMP 
WHERE id IN ('4c5fd9d5-4c4b-45dd-a8bb-2e4dfb65783d', '2054d446-1e5d-4988-ba3e-26726d5eca86', 'b360039f-05ac-4e50-940d-21de56464f2c');

-- Actualizar productos a categoría 'Monitores'
UPDATE products 
SET category = 'Monitores', updated_at = CURRENT_TIMESTAMP 
WHERE id IN ('136a397a-f759-4aec-9037-38d8e696a3ee', 'f87d68b9-2516-46c3-b766-5c9c100970cb', '5de5a823-5f5a-41dc-ab50-4d6f011c1d5f', 'cff9674f-4683-4721-afb9-49871c6d4484', '470e9b33-11de-4ee7-9fe7-b46c6bf65fd6', 'dd102425-3c62-4571-86ef-108c674fa8b3');

-- Actualizar productos a categoría 'Acessórios'
UPDATE products 
SET category = 'Acessórios', updated_at = CURRENT_TIMESTAMP 
WHERE id IN ('40e0ee5d-9cd5-4f13-8d12-8e31682bfa0d', 'd5d8c507-8409-4636-afb1-9043900fc5a9', 'b9888168-eb12-430a-8ad6-e720208f9ae4', 'bd4dace9-646f-4ccc-9cb1-913559507e74', '2944d739-ce6a-45af-9437-df7275105f21', '33281427-9f71-4cbc-8a06-6d8b461ab372', '1d3174ab-2bc3-43fb-8599-a9c04548cf83', '5f74a0ed-1ae9-4205-9ede-379df9c77b62', '52167393-6075-4dec-8225-21de4ee24a63', 'baa201a2-e02a-4a78-a742-9953152696a6');


-- 4. VERIFICACIÓN DE RESULTADOS
SELECT 
    'CATEGORÍAS FINALES:' as info,
    name,
    description,
    is_active
FROM categories 
WHERE is_active = true
ORDER BY name;

SELECT 
    'DISTRIBUCIÓN DE PRODUCTOS:' as info,
    category,
    COUNT(*) as cantidad
FROM products 
WHERE is_active = true
GROUP BY category
ORDER BY cantidad DESC;
