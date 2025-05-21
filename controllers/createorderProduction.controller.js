const orderModel = require('../models/createorderProduction.models');
const multer = require('multer');
const pool = require('../database/db.js');
const upload = multer({ storage: multer.memoryStorage() });

const uploadMiddleware = upload.single('comprobanteFile');

async function createOrder(req, res) {
    try {
        // Check if we're receiving the new nested structure
        const isNewFormat = req.body.customer && req.body.products;
        
        let employeeId, orderData, clientData, products, paymentInfo;
        
        if (isNewFormat) {
            // Process new JSON format
            const customerData = req.body.customer || {};
            const productsData = req.body.products || [];
            
            // Validate employee ID
            if (!customerData.advisor) {
                return res.status(400).json({
                    success: false,
                    message: "El ID del asesor es requerido"
                });
            }
            
            const employeeResult = await pool.query(
                'SELECT cedula FROM empleado WHERE cedula = $1',
                [customerData.advisor]
            );
            
            if (employeeResult.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "No se encontró ningún empleado con el ID proporcionado"
                });
            }
            
            employeeId = employeeResult.rows[0].cedula;
            
            // Prepare order data
            orderData = {
                fechaAproximada: new Date(customerData.orderDate) || new Date(),
                observaciones: customerData.observaciones || '',
                cedulaEmpleadoResponsable: employeeId
            };
            
            // Prepare client data
            clientData = {
                cedula: customerData.identification,
                nombre: customerData.name,
                tipo: customerData.type === 'natural' ? 'Natural' : 'Juridico',
                correo: customerData.email,
                telefono: customerData.phone,
                direccion: customerData.address,
                idCiudad: customerData.ciudadId,
                idDepartamento: customerData.departamentoId,
                departamento: customerData.departamento,  // Send department name
                ciudad: customerData.ciudad,              // Send city name
            };
            
            // Add client type specific data
            if (clientData.tipo === 'Natural') {
                clientData.tipoDoc = 'Cedula de Ciudadania';  // Default value
                clientData.profesion = customerData.profession || '';
            } else {
                clientData.sectorEconomico = customerData.sector || '';
            }
            
            // Transform products
            products = productsData.map(product => ({
                idProducto: product.id,
                cantidad: product.quantity,
                atributosUsuario: product.fields || {},
                bordado: false,  // Default value
                observacion: product.observaciones || '',
                urlProducto: null
            }));
            
            // Set payment info
            paymentInfo = {
                tipoPago: req.body.paymentType || 'credito'  // Default to credit
            };
            
        } else {
            // Process legacy format
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
            
            orderData = {
                fechaAproximada: new Date(req.body.fechaAproximada) || new Date(),
                observaciones: req.body.observaciones,
                cedulaEmpleadoResponsable: employeeId
            };
            
            clientData = {
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
            
            paymentInfo = {
                tipoPago: req.body.tipoPago
            };
            
            products = JSON.parse(req.body.productos || '[]');
        }
        
        // Fetch department and city names if not provided
        if (clientData.idDepartamento && !clientData.departamento) {
            const deptResult = await pool.query(
                'SELECT nombre FROM departamento WHERE id_departamento = $1',
                [clientData.idDepartamento]
            );
            if (deptResult.rows.length > 0) {
                clientData.departamento = deptResult.rows[0].nombre;
            }
        }
        
        if (clientData.idCiudad && !clientData.ciudad) {
            const cityResult = await pool.query(
                'SELECT ciudad FROM ciudad WHERE id_ciudad = $1',
                [clientData.idCiudad]
            );
            if (cityResult.rows.length > 0) {
                clientData.ciudad = cityResult.rows[0].ciudad;
            }
        }
        
        // Create the order with all the prepared data
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

const deleteProductFromOrder = async (req, res) => {
    try {
        const { orderId, detailId } = req.params;
        
        // Verificar que se proporcionaron los parámetros necesarios
        if (!orderId || !detailId) {
            return res.status(400).json({
                success: false,
                message: "Se requieren ID de orden e ID de detalle del producto"
            });
        }

        // Corregido: usar orderModel en lugar de orderProductionModel
        const result = await orderModel.deleteProductFromOrder(
            parseInt(orderId), 
            parseInt(detailId)
        );

        // Si la operación no fue exitosa, devolver error
        if (!result.success) {
            return res.status(400).json(result);
        }

        // Devolver respuesta exitosa
        return res.status(200).json(result);
        
    } catch (error) {
        console.error('Error en controlador de eliminación de producto:', error);
        return res.status(500).json({
            success: false,
            message: "Error interno del servidor al eliminar el producto",
            error: error.message
        });
    }
};

const deleteOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        
        // Verificar que se proporcionó el ID de la orden
        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Se requiere el ID de la orden"
            });
        }

        // Llamar a la función del modelo para eliminar la orden
        const result = await orderModel.deleteOrder(parseInt(orderId));

        // Si la operación no fue exitosa, devolver error
        if (!result.success) {
            return res.status(400).json(result);
        }

        // Devolver respuesta exitosa
        return res.status(200).json(result);
        
    } catch (error) {
        console.error('Error en controlador de eliminación de orden:', error);
        return res.status(500).json({
            success: false,
            message: "Error interno del servidor al eliminar la orden",
            error: error.message
        });
    }
};

module.exports = {
    createOrder,
    uploadMiddleware,
    deleteProductFromOrder,
    deleteOrder
};