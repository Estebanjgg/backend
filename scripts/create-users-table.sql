-- Crear tabla users para autenticación
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NULL,
    phone VARCHAR(20) NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    email_verified BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE NULL,
    
    -- Constraints
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_first_name_length CHECK (LENGTH(TRIM(first_name)) >= 2),
    CONSTRAINT users_password_length CHECK (LENGTH(password) >= 6)
);

-- Índices para mejorar performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_active 
    ON users(email) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_users_updated_at ON users;
CREATE TRIGGER trigger_update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas las operaciones (ya que manejamos la seguridad en el backend)
CREATE POLICY "Allow all operations on users" ON users
    FOR ALL USING (true) WITH CHECK (true);

-- Comentarios para documentación
COMMENT ON TABLE users IS 'Tabla para almacenar usuarios del sistema';
COMMENT ON COLUMN users.email IS 'Email único del usuario (usado para login)';
COMMENT ON COLUMN users.password IS 'Contraseña hasheada con bcrypt';
COMMENT ON COLUMN users.first_name IS 'Nombre del usuario';
COMMENT ON COLUMN users.last_name IS 'Apellido del usuario (opcional)';
COMMENT ON COLUMN users.phone IS 'Teléfono del usuario (opcional)';
COMMENT ON COLUMN users.is_active IS 'Si el usuario está activo (soft delete)';
COMMENT ON COLUMN users.email_verified IS 'Si el email ha sido verificado';
COMMENT ON COLUMN users.last_login IS 'Fecha del último login exitoso';

-- Crear algunos usuarios de prueba (opcional)
-- NOTA: Estas contraseñas están hasheadas con bcrypt (password: "123456")
INSERT INTO users (email, password, first_name, last_name, phone, email_verified) VALUES
('admin@voke.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXwtGtrmu3VG', 'Admin', 'Voke', '+1234567890', true),
('user@test.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXwtGtrmu3VG', 'Usuario', 'Prueba', '+0987654321', true)
ON CONFLICT (email) DO NOTHING;

-- Verificar que la tabla se creó correctamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Mostrar usuarios creados
SELECT 
    id,
    email,
    first_name,
    last_name,
    phone,
    is_active,
    email_verified,
    created_at
FROM users
ORDER BY created_at;