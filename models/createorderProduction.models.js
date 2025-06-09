const pool = require('../database/db.js');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function createOrder(orderData, clientData, products, paymentInfo, paymentProofFile , productFiles) {
    const client = await pool.connect();
    
    try {
        // Start transaction
        await client.query('BEGIN');
        
        // 1. Create or update client information
        const clientId = await createOrUpdateClient(client, clientData);
        
        // 2. Add or update phone number
        await addClientPhone(client, clientId, clientData.telefono, 'Móvil');
        
        // 3. Add client address
        const direccionId = await addClientAddress(client, clientId, clientData.direccion, clientData.idCiudad, clientData.idDepartamento);
        
        // 4. Handle payment proof upload
        let comprobanteId = null;
        if (paymentInfo.tipoPago === 'contado' && paymentProofFile) {
            const uploadPath = await savePaymentProof(paymentProofFile);
            comprobanteId = await createPaymentProof(client, uploadPath);
        }
        
        // 5. Create order
        const orderId = await createProductionOrder(
            client, 
            clientId, 
            orderData.fechaAproximada || new Date(),
            paymentInfo.tipoPago,
            comprobanteId,
            orderData.observaciones,
            orderData.cedulaEmpleadoResponsable,
            direccionId
        );
        
        // 6. Create initial process record
        const initialProcessId = 1; // ID del proceso inicial
        const processResult = await client.query(
            `INSERT INTO detalle_proceso(
                id_orden, id_proceso, fecha_inicio_proceso, cedula_empleado, observaciones, estado
            ) VALUES($1, $2, CURRENT_TIMESTAMP, $3, $4, $5) RETURNING id_detalle_proceso`,
            [orderId, initialProcessId, orderData.cedulaEmpleadoResponsable, '', 'En Proceso']
        );
        
        const processId = processResult.rows[0].id_detalle_proceso;
        
        // 7. Add products to order with images
        const productDetails = [];
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            
            // Buscar archivos de imágenes para este producto específico
            const productImageFiles = productFiles ? productFiles.filter(file => 
                file.fieldname === `productImages_${i}` || 
                file.fieldname === `productImages[${i}]`
            ) : [];
            
            // Guardar imágenes del producto si existen
            let productImageUrls = [];
            if (productImageFiles.length > 0) {
                productImageUrls = await saveProductImages(productImageFiles, product.idProducto, orderId);
            }
            
            // Insertar el producto en detalle_producto_orden
            const detailId = await addProductToOrder(
                client,
                orderId,
                product.idProducto,
                product.cantidad,
                product.atributosUsuario,
                product.bordado,
                product.observacion,
                productImageUrls
            );
            
            // Insertar el proceso inicial en producto_proceso
            await client.query(
                `INSERT INTO producto_proceso(
                    id_detalle_producto, id_detalle_proceso, cantidad
                ) VALUES ($1, $2, $3)`,
                [detailId, processId, product.cantidad]
            );
            
            // Obtener el nombre del producto para la respuesta
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
                url_producto: productImageUrls.join(','), // Unir URLs con comas
                imagenes: productImageUrls, // Array de URLs de imágenes
                estado: 'En Producción',
                nombre_producto: productResult.rows[0]?.nombre_producto || 'Producto sin nombre',
                id_proceso_actual: initialProcessId
            });
        }
        
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

async function saveProductImages(files, productId, orderId) {
// Crear directorio en el escritorio para las imágenes de productos
const desktopDir = require('os').homedir() + '/Desktop';
const uploadsDir = path.join(desktopDir, 'Uniformes_Imagenes', 'productos');

// Ensure directory exists
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const savedImages = [];

for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const timestamp = Date.now();
    const filename = `producto_${productId}_orden_${orderId}_${timestamp}_${i}_${file.originalname}`;
    const filepath = path.join(uploadsDir, filename);
    
    // Create a writable stream
    const writeStream = fs.createWriteStream(filepath);
    
    await new Promise((resolve, reject) => {
        writeStream.write(file.buffer);
        writeStream.end();
        
        writeStream.on('finish', () => {
            resolve();
        });
        
        writeStream.on('error', (err) => {
            reject(err);
        });
    });
    
    // Guardar ruta relativa para la base de datos
    const relativePath = `Uniformes_Imagenes/productos/${filename}`;
    savedImages.push(relativePath);
}

return savedImages;
}

async function addProductToOrder(client, orderId, productId, quantity, userAttributes, hasBrodery, observations, productImages) {
    // Procesar las URLs de las imágenes (convertir array a string separado por comas)
    const imageUrls = Array.isArray(productImages) ? productImages.join(',') : productImages;
    
    const result = await client.query(
        `INSERT INTO detalle_producto_orden(
            id_orden, id_producto, cantidad, atributosUsuario, 
            bordado, observacion, url_producto
        ) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id_detalle`,
        [orderId, productId, quantity, userAttributes, hasBrodery, observations, imageUrls]
    );
    
    return result.rows[0].id_detalle;
}

