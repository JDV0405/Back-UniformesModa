const pool = require('../database/db.js');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');


async function createOrder(orderData, clientData, products, paymentInfo, paymentProofFile) {
    const client = await pool.connect();
    
    try {
        // Start transaction
        await client.query('BEGIN');
        
        // 1. Create or update client information
        const clientId = await createOrUpdateClient(client, clientData);
        
        // 2. Add or update phone number
        await addClientPhone(client, clientId, clientData.telefono, 'Móvil');
        
        // 3. Add client address
        await addClientAddress(client, clientId, clientData.direccion, clientData.idCiudad, clientData.idDepartamento);
        
        // 4. Handle payment proof upload
        let comprobanteId = null;
        if (paymentInfo.tipoPago === 'contado' && paymentProofFile) {
            const uploadPath = await savePaymentProof(paymentProofFile);
            comprobanteId = await createPaymentProof(client, uploadPath);
        } else {
            // For credit payment, create an empty payment proof
            comprobanteId = await createPaymentProof(client, null);
        }
        
        // 5. Create order
        const orderId = await createProductionOrder(
            client, 
            clientId, 
            orderData.fechaAproximada || new Date(),
            paymentInfo.tipoPago,
            comprobanteId,
            orderData.observaciones,
            orderData.cedulaEmpleadoResponsable
        );
        
        // 6. Add products to order
        const productDetails = [];
        for (const product of products) {
            const detailId = await addProductToOrder(
                client,
                orderId,
                product.idProducto,
                product.cantidad,
                product.atributosUsuario,
                product.bordado,
                product.observacion,
                product.urlProducto
            );
            
            // Get product name for response
            const productResult = await client.query(
                'SELECT nombre_producto FROM producto WHERE id_producto = $1',
                [product.idProducto]
            );
            
            productDetails.push({
                id_detalle: detailId,
                id_orden: orderId,
                id_producto: product.idProducto,
                cantidad: product.cantidad,
                atributosusuario: product.atributosUsuario,
                bordado: product.bordado,
                observacion: product.observacion,
                url_producto: product.urlProducto,
                estado: 'En Producción',
                nombre_producto: productResult.rows[0]?.nombre_producto || 'Producto sin nombre'
            });
        }
        
        // 7. Create initial process record
        const initialProcessId = 1; // Assuming 1 is the ID for the initial process (adjust as needed)
        const processResult = await client.query(
            `INSERT INTO detalle_proceso(
                id_orden, id_proceso, fecha_inicio_proceso, cedula_empleado, observaciones, estado
            ) VALUES($1, $2, CURRENT_TIMESTAMP, $3, $4, $5) RETURNING id_detalle_proceso`,
            [orderId, initialProcessId, orderData.cedulaEmpleadoResponsable, '', 'En Proceso']
        );
        
        const processId = processResult.rows[0].id_detalle_proceso;
        
        // 8. Get process name for the response
        const processNameResult = await client.query(
            'SELECT nombre FROM estado_proceso WHERE id_proceso = $1',
            [initialProcessId]
        );
        
        // 9. Get client name
        const clientNameResult = await client.query(
            'SELECT nombre FROM cliente WHERE id_cliente = $1',
            [clientId]
        );
        
        // Commit transaction
        await client.query('COMMIT');
        
        // 10. Prepare the detailed response
        return {
            success: true,
            data: {
                id_orden: orderId,
                id_cliente: clientId,
                fecha_aproximada: orderData.fechaAproximada || new Date(),
                tipo_pago: paymentInfo.tipoPago,
                id_comprobante_pago: comprobanteId,
                observaciones: orderData.observaciones,
                cedula_empleado_responsable: orderData.cedulaEmpleadoResponsable,
                cliente_nombre: clientNameResult.rows[0]?.nombre || 'Cliente sin nombre',
                departamento_id: clientData.idDepartamento,
                departamento_nombre: clientData.departamento || '',
                ciudad_id: clientData.idCiudad,
                ciudad_nombre: clientData.ciudad || '',
                productos: productDetails,
                procesos: [{
                    id_detalle_proceso: processId,
                    id_orden: orderId,
                    id_proceso: initialProcessId,
                    fecha_inicio_proceso: new Date(),
                    fecha_final_proceso: null,
                    cedula_empleado: orderData.cedulaEmpleadoResponsable,
                    observaciones: '',
                    estado: 'En Proceso',
                    nombre_proceso: processNameResult.rows[0]?.nombre || 'Proceso inicial'
                }]
            },
            message: "Detalles de la orden obtenidos exitosamente"
        };
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating order:', error);
        throw {
            success: false,
            message: "Error al crear la orden",
            error: error.message
        };
    } finally {
        client.release();
    }
}

async function addProductToOrder(client, orderId, productId, quantity, userAttributes, hasBrodery, observations, productUrl) {
    const result = await client.query(
        `INSERT INTO detalle_producto_orden(
            id_orden, id_producto, cantidad, atributosUsuario, 
            bordado, observacion, url_producto
        ) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id_detalle`,
        [orderId, productId, quantity, userAttributes, hasBrodery, observations, productUrl]
    );
    
    return result.rows[0].id_detalle;
}

