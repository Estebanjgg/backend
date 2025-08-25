-- Agregar campo role a la tabla users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' NOT NULL;

-- Agregar constraint para validar roles válidos
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('user', 'admin', 'moderator'));

-- Crear índice para el campo role
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Crear un usuario admin por defecto (cambiar email y contraseña según necesidad)
-- Nota: La contraseña 'admin123' será hasheada por la aplicación
INSERT INTO users (email, password, first_name, last_name, role, is_active, email_verified)
VALUES (
  'admin@voke.com',
  '$2b$12$LQv3c1yqBFVyhumFWOhZSOIDGDem7PQ0W5oDgHQ0CuHVJ/KzQK/Hy', -- admin123 hasheado
  'Admin',
  'Voke',
  'admin',
  true,
  true
)
ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  updated_at = NOW();

-- Comentarios para documentación
COMMENT ON COLUMN users.role IS 'Rol del usuario: user (por defecto), admin, moderator';
COMMENT ON CONSTRAINT users_role_check ON users IS 'Valida que el rol sea uno de los valores permitidos';

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'role';

-- Mostrar usuarios con sus roles
SELECT id, email, first_name, last_name, role, is_active, created_at
FROM users
ORDER BY created_at DESC;