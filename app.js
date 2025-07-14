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
const valoracionesRoutes = require('./routes/assessment.routes.js');
const confeccionistaRoutes = require('./routes/manufacturer.routes.js'); 
const path = require('path');

// Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger.js');

// CORS
app.use(cors({
  origin: true, // Permite cualquier origen
  credentials: true,
}));

// Servir archivos estáticos desde la carpeta Uniformes_Imagenes
app.use('/images', express.static(path.join(__dirname, 'Uniformes_Imagenes')));

// Servir archivos estáticos de facturas desde el escritorio
app.use('/facturas', express.static('C:\\Users\\user\\Desktop\\Uniformes_Imagenes\\facturas'));

// Servir archivos estáticos de productos desde el escritorio
app.use('/productos', express.static('C:\\Users\\Asus\\Desktop\\Uniformes_Imagenes\\productos'));

// Servir archivos estáticos de comprobantes desde el escritorio
app.use('/comprobantes', express.static('C:\\Users\\Asus\\Desktop\\Uniformes_Imagenes\\comprobantes'));

// Aumentar límites para JSON y URL-encoded
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


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
app.use('/api/valoraciones', valoracionesRoutes);
app.use('/api/confeccionistas', confeccionistaRoutes);


// Use routes


// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Documentación Swagger: http://localhost:${PORT}/api-docs`);
});
