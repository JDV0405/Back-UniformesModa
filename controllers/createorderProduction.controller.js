const orderModel = require('../models/createorderProduction.models');
const multer = require('multer');
const pool = require('../database/db.js');
const path = require('path');
const fs = require('fs');

// Configuración unificada de storage usando diskStorage
const unifiedStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath;
        
        if (file.fieldname === 'comprobanteFile') {
            uploadPath = 'C:\\Users\\Asus\\Desktop\\Uniformes_Imagenes\\comprobantes';
        } else if (file.fieldname.startsWith('productImages')) {
            uploadPath = 'C:\\Users\\Asus\\Desktop\\Uniformes_Imagenes\\productos';
        } else {
            uploadPath = 'C:\\Users\\Asus\\Desktop\\Uniformes_Imagenes\\otros';
        }
        
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const randomSuffix = Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        
        if (file.fieldname === 'comprobanteFile') {
            cb(null, `comprobante_${timestamp}_${randomSuffix}${extension}`);
        } else if (file.fieldname.startsWith('productImages')) {
            cb(null, `producto_${timestamp}_${randomSuffix}${extension}`);
        } else {
            cb(null, `archivo_${timestamp}_${randomSuffix}${extension}`);
        }
    }
});

const upload = multer({ 
    storage: unifiedStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB por archivo
        files: 30, // Aumentado para más archivos
        fields: 100, // Más campos de texto
        fieldNameSize: 200, // Nombres de campos más largos
        fieldSize: 10 * 1024 * 1024, // 10MB para campos de texto muy largos (como JSON)
        parts: 150, // Más partes en total
        headerPairs: 2000 // Más pares de headers
    }
});

const createFieldsConfig = (maxProducts = 20) => {
    const fields = [
        { name: 'comprobanteFile', maxCount: 1 },
        { name: 'productImages', maxCount: 30 }
    ];
    
    // Generar dinámicamente campos para productos
    for (let i = 0; i < maxProducts; i++) {
        fields.push({ name: `productImages_${i}`, maxCount: 5 });
    }
    
    return fields;
};

const uploadMiddleware = upload.fields(createFieldsConfig(50));

async function createOrder(req, res) {
    try {
        // ✅ PARSEAR JSON STRINGS SI VIENEN DE FORMDATA
        if (typeof req.body.customer === 'string') {
            try {
                req.body.customer = JSON.parse(req.body.customer);
            } catch (e) {
                return res.status(400).json({
                    success: false,
                    message: "Error al parsear datos del cliente"
                });
            }
        }
        if (typeof req.body.products === 'string') {
            try {
                req.body.products = JSON.parse(req.body.products);
            } catch (e) {
                return res.status(400).json({
                    success: false,
                    message: "Error al parsear datos de productos"
                });
            }
        }

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
                departamento: customerData.departamento,
                ciudad: customerData.ciudad,
            };
            
            // Add client type specific data
            if (clientData.tipo === 'Natural') {
                clientData.tipoDoc = 'Cedula de Ciudadania';
                clientData.profesion = customerData.profession || '';
            } else {
                clientData.sectorEconomico = customerData.sector || '';
            }
            
            // Transform products
            products = productsData.map(product => ({
                idProducto: product.id,
                cantidad: product.quantity,
                atributosUsuario: product.fields || {},
                observacion: product.observaciones || '',
                urlProducto: null
            }));
            
            // Set payment info
            paymentInfo = {
                tipoPago: req.body.paymentType || 'credito'
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

        // Extraer archivos de imágenes de productos
        const productFiles = [];
        if (req.files) {
            // Recopilar todos los archivos de imágenes de productos
            Object.keys(req.files).forEach(fieldName => {
                if (fieldName.startsWith('productImages')) {
                    req.files[fieldName].forEach(file => {
                        file.fieldname = fieldName; // Preservar nombre del campo
                        productFiles.push(file);
                    });
                }
            });
        }
        
        // Obtener archivo de comprobante
        let paymentProofFile = null;
        if (req.files && req.files.comprobanteFile) {
            paymentProofFile = req.files.comprobanteFile[0];
        }
        
        // Crear baseUrl para las URLs completas de archivos
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        
        // Create the order with all the prepared data
        const result = await orderModel.createOrder(
            orderData,
            clientData,
            products,
            paymentInfo,
            paymentProofFile,
            productFiles,
            baseUrl
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

const deactivateOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { motivo } = req.body; // Obtener el motivo del cuerpo de la petición
        
        // Verificar que se proporcionó el ID de la orden
        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Se requiere el ID de la orden"
            });
        }

        // Validar que orderId sea un número válido
        if (isNaN(parseInt(orderId))) {
            return res.status(400).json({
                success: false,
                message: "El ID de la orden debe ser un número válido"
            });
        }

        // Validar que se proporcionó el motivo
        if (!motivo || motivo.trim() === '') {
            return res.status(400).json({
                success: false,
                message: "Se requiere especificar el motivo de desactivación"
            });
        }

        // Validar longitud del motivo
        if (motivo.length > 300) {
            return res.status(400).json({
                success: false,
                message: "El motivo no puede exceder 300 caracteres"
            });
        }

        // Llamar a la función del modelo para desactivar la orden
        const result = await orderModel.deactivateOrder(parseInt(orderId), motivo.trim());

        // Si la operación no fue exitosa, devolver error
        if (!result.success) {
            return res.status(400).json(result);
        }

        // Devolver respuesta exitosa
        return res.status(200).json(result);
        
    } catch (error) {
        console.error('Error en controlador de desactivación de orden:', error);
        return res.status(500).json({
            success: false,
            message: "Error interno del servidor al desactivar la orden",
            error: error.message
        });
    }
};

const reactivateOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        
        // Verificar que se proporcionó el ID de la orden
        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Se requiere el ID de la orden"
            });
        }

        // Validar que orderId sea un número válido
        if (isNaN(parseInt(orderId))) {
            return res.status(400).json({
                success: false,
                message: "El ID de la orden debe ser un número válido"
            });
        }

        // Llamar a la función del modelo para reactivar la orden
        const result = await orderModel.reactivateOrder(parseInt(orderId));

        // Si la operación no fue exitosa, devolver error
        if (!result.success) {
            return res.status(400).json(result);
        }

        // Devolver respuesta exitosa
        return res.status(200).json(result);
        
    } catch (error) {
        console.error('Error en controlador de reactivación de orden:', error);
        return res.status(500).json({
            success: false,
            message: "Error interno del servidor al reactivar la orden",
            error: error.message
        });
    }
};

module.exports = {
    createOrder,
    uploadMiddleware,
    deleteProductFromOrder,
    deleteOrder,
    deactivateOrder,
    reactivateOrder
};