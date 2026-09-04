export const ENV_VARS = {
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || 'neoinvent_secret_key_must_be_long_and_secure',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  SENIAT_ENDPOINT: process.env.SENIAT_ENDPOINT || 'https://api.seniat.gob.ve',
  SENIAT_RFC: process.env.SENIAT_RFC,
  SENIAT_USER: process.env.SENIAT_USER,
  SENIAT_PASS: process.env.SENIAT_PASS,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  TIMESTAMP_FORMAT: 'YYYY-MM-DD HH:mm:ss',
  CURRENCY: 'VES',
  TAX_RATE_IVA: 16, // IVA general en Venezuela
  TAX_RATE_IVA_REDUCIDO: 8, // IVA reducido
  IS_RETENTION_RATE: 1, // ISLR retención por defecto
  INVOICE_SERIE: process.env.INVOICE_SERIE || 'VEN',
  INVOICE_PREFIX: process.env.INVOICE_PREFIX || 'NEOINV',
};

export default ENV_VARS;