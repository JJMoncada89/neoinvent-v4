/* MULTIMONEDA — Tasa BCV en tiempo real + fallback manual */
import { pool } from '../config/database.js';

let cache = { tasa: null, fecha: null };

// Fuentes de tasa BCV/USD gratuitas (fallback en cadena)
const FUENTES = [
  // API pública de dolar (BCV oficial)
  async () => {
    const r = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', { signal: AbortSignal.timeout(4000) });
    if (!r.ok) throw new Error('dolarapi');
    const j = await r.json();
    return { tasa: parseFloat(j.promedio) || parseFloat(j.rate) || parseFloat(j.precio), fuente: 'dolarapi.com (BCV)' };
  },
  // API del BCV directa (JSON embebido en página)
  async () => {
    const r = await fetch('https://www.bcv.org.ve/tasas-informativas-sistema-bancario', { signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error('bcv');
    const html = await r.text();
    const m = html.match(/(\d{1,3}(?:\.\d{3})*,\d{1,4})\s*Bs/i) || html.match(/dolar[^\d]*(\d{1,3}(?:\.\d{3})*,\d{1,4})/i);
    if (!m) throw new Error('bcv-parse');
    return { tasa: parseFloat(m[1].replace(/\./g, '').replace(',', '.')), fuente: 'bcv.org.ve' };
  },
];

const TASA_MANUAL_DEFAULT = process.env.BCV_RATE_MANUAL || null;

/** GET /api/v1/currency/rate → tasa del día con caché y fallback */
export const getRate = async (req, res) => {
  try {
    // Caché del día
    const hoy = new Date().toISOString().slice(0, 10);
    if (cache.fecha === hoy && cache.tasa) {
      return res.json({ tasa: cache.tasa, fecha: hoy, fuente: cache.fuente, cache: true });
    }

    // Probar fuentes en cadena
    let result = null;
    for (const fuente of FUENTES) {
      try { result = await fuente(); if (result && result.tasa > 0) break; } catch { /* siguiente */ }
    }

    // Fallback a tasa manual configurada (env o BD settings)
    if (!result) {
      const settings = await pool.query(
        "SELECT valor FROM configuracion_negocio WHERE clave = 'tasa_bcv_usd'"
      ).catch(() => ({ rows: [] }));
      const manual = settings.rows[0]?.valor || TASA_MANUAL_DEFAULT;
      if (manual) result = { tasa: parseFloat(manual), fuente: 'manual (configurada)' };
    }

    if (!result) return res.status(502).json({ error: 'No se pudo obtener la tasa BCV. Configure la manual en Ajustes.' });

    cache = { tasa: result.tasa, fecha: hoy, fuente: result.fuente };
    res.json({ tasa: result.tasa, fecha: hoy, fuente: result.fuente, cache: false });
  } catch (e) {
    console.error('Error tasa BCV:', e.message);
    res.status(502).json({ error: e.message });
  }
};

/** PUT /api/v1/currency/rate → fijar tasa manual (fallback) */
export const setManualRate = async (req, res) => {
  try {
    const { tasa } = req.body;
    if (!tasa || parseFloat(tasa) <= 0) return res.status(400).json({ error: 'Tasa inválida' });
    await pool.query(
      `INSERT INTO configuracion_negocio (clave, valor, tipo, negocio_id) VALUES ('tasa_bcv_usd', $1, 'number', 1)
       ON CONFLICT (clave, negocio_id) DO UPDATE SET valor = $1, actualizado_en = NOW()`,
      [String(parseFloat(tasa))]
    );
    cache = { tasa: parseFloat(tasa), fecha: new Date().toISOString().slice(0, 10), fuente: 'manual (actualizada)' };
    res.json({ message: 'Tasa manual guardada', tasa: parseFloat(tasa) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
