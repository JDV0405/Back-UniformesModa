const orderModel = require('../models/createorderProduction.models');
const multer = require('multer');
const pool = require('../database/db.js');
const upload = multer({ storage: multer.memoryStorage() });

const uploadMiddleware = upload.single('comprobanteFile');


async function createOrder(req, res) {
    try {
        let employeeId;
        
        if (!req.body.cedulaEmpleadoResponsable) {
            return res.status(400).json({
                success: false,
                message: "El nombre del asesor es requerido"
            });
        }
        
        const employeeResult = await pool.query(
            'SELECT cedula FROM empleado WHERE cedula = $1',
            [req.body.cedulaEmpleadoResponsable]
        );
        
        if (employeeResult.rows.length === 0) {
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
        
        const orderData = {
            fechaAproximada: new Date(req.body.fechaAproximada) || new Date(),
            observaciones: req.body.observaciones,
            cedulaEmpleadoResponsable: employeeId
        };
        
        const clientData = {
            cedula: req.body.cedula,
            nombre: req.body.nombre,
            tipo: req.body.tipoCliente,
            correo: req.body.correo,
            telefono: req.body.numeroCelular,
            direccion: req.body.direccionEntrega,
            idCiudad: req.body.idCiudad,
            idDepartamento: req.body.idDepartamento,
        };
        
        if (clientData.tipo === 'Natural') {
            clientData.tipoDoc = req.body.tipoDocumento;
            clientData.profesion = req.body.profesion;
        } else {
            clientData.sectorEconomico = req.body.sectorEconomico;
        }
        
        const paymentInfo = {
            tipoPago: req.body.tipoPago
        };
        
        const products = JSON.parse(req.body.productos || '[]');
        
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