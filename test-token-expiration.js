const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api'; // Ajusta tu puerto si es diferente
const CREDENTIALS = {
  email: 'Admin@gmail.com', // Cambia por credenciales válidas de tu BD
  password: '123456'     // Cambia por una contraseña válida
};

async function testTokenExpiration() {
  try {
    console.log('🧪 Probando expiración y renovación de tokens...\n');
    
    // Paso 1: Login inicial
    console.log('1️⃣ Haciendo login inicial...');
    const loginResponse = await axios.post(`${BASE_URL}/orderManagement/login`, CREDENTIALS);
    
    if (!loginResponse.data.success) {
      throw new Error('Login falló: ' + loginResponse.data.message);
    }
    
    const { accessToken, refreshToken } = loginResponse.data.data;
    console.log('✅ Login exitoso');
    console.log(`📋 Access Token: ${accessToken.substring(0, 50)}...`);
    console.log(`🔄 Refresh Token: ${refreshToken.substring(0, 50)}...`);
    console.log(`⏰ Token expira en: 10 segundos (configurado para prueba rápida)\n`);
    
    // Paso 2: Probar que el token funciona inicialmente
    console.log('2️⃣ Probando access token inicial con endpoint protegido...');
    try {
      // Usar un endpoint que realmente existe y está protegido
      const protectedResponse = await axios.get(`${BASE_URL}/production/ordersCompleted`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      console.log('✅ Access token inicial funciona correctamente');
      console.log(`📊 Datos obtenidos: ${protectedResponse.data.data?.length || 0} órdenes completadas\n`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('❌ Access token inicial no funciona - Error 401:', error.response?.data?.message);
        return;
      } else {
        console.log('✅ Access token funciona (endpoint devolvió:', error.response?.status, ')');
        console.log('📄 Respuesta:', error.response?.data?.message || 'Sin mensaje específico');
        console.log('ℹ️  Continuando con la prueba...\n');
      }
    }
    
    // Para prueba rápida
    console.log('🚀 Esperando 15 segundos para que expire el token...');
    console.log('⏳ Asegúrate de que ACCESS_TOKEN_EXPIRES esté configurado a "10s"\n');
    
    // Countdown de 15 segundos
    for (let i = 15; i > 0; i--) {
      process.stdout.write(`\r⏱️  ${i} segundos restantes...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('\n');
    
    // Paso 3: Intentar usar el token expirado
    console.log('3️⃣ Probando access token expirado...');
    try {
      await axios.get(`${BASE_URL}/production/ordersCompleted`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      console.log('❌ ERROR: El token debería haber expirado pero aún funciona');
      console.log('💡 Verifica que ACCESS_TOKEN_EXPIRES esté configurado a "10s" en el controller');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correcto: Access token expiró como esperado');
        console.log(`📄 Error: ${error.response.data.message}\n`);
      } else {
        console.log('❓ Error inesperado:', error.response?.status, error.response?.data?.message);
      }
    }
    
    // Paso 4: Usar refresh token para obtener nuevo access token
    console.log('4️⃣ Usando refresh token para obtener nuevo access token...');
    try {
      const refreshResponse = await axios.post(`${BASE_URL}/orderManagement/refresh-token`, {
        refreshToken: refreshToken
      });
      
      if (refreshResponse.data.success) {
        const newAccessToken = refreshResponse.data.data.accessToken;
        console.log('✅ Refresh token exitoso');
        console.log(`🆕 Nuevo Access Token: ${newAccessToken.substring(0, 50)}...`);
        console.log(`⏰ Nuevo token expira en: ${refreshResponse.data.data.expiresIn} segundos\n`);
        
        // Paso 5: Probar el nuevo access token
        console.log('5️⃣ Probando nuevo access token...');
        const newProtectedResponse = await axios.get(`${BASE_URL}/production/ordersCompleted`, {
          headers: { 'Authorization': `Bearer ${newAccessToken}` }
        });
        
        if (newProtectedResponse.data.success) {
          console.log('✅ ¡Nuevo access token funciona perfectamente!');
          console.log(`📊 Datos obtenidos: ${newProtectedResponse.data.data?.length || 0} órdenes completadas`);
          console.log('\n🎉 ¡PRUEBA COMPLETADA EXITOSAMENTE!');
          console.log('✅ El sistema de refresh tokens está funcionando correctamente');
        }
      }
    } catch (error) {
      console.log('❌ Error al usar refresh token:', error.response?.data?.message || error.message);
      console.log('🔍 Código de estado:', error.response?.status);
      console.log('📄 Respuesta completa:', error.response?.data);
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.response?.data?.message || error.message);
    console.log('🔍 Código de estado:', error.response?.status);
  }
}

// Función para probar múltiples endpoints protegidos
async function testMultipleProtectedEndpoints() {
  try {
    console.log('🧪 Probando múltiples endpoints protegidos...\n');
    
    // Login
    const loginResponse = await axios.post(`${BASE_URL}/orderManagement/login`, CREDENTIALS);
    const { accessToken } = loginResponse.data.data;
    
    console.log('✅ Login exitoso\n');
    
    // Endpoints a probar
    const endpoints = [
      { name: 'Órdenes completadas', url: '/production/ordersCompleted' },
      { name: 'Confeccionistas activos', url: '/production/GetManufacturer' },
      { name: 'Procesos disponibles', url: '/production/available-manufacturing-processes' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Probando: ${endpoint.name}`);
        const response = await axios.get(`${BASE_URL}${endpoint.url}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        console.log(`✅ ${endpoint.name}: Funciona correctamente`);
        console.log(`📊 Respuesta: ${response.data.success ? 'Éxito' : 'Error'}\n`);
      } catch (error) {
        if (error.response?.status === 401) {
          console.log(`❌ ${endpoint.name}: Token rechazado (401)`);
        } else {
          console.log(`⚠️  ${endpoint.name}: ${error.response?.status} - ${error.response?.data?.message || 'Sin mensaje'}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
  }
}

// Ejecutar prueba
console.log('Selecciona el tipo de prueba:');
console.log('1. Prueba de expiración de tokens');
console.log('2. Prueba de múltiples endpoints protegidos\n');

const args = process.argv.slice(2);
if (args[0] === 'endpoints') {
  testMultipleProtectedEndpoints();
} else {
  testTokenExpiration();
}