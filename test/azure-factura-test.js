/**
 * Script de prueba para verificar la funcionalidad de Azure Blob Storage para facturas
 * Este archivo es solo para pruebas y no debe incluirse en producción
 */

const { saveFileWithFallback, isAzureBlobAvailable } = require('../config/azureStorage');

console.log('🧪 Iniciando pruebas de Azure Blob Storage para facturas...');

// Verificar disponibilidad de Azure
console.log(`📊 Azure Blob Storage disponible: ${isAzureBlobAvailable()}`);

// Simular un archivo de factura
const mockFacturaFile = {
  originalname: 'test-factura.pdf',
  mimetype: 'application/pdf',
  size: 1024,
  buffer: Buffer.from('Mock PDF content for testing')
};

async function testFacturaUpload() {
  try {
    console.log('📄 Probando subida de factura de prueba...');
    
    const baseUrl = 'http://localhost:3000';
    const result = await saveFileWithFallback(mockFacturaFile, 'facturas', baseUrl);
    
    console.log(`✅ Factura de prueba guardada en: ${result}`);
    
    // Verificar si es Azure o local
    if (result.includes('blob.core.windows.net')) {
      console.log('☁️  Archivo guardado en Azure Blob Storage');
    } else {
      console.log('💾 Archivo guardado en almacenamiento local (fallback)');
    }
    
  } catch (error) {
    console.error(`❌ Error en prueba de factura: ${error.message}`);
  }
}

// Ejecutar pruebas si este archivo se ejecuta directamente
if (require.main === module) {
  testFacturaUpload()
    .then(() => {
      console.log('🎉 Pruebas completadas');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en las pruebas:', error);
      process.exit(1);
    });
}

module.exports = {
  testFacturaUpload
};
