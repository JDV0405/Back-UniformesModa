const express = require('express');
const app = express();
const cors = require('cors');
const usuarioRoutes = require('./routes/createUsers.routes.js');
const orderRoutes = require('./routes/orderUsers.routes.js');
const orderManagementRoutes = require('./routes/orderManagement.routes.js');
const createOrder = require('./routes/createorderProduction.routes.js');
const productRoutes = require('./routes/getProductsAndAttributes.routes');
const advanceOrderRoutes = require('./routes/advanceOrder.routes.js');
const createElementsRoutes = require('./routes/createElements.routes.js');
const path = require('path');

// Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger.js');

// CORS
app.use(cors({
  origin: 'http://localhost:5173', // tu frontend
  credentials: true, // si usás cookies o tokens en headers
}));

// Servir archivos estáticos desde la carpeta Uniformes_Imagenes
app.use('/images', express.static(path.join(__dirname, 'Uniformes_Imagenes')));

// Middleware
app.use(express.json());

// Rutas de Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas API
app.use('/api', usuarioRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', createOrder);
app.use('/api/orderManagement', orderManagementRoutes);
app.use('/api', productRoutes);
app.use('/api/produccion', advanceOrderRoutes);
app.use('/api', createElementsRoutes);


// Use routes


// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Documentación Swagger: http://localhost:${PORT}/api-docs`);
});
