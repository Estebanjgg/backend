
-- ===================================================================
-- SCRIPT PARA AGREGAR COLUMNA BRAND A TABLA PRODUCTS - VOKE STORE
-- Fecha: 2025-08-24 14:18:08
-- ===================================================================

-- 1. AGREGAR COLUMNA BRAND A LA TABLA PRODUCTS
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS brand VARCHAR(50) DEFAULT 'Other';

-- 2. ACTUALIZAR PRODUCTOS CON SUS MARCAS CORRESPONDIENTES

-- Actualizar productos de marca Acer
UPDATE products 
SET brand = 'Acer', updated_at = CURRENT_TIMESTAMP 
WHERE id IN ('0ac84a9c-eb1d-4630-89d6-fd2e97e1e526');

-- Actualizar productos de marca Apple
UPDATE products 
SET brand = 'Apple', updated_at = CURRENT_TIMESTAMP 
WHERE id IN ('40e0ee5d-9cd5-4f13-8d12-8e31682bfa0d', 'e0d9357c-f139-4b4e-a09a-477d7df66fbf', '136a397a-f759-4aec-9037-38d8e696a3ee', 'b360039f-05ac-4e50-940d-21de56464f2c', '727ef6e9-553c-4227-a012-1db2868d894c', '028fa79d-cf28-49cd-b060-e6994ef5be89', '9cfef101-cfac-4923-8af8-d71a6d07e3a5', 'cce862f1-6b82-4552-a401-d6c4e45b948c', '32a5b52f-000e-4d47-83b2-272683cb9da9', '5626375d-8556-4b5a-b9e0-0db3ab61ca44', '04a2382e-8fcb-48de-b1e0-f3cc19d96c55');

-- Actualizar productos de marca Asus
UPDATE products 
SET brand = 'Asus', updated_at = CURRENT_TIMESTAMP 
WHERE id IN ('71a39fd0-659a-4bf4-b8c8-592b7e7a698d');

-- Actualizar productos de marca Bose
UPDATE products 
SET brand = 'Bose', updated_at = CURRENT_TIMESTAMP 
WHERE id IN ('4c5fd9d5-4c4b-45dd-a8bb-2e4dfb65783d');

-- Actualizar productos de marca Canon
UPDATE products 
SET brand = 'Canon', updated_at = CURRENT_TIMESTAMP 
WHERE id IN ('d5d8c507-8409-4636-afb1-9043900fc5a9');

-- Actualizar productos de marca Dell
UPDATE products 
SET brand = 'Dell', updated_at = CURRENT_TIMESTAMP 
WHERE id IN ('2054d446-1e5d-4988-ba3e-26726d5eca86', '6f3a16bb-deff-4f8e-a41d-a9c5278da896', '44245a06-61cb-4d48-993f-03ba100e511c');

-- Actualizar productos de marca Garmin
UPDATE products 
SET brand = 'Garmin', updated_at = CURRENT_TIMESTAMP 
WHERE id IN ('b9888168-eb12-430a-8ad6-e720208f9ae4');

-- Actualizar productos de marca HP
UPDATE products 
SET brand = 'HP', updated_at = CURRENT_TIMESTAMP 
WHERE id IN ('15303659-b24f-42d3-a3b4-48f9d4ae5a8a');

-- Actualizar productos de marca Lenovo
UPDATE products 
SET brand = 'Lenovo', updated_at = CURRENT_TIMESTAMP 
WHERE id IN ('e17468bd-51f0-4526-980e-197c0836507d', 'c742eb37-f3cc-45f6-8079-790c2b158970');

-- Actualizar productos de marca LG
UPDATE products 
SET brand = 'LG', updated_at = CURRENT_TIMESTAMP 
WHERE id IN ('f87d68b9-2516-46c3-b766-5c9c100970cb');

-- Actualizar productos de marca Microsoft
UPDATE products 
SET brand = 'Microsoft', updated_at = CURRENT_TIMESTAMP 
WHERE id IN ('3438f160-2555-4689-afb5-c9bb0cc609a5', 'baa201a2-e02a-4a78-a742-9953152696a6');

-- Actualizar productos de marca Nintendo
UPDATE products 
SET brand = 'Nintendo', updated_at = CURRENT_TIMESTAMP 
WHERE id IN ('5de5a823-5f5a-41dc-ab50-4d6f011c1d5f');

-- Actualizar productos de marca Sony
UPDATE products 
SET brand = 'Sony', updated_at = CURRENT_TIMESTAMP 
WHERE id IN ('2944d739-ce6a-45af-9437-df7275105f21', '1d3174ab-2bc3-43fb-8599-a9c04548cf83', 'dd102425-3c62-4571-86ef-108c674fa8b3', '5f74a0ed-1ae9-4205-9ede-379df9c77b62');

-- Actualizar productos de marca Samsung
UPDATE products 
SET brand = 'Samsung', updated_at = CURRENT_TIMESTAMP 
WHERE id IN ('e91b5ad9-8ba4-4ac6-a170-846393886979', 'faa6939b-e985-4716-a8f1-39ff2a8eb54d', '2545a578-86d2-4536-b7f5-dd297115004d', 'ddf05325-171b-46c4-8a03-6183f7051dd0', '4ab5530b-85e7-4ce5-a698-9cf18d573c6f', 'cff9674f-4683-4721-afb9-49871c6d4484', '470e9b33-11de-4ee7-9fe7-b46c6bf65fd6');

-- 3. VERIFICACIÓN DE RESULTADOS
SELECT 
    'DISTRIBUCIÓN DE MARCAS:' as info,
    brand,
    COUNT(*) as cantidad
FROM products 
WHERE is_active = true
GROUP BY brand
ORDER BY cantidad DESC;

-- Verificar marcas principales vs otras
SELECT 
    'CATEGORIZACIÓN:' as info,
    CASE 
        WHEN brand IN ('Samsung', 'Dell', 'Apple', 'Lenovo') THEN 'Major Brand'
        ELSE 'Other Brand'
    END as brand_category,
    COUNT(*) as cantidad
FROM products 
WHERE is_active = true
GROUP BY brand_category;
