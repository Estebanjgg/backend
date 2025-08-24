-- Script para verificar la estructura de tablas existentes
-- Ejecutar en Supabase Dashboard > SQL Editor para entender qué tenemos

-- Verificar si existe la tabla products
SELECT 
    'TABLA PRODUCTS:' as info,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;

-- Verificar si existe la tabla users
SELECT 
    'TABLA USERS:' as info,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Verificar productos existentes (si la tabla existe)
SELECT 
    'PRODUCTOS EXISTENTES:' as info,
    id,
    title,
    brand,
    category,
    current_price,
    is_active
FROM products 
WHERE is_active = true 
ORDER BY id
LIMIT 5;

-- Verificar usuarios existentes (si la tabla existe)
SELECT 
    'USUARIOS EXISTENTES:' as info,
    id,
    email,
    first_name,
    created_at
FROM users 
ORDER BY created_at
LIMIT 3;

-- Mostrar todas las tablas disponibles
SELECT 
    'TODAS LAS TABLAS:' as info,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
