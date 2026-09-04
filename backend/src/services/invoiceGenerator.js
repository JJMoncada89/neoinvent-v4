/**
 * Servicio de Facturación Electrónica SENIAT - Venezuela
 * Implementa el protocolo de facturación electrónica según
 * las normativas del SENIAT venezolano
 */
import { SENIAT_CONFIG } from '../config/seniat.js';
import { v4 as uuidv4 } from 'uuid';

let numeroControlCounter = 100000; // Contador en memoria (en producción usar DB)

/**
 * Genera un número de control único según normativa SENIAT
 * Formato: XXXX-YYYYMMDD-NNNNNNNN
 */
const generarNumeroControl = () => {
  const fecha = new Date();
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  numeroControlCounter++;
  return `${SENIAT_CONFIG.INVOICE_PREFIX}-${y}${m}${d}-${String(numeroControlCounter).padStart(8, '0')}`;
};

/**
 * Calcula el monto total de impuestos según el tipo de comprobante
 */
const calcularImpuestos = (items) => {
  let baseGeneral = 0;
  let baseReducido = 0;
  let baseExenta = 0;
  let ivaGeneral = 0;
  let ivaReducido = 0;

  for (const item of items) {
    if (item.tasaIVA === SENIAT_CONFIG.TAX_RATES.GENERAL) {
      baseGeneral += item.subtotal;
      ivaGeneral += item.montoIVA;
    } else if (item.tasaIVA === SENIAT_CONFIG.TAX_RATES.REDUCIDO) {
      baseReducido += item.subtotal;
      ivaReducido += item.montoIVA;
    } else {
      baseExenta += item.subtotal;
    }
  }

  return {
    baseImponibleGeneral: baseGeneral,
    baseImponibleReducido: baseReducido,
    baseExenta: baseExenta,
    ivaGeneral,
    ivaReducido,
    totalIVA: ivaGeneral + ivaReducido,
    totalBaseImponible: baseGeneral + baseReducido + baseExenta,
  };
};

/**
 * Genera una factura electrónica con los datos fiscales venezolanos
 */
export const generarFacturaElectronica = async ({
  rifEmisor,
  rifReceptor,
  tipoComprobante,
  items,
  subtotal,
  iva,
  total,
  observaciones,
  fechaEmision,
}) => {
  const numeroControl = generarNumeroControl();
  const impuestos = calcularImpuestos(items);
  const fecha = fechaEmision || new Date();

  const factura = {
    // Datos del documento
    id: uuidv4(),
    numeroControl,
    tipoComprobante,
    fechaEmision: fecha.toISOString(),
    estado: SENIAT_CONFIG.STATUSES.AUTORIZADA,

    // Datos del emisor
    emisor: {
      rif: rifEmisor,
      razonSocial: process.env.EMPRESA_NOMBRE || 'Mi Negocio C.A.',
      direccion: process.env.EMPRESA_DIRECCION || 'Caracas, Venezuela',
      telefono: process.env.EMPRESA_TELEFONO || '+58 212 0000000',
    },

    // Datos del receptor
    receptor: {
      rif: rifReceptor,
      nombre: process.env.CLIENTE_NOMBRE || 'Consumidor Final',
      direccion: null,
    },

    // Detalle de items
    items,

    // Totales fiscales
    fiscal: {
      baseImponibleGeneral: impuestos.baseImponibleGeneral,
      baseImponibleReducido: impuestos.baseImponibleReducido,
      baseExenta: impuestos.baseExenta,
      ivaGeneral: impuestos.ivaGeneral,
      ivaReducido: impuestos.ivaReducido,
      totalIVA: impuestos.totalIVA,
      subtotal,
      total,
      moneda: 'VES',
    },

    // Leyendas legales obligatorias SENIAT
    leyendas: [
      SENIAT_CONFIG.LEGENDS.OBLIGATORIA_1,
      SENIAT_CONFIG.LEGENDS.OBLIGATORIA_2,
      SENIAT_CONFIG.LEGENDS.OBLIGATORIA_3 + rifEmisor,
      SENIAT_CONFIG.LEGENDS.OBLIGATORIA_4 + numeroControl,
    ],

    observaciones: observaciones || null,
  };

  return factura;
};

/**
 * Valida que el RIF tenga el formato correcto
 */
export const validarRIF = (rif) => {
  if (!rif) return false;
  const regex = /^[VEJG]-\d{7,9}-\d$/;
  return regex.test(rif);
};

/**
 * Consulta el estado de una factura ante el SENIAT
 * (Simulado - en producción sería una llamada a la API del SENIAT)
 */
export const consultarEstadoFactura = async (numeroControl) => {
  // Simulación: retornar el estado almacenado localmente
  return {
    numeroControl,
    estado: SENIAT_CONFIG.STATUSES.AUTORIZADA,
    mensaje: 'Factura autorizada (modo local)',
  };
};

export default { generarFacturaElectronica, validarRIF, consultarEstadoFactura };