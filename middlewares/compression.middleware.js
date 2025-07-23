const compression = require('compression');

// Configuración de compresión optimizada
const compressionConfig = compression({
  // Comprimir solo respuestas más grandes de 1KB
  threshold: 1024,
  
  // Nivel de compresión (1-9, donde 6 es el balance óptimo)
  level: 6,
  
  // Filtro para decidir qué comprimir
  filter: (req, res) => {
    // No comprimir si el cliente no acepta compresión
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Solo comprimir respuestas de texto/json
    const contentType = res.getHeader('content-type');
    if (contentType && (
      contentType.includes('application/json') ||
      contentType.includes('text/') ||
      contentType.includes('application/javascript') ||
      contentType.includes('application/xml')
    )) {
      return true;
    }
    
    return false;
  }
});

module.exports = compressionConfig;
