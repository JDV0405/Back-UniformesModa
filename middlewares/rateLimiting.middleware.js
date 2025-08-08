const rateLimit = require('express-rate-limit');

// Rate limiting general para APIs normales
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP en 15 minutos
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta IP. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting estricto para operaciones críticas
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // máximo 20 requests por IP en 15 minutos
  message: {
    success: false,
    message: 'Demasiadas solicitudes para esta operación crítica. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting específico para avance de productos
const advanceProductsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // máximo 10 avances por IP en 5 minutos
  message: {
    success: false,
    message: 'Demasiados intentos de avance de productos. Intenta de nuevo en 5 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting para uploads de archivos
const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 20, // máximo 5 uploads por IP en 10 minutos
  message: {
    success: false,
    message: 'Demasiados uploads de archivos. Intenta de nuevo en 10 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  strictLimiter,
  advanceProductsLimiter,
  uploadLimiter
};
