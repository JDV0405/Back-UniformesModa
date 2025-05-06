// config/swagger.js
const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Uniformes Moda',
      version: '1.0.0',
      description: 'Documentación de los servicios del sistema de pedidos y usuarios',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor local',
      },
    ],
  },
  apis: ['./routes/*.js'], // Ruta donde están tus endpoints documentados
};

const swaggerSpec = swaggerJSDoc(options);



module.exports = swaggerSpec;
