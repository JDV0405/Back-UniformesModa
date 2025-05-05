const orderModel = require('../models/createorderProduction.models');
const multer = require('multer');
const pool = require('../database/db.js');
const upload = multer({ storage: multer.memoryStorage() });

// Middleware for file upload
const uploadMiddleware = upload.single('comprobanteFile');

/**
 * Creates a new production order
 */
async function createOrder(req, res) {
    try {
        // Validate and get employee ID
        let employeeId;
        
        if (!req.body.nombreAsesor) {
            return res.status(400).json({
                success: false,
                message: "El nombre del asesor es requerido"
            });
        }
        
        // Check if the input is a valid employee ID
        const employeeResult = await pool.query(
            'SELECT cedula FROM empleado WHERE cedula = $1',
            [req.body.nombreAsesor]
        );
        
        if (employeeResult.rows.length === 0) {
            // If not found directly, try to find by name
            const employeeByNameResult = await pool.query(
                'SELECT cedula FROM empleado WHERE nombre ILIKE $1',
                [`%${req.body.nombreAsesor}%`]
            );
            
            if (employeeByNameResult.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "No se encontró ningún empleado con el ID o nombre proporcionado"
                });
            }
            
            employeeId = employeeByNameResult.rows[0].cedula;
        } else {
            employeeId = employeeResult.rows[0].cedula;
        }
        
        // Order data with validated employee ID
        const orderData = {
            fechaAproximada: new Date(req.body.fechaAproximada) || new Date(),
            observaciones: req.body.observaciones,
            cedulaEmpleadoResponsable: employeeId
        };
        
        // Client data
        const clientData = {
            cedula: req.body.cedula,
            nombre: req.body.nombre,
            tipo: req.body.tipoCliente,
            correo: req.body.correo,
            telefono: req.body.numeroCelular,
            direccion: req.body.direccionEntrega,
            idCiudad: req.body.idCiudad
        };
        
        // Add type-specific fields
        if (clientData.tipo === 'Natural') {
            clientData.tipoDoc = req.body.tipoDocumento;
            clientData.profesion = req.body.profesion;
        } else {
            clientData.sectorEconomico = req.body.sectorEconomico;
        }
        
        // Payment info
        const paymentInfo = {
            tipoPago: req.body.tipoPago
        };
        
        // Parse products from the request
        const products = JSON.parse(req.body.productos || '[]');
        
        // Create order
        const result = await orderModel.createOrder(
            orderData,
            clientData,
            products,
            paymentInfo,
            req.file
        );
        
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in createOrder controller:', error);
        res.status(500).json({ 
            success: false, 
            message: "Error al crear la orden", 
            error: error.message 
        });
    }
}

module.exports = {
    createOrder,
    uploadMiddleware
};