async function createOrUpdateClient(client, clientData) {
    // Check if client already exists
    const checkClient = await client.query(
        'SELECT id_cliente FROM cliente WHERE id_cliente = $1',
        [clientData.cedula]
    );
    
    if (checkClient.rows.length > 0) {
        // Update existing client
        await client.query(
            'UPDATE cliente SET nombre = $1, tipo = $2, correo = $3 WHERE id_cliente = $4',
            [clientData.nombre, clientData.tipo, clientData.correo, clientData.cedula]
        );
        
        // Update specific client type table
        if (clientData.tipo === 'Natural') {
            await client.query(
                'UPDATE cli_natural SET tipo_doc = $1, profesion = $2 WHERE id_cliente = $3',
                [clientData.tipoDoc, clientData.profesion, clientData.cedula]
            );
        } else {
            await client.query(
                'UPDATE juridico SET sector_economico = $1 WHERE id_cliente = $2',
                [clientData.sectorEconomico, clientData.cedula]
            );
        }
    } else {
        // Insert new client
        await client.query(
            'INSERT INTO cliente(id_cliente, nombre, tipo, correo) VALUES($1, $2, $3, $4)',
            [clientData.cedula, clientData.nombre, clientData.tipo, clientData.correo]
        );
        
        // Insert into specific client type table
        if (clientData.tipo === 'Natural') {
            await client.query(
                'INSERT INTO cli_natural(id_cliente, tipo_doc, profesion) VALUES($1, $2, $3)',
                [clientData.cedula, clientData.tipoDoc, clientData.profesion]
            );
        } else {
            await client.query(
                'INSERT INTO juridico(id_cliente, sector_economico) VALUES($1, $2)',
                [clientData.cedula, clientData.sectorEconomico]
            );
        }
    }
    
    return clientData.cedula;
}



async function addClientPhone(client, clientId, phoneNumber, phoneType) {
    // Check if phone exists
    const checkPhone = await client.query(
        'SELECT id_telefono FROM telefono_cliente WHERE id_cliente = $1 AND telefono = $2',
        [clientId, phoneNumber]
    );
    
    if (checkPhone.rows.length === 0) {
        // Add new phone
        await client.query(
            'INSERT INTO telefono_cliente(id_cliente, telefono, tipo) VALUES($1, $2, $3)',
            [clientId, phoneNumber, phoneType]
        );
    }
}

async function addClientAddress(client, clientId, address, cityId, departmentId) {
    if (departmentId) {
        const cityCheck = await client.query(
            'SELECT id_ciudad FROM ciudad WHERE id_ciudad = $1 AND id_departamento = $2',
            [cityId, departmentId]
        );
        
        if (cityCheck.rows.length === 0) {
            throw new Error('La ciudad seleccionada no pertenece al departamento indicado');
        }
    }
    
    // Almacenar información de ubicación completa
    const locationInfo = {
        departamentoId: departmentId,
        ciudadId: cityId
    };
    
    // Insert the address with department info in observations
    await client.query(
        'INSERT INTO direccion(id_cliente, direccion, id_ciudad, observaciones) VALUES($1, $2, $3, $4)',
        [clientId, address, cityId, departmentId ? JSON.stringify(locationInfo) : null]
    );
}

async function savePaymentProof(file) {
    const uploadsDir = path.join(__dirname, '../uploads/comprobantes');
    
    // Ensure directory exists
    if (!fs.existsSync(uploadsDir)){
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const filename = `comprobante_${timestamp}_${file.originalname}`;
    const filepath = path.join(uploadsDir, filename);
    
    // Create a writable stream
    const writeStream = fs.createWriteStream(filepath);
    
    return new Promise((resolve, reject) => {
        // Write file
        writeStream.write(file.buffer);
        writeStream.end();
        
        writeStream.on('finish', () => {
            resolve(`/uploads/comprobantes/${filename}`);
        });
        
        writeStream.on('error', (err) => {
            reject(err);
        });
    });
}

async function createPaymentProof(client, filePath) {
    const result = await client.query(
        'INSERT INTO comprobante_pago(url_comprobante, activo) VALUES($1, true) RETURNING id_comprobante_pago',
        [filePath]
    );
    
    return result.rows[0].id_comprobante_pago;
}

async function createProductionOrder(client, clientId, dueDate, paymentType, comprobanteId, observations, employeeId) {
    const result = await client.query(
        `INSERT INTO orden_produccion(
            id_cliente, fecha_aproximada, tipo_pago, id_comprobante_pago, 
            observaciones, cedula_empleado_responsable
        ) VALUES($1, $2, $3, $4, $5, $6) RETURNING id_orden`,
        [clientId, dueDate, paymentType, comprobanteId, observations, employeeId]
    );
    
    return result.rows[0].id_orden;
}



module.exports = {
    createOrder
};