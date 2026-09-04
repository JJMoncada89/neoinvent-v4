/**
 * Configuración SENIAT - Venezuela
 * Basado en la Resolución Administrativa No. 0007 del 2024
 * y demás normativas fiscales vigentes
 */

export const SENIAT_CONFIG = {
  // Endpoints oficiales (simulados para desarrollo)
  ENDPOINTS: {
    AUTH: '/facturacion-electronica/auth',
    AUTHENTICATE: '/facturacion-electronica/authenticate',
    ISSUE_INVOICE: '/facturacion-electronica/issue',
    CONSULT_INVOICE: '/facturacion-electronica/consult',
    CANCEL_INVOICE: '/facturacion-electronica/cancel',
    GET_TIMBRE: '/facturacion-electronica/timbre',
  },

  // Tipos de documento SENIAT
  DOCUMENT_TYPES: {
    RIF_PROVEEDOR: 'J-',  // RIF persona juridica
    RIF_CLIENTE: 'V-',   // RIF persona natural
    RIF_EMPRESA: 'G-',   // RIF sociedad
    RIF_EXTRANJERO: 'E-',// RIF extranjero
  },

  // Tipos de comprobante
  COMPROBANT_TYPES: {
    FACTURA_A: '01',   // Factura A (contribuyentes del IVA)
    FACTURA_B: '02',   // Factura B (no contribuyentes del IVA)
    BOLETA: '03',      // Boleta de ventas
    NOTA_CREDITO: '04',// Nota de crédito
    NOTA_DEBITO: '05', // Nota de débito
    EXONERADA: '06',   // Exonerada
  },

  // Estados de factura
  STATUSES: {
    PENDIENTE: 'PENDIENTE',
    AUTORIZADA: 'AUTORIZADA',
    RECHAZADA: 'RECHAZADA',
    CANCELADA: 'CANCELADA',
    VIGENTE: 'VIGENTE',
  },

  // Rangos de números de control (por empresa)
  NUMERO_CONTROL: {
    MIN: 100000,
    MAX: 999999999,
  },

  // Tasa de IVA
  TAX_RATES: {
    GENERAL: 16,    // 16% - IVA general
    REDUCIDO: 8,    // 8% - IVA reducido
    EXENTO: 0,      // 0% - Exento
  },

  // Retenciones ISLR
  ISLR_RETENTIONS: {
    SERVICIOS: 1,   // 1% servicios
    COMERCIO: 1.5,  // 1.5% comercio
    ALQUILER: 2,    // 2% alquiler
    PROFESIONAL: 5, // 5% profesionales (arrendamiento servicios)
  },

  // Leyendas obligatorias en factura
  LEGENDS: {
    OBLIGATORIA_1:
      'Este comprobante es el sustituye al timbre fiscal y/o los efectos especiales',
    OBLIGATORIA_2:
      'De acuerdo a lo establecido en la Ley del Impuesto al Valor Agregado',
    OBLIGATORIA_3:
      'Contribuyente identificado ante el SENIAT: RIF ',
    OBLIGATORIA_4:
      'Autorización SENIAT: No. ',
  },
};

export default SENIAT_CONFIG;