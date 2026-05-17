
export const whatsappService = {
  /**
   * Genera un enlace de WhatsApp con un mensaje pre-llenado.
   */
  generateLink(phone: string, message: string) {
    // Limpiar el teléfono (solo números)
    const cleanPhone = phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  },

  /**
   * Envía una notificación de Stock Crítico.
   */
  notifyCriticalStock(materialName: string, sku: string, currentStock: number, unit: string) {
    const saved = localStorage.getItem('mcvill-config');
    const brandName = saved ? JSON.parse(saved).brandName || 'ERP' : 'ERP';

    const message = `🚨 *ALERTA DE STOCK CRÍTICO*\n\n` +
      `Se ha detectado inventario bajo en el sistema ${brandName} ERP:\n\n` +
      `📦 *Material:* ${materialName}\n` +
      `🆔 *SKU:* ${sku}\n` +
      `📉 *Stock Actual:* ${currentStock} ${unit}\n\n` +
      `⚠️ Favor de gestionar la orden de compra a la brevedad.`;
    
    // Abrir en una nueva ventana
    window.open(this.generateLink('', message), '_blank');
  },

  /**
   * Envía una notificación de Orden de Producción.
   */
  notifyProductionOrder(orderId: string, productName: string, quantity: number, priority: string) {
    const message = `🏭 *NUEVA ORDEN DE PRODUCCIÓN*\n\n` +
      `Se ha generado un nuevo protocolo de fabricación:\n\n` +
      `🆔 *Orden:* #${orderId.slice(0, 8)}\n` +
      `🛠️ *Producto:* ${productName}\n` +
      `🔢 *Cantidad:* ${quantity}\n` +
      `🚩 *Prioridad:* ${priority.toUpperCase()}\n\n` +
      `✅ Favor de revisar el tablero de control para iniciar el proceso.`;
    
    window.open(this.generateLink('', message), '_blank');
  }
};
