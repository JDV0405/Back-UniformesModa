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
const publicApisRoutes = require('./routes/publicApis.routes.js');
const systemRoutes = require('./routes/system.routes.js');
const path = require('path');
const { isAzureBlobAvailable } = require('./config/azureStorage');

// Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger.js');

// AGREGAR ESTA LÍNEA para Azure Web Apps
app.set('trust proxy', 1);

// CORS
app.use(cors({
  origin: true, // Permite cualquier origen
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
}));


app.get('/test-azure-storage', async (req, res) => {
    try {
        const { BlobServiceClient } = require('@azure/storage-blob');
        const blobServiceClient = BlobServiceClient.fromConnectionString(
            process.env.AZURE_STORAGE_CONNECTION_STRING
        );
        
        const containerClient = blobServiceClient.getContainerClient(
            process.env.AZURE_STORAGE_CONTAINER_NAME
        );
        
        // Verificar si el contenedor existe
        const exists = await containerClient.exists();
        
        if (exists) {
            // Listar algunos blobs
            const blobs = [];
            for await (const blob of containerClient.listBlobsFlat()) {
                blobs.push(blob.name);
                if (blobs.length >= 10) break; // Solo mostrar 10
            }
            
            res.json({
                success: true,
                message: 'Conexión a Azure Storage exitosa',
                containerExists: true,
                blobCount: blobs.length,
                sampleBlobs: blobs
            });
        } else {
            res.json({
                success: false,
                message: 'El contenedor no existe',
                containerExists: false
            });
        }
    } catch (error) {
        res.json({
            success: false,
            message: 'Error conectando a Azure Storage',
            error: error.message
        });
    }
});

// Servir archivos estáticos desde la carpeta Uniformes_Imagenes (solo como fallback)
app.use('/images', express.static(path.join(__dirname, 'Uniformes_Imagenes')));

// Servir archivos estáticos de facturas desde el escritorio (solo como fallback)
app.use('/facturas', express.static('C:\\Users\\Asus\\Desktop\\Uniformes_Imagenes\\facturas'));

// Servir archivos estáticos de productos desde el escritorio (solo como fallback)
app.use('/productos', express.static('C:\\Users\\Asus\\Desktop\\Uniformes_Imagenes\\productos'));

// Servir archivos estáticos de comprobantes desde el escritorio (solo como fallback)
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
app.use('/api/production', advanceOrderRoutes);
app.use('/api', createElementsRoutes);
app.use('/api', valoracionesRoutes);
app.use('/api', confeccionistaRoutes);
app.use('/api/public', publicApisRoutes);
app.use('/api/system', systemRoutes);


// Use routes


// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Documentación Swagger: http://localhost:${PORT}/api-docs`);
});
