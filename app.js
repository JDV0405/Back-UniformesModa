const express = require('express');
const app = express();
const usuarioRoutes = require('./routes/createUsers.routes.js');

// Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger.js');

// Middleware
app.use(express.json());

// Rutas de Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas API
app.use('/api', usuarioRoutes);

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Documentación Swagger: http://localhost:${PORT}/api-docs`);
});
