const emailjs = require('@emailjs/nodejs');
require('dotenv').config();

/**
 * Servicio para envío de emails usando EmailJS
 */
class EmailService {
  constructor() {
    this.serviceId = process.env.EMAILJS_SERVICE_ID;
    this.templateId = process.env.EMAILJS_TEMPLATE_ID;
    this.publicKey = process.env.EMAILJS_PUBLIC_KEY;
    this.privateKey = process.env.EMAILJS_PRIVATE_KEY;
    
    // Verificar que todas las variables estén configuradas
    if (!this.serviceId || !this.templateId || !this.publicKey) {
      console.warn('EmailJS: Faltan variables de entorno. Revisa la configuración.');
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
      const resetLink = `${frontendUrl}/reset-password/${resetToken}`;
      
      const templateParams = {
        email: email,
        link: resetLink,
        to_email: email // EmailJS usa 'to_email' como campo estándar
      };

      console.log('📧 Enviando email de recuperación a:', email);
      console.log('🔗 Link de recuperación:', resetLink);

      const response = await emailjs.send(
        this.serviceId,
        this.templateId,
        templateParams,
        {
          publicKey: this.publicKey,
          privateKey: this.privateKey
        }
      );

      console.log('✅ Email enviado exitosamente:', response.status, response.text);
      return {
        success: true,
        messageId: response.text,
        status: response.status
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
    return !!(this.serviceId && this.templateId && this.publicKey);
  }

  /**
   * Obtiene el estado de la configuración
   * @returns {Object} Estado de la configuración
   */
  getConfigStatus() {
    return {
      serviceId: !!this.serviceId,
      templateId: !!this.templateId,
      publicKey: !!this.publicKey,
      privateKey: !!this.privateKey,
      isFullyConfigured: this.isConfigured()
    };
  }
}

// Exportar una instancia singleton
module.exports = new EmailService();