async function savePaymentProof(file) {
    // Cambiar ruta al escritorio
    const desktopDir = require('os').homedir() + '/Desktop';
    const uploadsDir = path.join(desktopDir, 'Uniformes_Imagenes', 'comprobantes');
    
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
            // Devolver ruta relativa
            resolve(`Uniformes_Imagenes/comprobantes/${filename}`);
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
    // Verificar que la dirección no sea nula
    if (!address) {
        throw new Error('La dirección del cliente es obligatoria');
    }
    
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
    
    // Insert the address with department info in observations and return the ID
    const addressResult = await client.query(
        'INSERT INTO direccion(id_cliente, direccion, id_ciudad, observaciones) VALUES($1, $2, $3, $4) RETURNING id_direccion',
        [clientId, address, cityId, departmentId ? JSON.stringify(locationInfo) : null]
    );
    
    return addressResult.rows[0].id_direccion;
}


async function createProductionOrder(client, clientId, dueDate, paymentType, comprobanteId, observations, employeeId, direccionId) {
    // Query con manejo condicional para id_comprobante_pago
    let query, params;
    
    if (comprobanteId === null) {
        // Si no hay comprobante, excluir el campo id_comprobante_pago
        query = `INSERT INTO orden_produccion(
            id_cliente, fecha_aproximada, tipo_pago,
            observaciones, cedula_empleado_responsable, id_direccion
        ) VALUES($1, $2, $3, $4, $5, $6) RETURNING id_orden`;
        
        params = [clientId, dueDate, paymentType, observations, employeeId, direccionId];
    } else {
        // Si hay comprobante, incluir el campo id_comprobante_pago
        query = `INSERT INTO orden_produccion(
            id_cliente, fecha_aproximada, tipo_pago, id_comprobante_pago,
            observaciones, cedula_empleado_responsable, id_direccion
        ) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id_orden`;
        
        params = [clientId, dueDate, paymentType, comprobanteId, observations, employeeId, direccionId];
    }
    
    const result = await client.query(query, params);
    return result.rows[0].id_orden;
}

async function deleteProductFromOrder(orderId, detailId) {
    const client = await pool.connect();
    
    try {
        // Iniciar transacción
        await client.query('BEGIN');
        
        // Verificar que el detalle pertenece a la orden especificada
        const checkDetail = await client.query(
            'SELECT id_detalle FROM detalle_producto_orden WHERE id_detalle = $1 AND id_orden = $2',
            [detailId, orderId]
        );
        
        if (checkDetail.rows.length === 0) {
            throw new Error('El producto no existe en la orden especificada');
        }
        
        // Primero eliminar registros relacionados en producto_proceso
        await client.query(
            'DELETE FROM producto_proceso WHERE id_detalle_producto = $1',
            [detailId]
        );
        
        // Luego eliminar el detalle del producto
        const deleteResult = await client.query(
            'DELETE FROM detalle_producto_orden WHERE id_detalle = $1 RETURNING id_detalle, id_producto',
            [detailId]
        );
        
        await client.query('COMMIT');
        
        return {
            success: true,
            data: {
                id_detalle: deleteResult.rows[0].id_detalle,
                id_producto: deleteResult.rows[0].id_producto
            },
            message: "Producto eliminado correctamente de la orden"
        };
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al eliminar producto de la orden:', error);
        
        return {
            success: false,
            message: "Error al eliminar producto de la orden",
            error: error.message
        };
    } finally {
        client.release();
    }
}

async function deleteOrder(orderId) {
    const client = await pool.connect();
    
    try {
        // Iniciar transacción
        await client.query('BEGIN');
        
        // Verificar que la orden existe
        const checkOrder = await client.query(
            'SELECT id_orden FROM orden_produccion WHERE id_orden = $1',
            [orderId]
        );
        
        if (checkOrder.rows.length === 0) {
            throw new Error('La orden especificada no existe');
        }
        
        // 1. Eliminar registros en producto_proceso relacionados con los detalles de la orden
        await client.query(`
            DELETE FROM producto_proceso 
            WHERE id_detalle_producto IN (
                SELECT id_detalle FROM detalle_producto_orden WHERE id_orden = $1
            )`,
            [orderId]
        );
        
        // 2. Eliminar los detalles de productos de la orden
        await client.query(
            'DELETE FROM detalle_producto_orden WHERE id_orden = $1',
            [orderId]
        );
        
        // 3. Eliminar los procesos relacionados a la orden
        await client.query(
            'DELETE FROM detalle_proceso WHERE id_orden = $1',
            [orderId]
        );
        
        // 4. Obtener el ID del comprobante de pago para eliminarlo después
        const comprobanteResult = await client.query(
            'SELECT id_comprobante_pago FROM orden_produccion WHERE id_orden = $1',
            [orderId]
        );
        
        const comprobanteId = comprobanteResult.rows[0]?.id_comprobante_pago;
        
        // 5. Eliminar la orden de producción
        const deleteResult = await client.query(
            'DELETE FROM orden_produccion WHERE id_orden = $1 RETURNING id_orden, id_cliente',
            [orderId]
        );
        
        // 6. Eliminar el comprobante de pago si existe
        if (comprobanteId) {
            await client.query(
                'DELETE FROM comprobante_pago WHERE id_comprobante_pago = $1',
                [comprobanteId]
            );
        }
        
        await client.query('COMMIT');
        
        return {
            success: true,
            message: "Orden eliminada correctamente",
            data: { 
                id_orden: parseInt(orderId),
                id_cliente: deleteResult.rows[0]?.id_cliente 
            }
        };
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al eliminar la orden:', error);
        
        return {
            success: false,
            message: "Error al eliminar la orden",
            error: error.message
        };
    } finally {
        client.release();
    }
}


module.exports = {
    createOrder,
    deleteProductFromOrder,
    deleteOrder,
    saveProductImages
};