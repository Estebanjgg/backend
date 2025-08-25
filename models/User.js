const supabase = require('../config/supabase');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class User {
  constructor(data = {}) {
    this.id = data.id;
    this.email = data.email;
    this.password = data.password;
    this.first_name = data.first_name;
    this.last_name = data.last_name;
    this.phone = data.phone;
    this.role = data.role || 'user';
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.email_verified = data.email_verified || false;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.last_login = data.last_login;
  }

  // Crear nuevo usuario
  static async create(userData) {
    try {
      const { email, password, first_name, last_name, phone } = userData;

      // Verificar si el email ya existe
      const existingUser = await this.findByEmail(email);
      if (existingUser) {
        throw new Error('El email ya está registrado');
      }

      // Hash de la contraseña
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Crear usuario en Supabase
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            first_name: first_name?.trim(),
            last_name: last_name?.trim(),
            phone: phone?.trim(),
            is_active: true,
            email_verified: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creando usuario:', error);
        throw error;
      }

      // No retornar la contraseña
      const { password: _, ...userWithoutPassword } = data;
      return new User(userWithoutPassword);
    } catch (error) {
      console.error('Error en User.create:', error);
      throw error;
    }
  }

  // Buscar usuario por email
  static async findByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error buscando usuario por email:', error);
        throw error;
      }

      return data ? new User(data) : null;
    } catch (error) {
      console.error('Error en User.findByEmail:', error);
      throw error;
    }
  }

  // Buscar usuario por ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error buscando usuario por ID:', error);
        throw error;
      }

      return data ? new User(data) : null;
    } catch (error) {
      console.error('Error en User.findById:', error);
      throw error;
    }
  }

  // Verificar contraseña
  async verifyPassword(password) {
    try {
      return await bcrypt.compare(password, this.password);
    } catch (error) {
      console.error('Error verificando contraseña:', error);
      return false;
    }
  }

  // Generar JWT token
  generateToken() {
    try {
      const payload = {
        id: this.id,
        email: this.email,
        first_name: this.first_name,
        last_name: this.last_name
      };

      return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '7d', // Token válido por 7 días
        issuer: 'voke-api',
        audience: 'voke-frontend'
      });
    } catch (error) {
      console.error('Error generando token:', error);
      throw error;
    }
  }

  // Verificar JWT token
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'voke-api',
        audience: 'voke-frontend'
      });
    } catch (error) {
      console.error('Error verificando token:', error);
      return null;
    }
  }

  // Actualizar último login
  async updateLastLogin() {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', this.id);

      if (error) {
        console.error('Error actualizando último login:', error);
        throw error;
      }

      this.last_login = new Date().toISOString();
      return true;
    } catch (error) {
      console.error('Error en updateLastLogin:', error);
      throw error;
    }
  }

  // Actualizar perfil de usuario
  async updateProfile(updateData) {
    try {
      console.log('updateProfile recibió:', updateData);
      const allowedFields = ['first_name', 'last_name', 'phone'];
      const updates = {};
      
      // Solo permitir campos específicos
      for (const field of allowedFields) {
        if (updateData.hasOwnProperty(field)) {
          const value = updateData[field];
          console.log(`Procesando campo ${field}: '${value}'`);
          
          // Para todos los campos, permitir valores vacíos pero no undefined/null sin intención
          if (typeof value === 'string') {
            const trimmedValue = value.trim();
            
            // Para nombres, requerir que tengan contenido si se proporcionan
            if (field === 'first_name' || field === 'last_name') {
              if (trimmedValue.length > 0) {
                updates[field] = trimmedValue;
              }
            } else if (field === 'phone') {
              // Para phone, siempre incluir la actualización (permite eliminar)
              updates[field] = trimmedValue.length > 0 ? trimmedValue : null;
            }
          }
        }
      }

      console.log('Updates finales:', updates);
      
      // Verificar que al menos haya un campo para actualizar
      if (Object.keys(updates).length === 0) {
        throw new Error('No hay campos válidos para actualizar');
      }

      updates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', this.id)
        .select()
        .single();

      if (error) {
        console.error('Error actualizando perfil:', error);
        throw error;
      }

      // Actualizar propiedades del objeto actual
      Object.assign(this, updates);
      return data;
    } catch (error) {
      console.error('Error en updateProfile:', error);
      throw error;
    }
  }

  // Cambiar contraseña
  async changePassword(currentPassword, newPassword) {
    try {
      // Verificar contraseña actual
      const isCurrentPasswordValid = await this.verifyPassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new Error('Contraseña actual incorrecta');
      }

      // Hash de la nueva contraseña
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      const { error } = await supabase
        .from('users')
        .update({ 
          password: hashedNewPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.id);

      if (error) {
        console.error('Error cambiando contraseña:', error);
        throw error;
      }

      this.password = hashedNewPassword;
      return true;
    } catch (error) {
      console.error('Error en changePassword:', error);
      throw error;
    }
  }

  // Desactivar usuario (soft delete)
  async deactivate() {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.id);

      if (error) {
        console.error('Error desactivando usuario:', error);
        throw error;
      }

      this.is_active = false;
      return true;
    } catch (error) {
      console.error('Error en deactivate:', error);
      throw error;
    }
  }

  // Obtener datos públicos del usuario (sin contraseña)
  toPublicJSON() {
    return {
      id: this.id,
      email: this.email,
      first_name: this.first_name,
      last_name: this.last_name,
      phone: this.phone,
      role: this.role,
      email_verified: this.email_verified,
      created_at: this.created_at,
      last_login: this.last_login
    };
  }

  // Generar token de recuperación de contraseña
  generateResetToken() {
    try {
      const payload = {
        id: this.id,
        email: this.email,
        type: 'password_reset'
      };

      return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '1h', // Token válido por 1 hora
        issuer: 'voke-api',
        audience: 'voke-password-reset'
      });
    } catch (error) {
      console.error('Error generando token de recuperación:', error);
      throw error;
    }
  }

  // Buscar usuario por token de recuperación
  static async findByResetToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'voke-api',
        audience: 'voke-password-reset'
      });

      if (!decoded || decoded.type !== 'password_reset') {
        return null;
      }

      return await this.findById(decoded.id);
    } catch (error) {
      console.error('Error verificando token de recuperación:', error);
      return null;
    }
  }

  // Actualizar contraseña (para recuperación)
  async updatePassword(newPassword) {
    try {
      // Hash de la nueva contraseña
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      const { error } = await supabase
        .from('users')
        .update({ 
          password: hashedPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.id);

      if (error) {
        console.error('Error actualizando contraseña:', error);
        throw error;
      }

      this.password = hashedPassword;
      return true;
    } catch (error) {
      console.error('Error en updatePassword:', error);
      throw error;
    }
  }

  // Limpiar token de recuperación (método placeholder)
  async clearResetToken() {
    // En esta implementación, los tokens son stateless (JWT)
    // No necesitamos limpiar nada en la base de datos
    // Este método existe para compatibilidad con la API
    return true;
  }

  // Obtener nombre completo
  get fullName() {
    const parts = [];
    if (this.first_name) parts.push(this.first_name);
    if (this.last_name) parts.push(this.last_name);
    return parts.join(' ') || this.email;
  }
}

module.exports = User;