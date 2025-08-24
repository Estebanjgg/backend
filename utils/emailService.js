const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * Servicio para envío de emails usando Nodemailer
 */
class EmailService {
  constructor() {
    this.smtpHost = process.env.SMTP_HOST || 'smtp.maileroo.com';
    this.smtpPort = process.env.SMTP_PORT || 587;
    this.smtpUser = process.env.SMTP_USER;
    this.smtpPass = process.env.SMTP_PASS;
    this.fromEmail = process.env.FROM_EMAIL || this.smtpUser;
    
    console.log('🔧 SMTP Configuration Status:');
    console.log('SMTP Host:', this.smtpHost);
    console.log('SMTP Port:', this.smtpPort);
    console.log('SMTP User:', this.smtpUser ? '✅ Set' : '❌ Missing');
    console.log('SMTP Pass:', this.smtpPass ? '✅ Set' : '❌ Missing');
    console.log('From Email:', this.fromEmail);
    
    this.transporter = null;
    if (this.isConfigured()) {
      this.createTransporter();
    }
  }
  
  createTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.smtpHost,
        port: parseInt(this.smtpPort),
        secure: false, // true for 465, false for other ports
        auth: {
          user: this.smtpUser,
          pass: this.smtpPass
        }
      });
      console.log('✅ Nodemailer transporter created successfully');
    } catch (error) {
      console.error('❌ Error creating Nodemailer transporter:', error);
    }
  }

  /**
   * Envía un email de recuperación de contraseña
   * @param {string} email - Email del destinatario
   * @param {string} resetToken - Token de recuperación
   * @param {string} frontendUrl - URL del frontend
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendPasswordResetEmail(email, resetToken, frontendUrl = process.env.FRONTEND_URL) {
    try {
      if (!this.isConfigured()) {
        throw new Error('SMTP no está configurado correctamente');
      }
      
      if (!this.transporter) {
        this.createTransporter();
      }
      
      const resetLink = `${frontendUrl}/reset-password/${resetToken}`;
      
      const mailOptions = {
        from: this.fromEmail,
        to: email,
        subject: 'Recuperación de Contraseña',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Recuperación de Contraseña</h2>
            <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:</p>
            <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Restablecer Contraseña</a>
            <p style="margin-top: 20px; color: #666;">Si no solicitaste este cambio, puedes ignorar este email.</p>
            <p style="color: #666;">Este enlace expirará en 1 hora.</p>
          </div>
        `
      };

      console.log('📧 Enviando email de recuperación a:', email);
      console.log('🔗 Link de recuperación:', resetLink);

      const info = await this.transporter.sendMail(mailOptions);

      console.log('✅ Email enviado exitosamente:', info.messageId);
      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };

    } catch (error) {
      console.error('❌ Error enviando email:', error);
      return {
        success: false,
        error: error.message || 'Error desconocido al enviar email'
      };
    }
  }

  /**
   * Verifica si el servicio está configurado correctamente
   * @returns {boolean} True si está configurado
   */
  isConfigured() {
    return !!(this.smtpUser && this.smtpPass);
  }

  /**
   * Obtiene el estado de la configuración
   * @returns {Object} Estado de la configuración
   */
  getConfigStatus() {
    return {
      smtpHost: !!this.smtpHost,
      smtpPort: !!this.smtpPort,
      smtpUser: !!this.smtpUser,
      smtpPass: !!this.smtpPass,
      fromEmail: !!this.fromEmail,
      isFullyConfigured: this.isConfigured()
    };
  }
}

// Exportar una instancia singleton
module.exports = new EmailService();