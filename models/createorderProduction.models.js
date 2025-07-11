const pool = require('../database/db.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function createOrder(orderData, clientData, products, paymentInfo, paymentProofFile, productFiles, baseUrl) {
    const client = await pool.connect();
    
    try {
        // Start transaction
        await client.query('BEGIN');
        
        const clientId = await createOrUpdateClient(client, clientData);
        
        await addClientPhone(client, clientId, clientData.telefono, 'Móvil');
        
        const direccionId = await addClientAddress(client, clientId, clientData.direccion, clientData.idCiudad, clientData.idDepartamento);
        
        let comprobanteId = null;
        if (paymentInfo.tipoPago === 'contado' && paymentProofFile) {
            const uploadPath = await savePaymentProof(paymentProofFile, baseUrl);
            comprobanteId = await createPaymentProof(client, uploadPath);
        }
        
        const orderId = await createProductionOrder(
            client, 
            clientId, 
            null,
            paymentInfo.tipoPago,
            comprobanteId,
            orderData.observaciones,
            orderData.cedulaEmpleadoResponsable,
            direccionId
        );
        
        const initialProcessId = 1; // ID del proceso inicial
        const processResult = await client.query(
            `INSERT INTO detalle_proceso(
                id_orden, id_proceso, fecha_inicio_proceso, cedula_empleado, observaciones, estado
            ) VALUES($1, $2, CURRENT_TIMESTAMP, $3, $4, $5) RETURNING id_detalle_proceso`,
            [orderId, initialProcessId, orderData.cedulaEmpleadoResponsable, '', 'En Proceso']
        );
        
        const processId = processResult.rows[0].id_detalle_proceso;
        
        const productDetails = [];
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            
            const productImageFiles = productFiles ? productFiles.filter(file => 
                file.fieldname === `productImages_${i}` || 
                file.fieldname === `productImages[${i}]`
            ) : [];
            
            const { cleanedAttributes, extractedImages } = await processUserAttributesImages(
                product.atributosUsuario, 
                product.idProducto, 
                orderId
            );

            // El bordado se mantiene dentro de los atributos de usuario, no se extrae como campo separado
            let hasBordado = false;
            if (cleanedAttributes && typeof cleanedAttributes === 'object') {
                const bordadoValue = cleanedAttributes.bordado || cleanedAttributes.Bordado;
                if (bordadoValue) {
                    hasBordado = bordadoValue === 'Si' || bordadoValue === 'si' || bordadoValue === true;
                }
                // NO eliminar bordado de los atributos - debe permanecer en atributosUsuario
            }
            
            const allProductImages = [];
            
            if (productImageFiles.length > 0) {
                for (let j = 0; j < productImageFiles.length; j++) {
                    const file = productImageFiles[j];
                    allProductImages.push({
                        type: 'direct',
                        file: file,
                        index: j
                    });
                }
            }
            
            // Guardar todas las imágenes en una sola operación
            let allImageUrls = [];
            if (allProductImages.length > 0) {
                allImageUrls = await saveAllProductImages(allProductImages, product.idProducto, orderId, baseUrl);
            }
            
            // Combinar todas las URLs para url_producto (sin distinguir tipo)
            const combinedImageUrls = allImageUrls.map(img => img.url);
            
            // Insertar el producto en detalle_producto_orden (sin columna bordado)
            const detailId = await addProductToOrder(
                client,
                orderId,
                product.idProducto,
                product.cantidad,
                cleanedAttributes, 
                product.observacion,
                combinedImageUrls 
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
                atributosusuario: cleanedAttributes, 
                bordado: hasBordado, // Mantener en la respuesta para compatibilidad
                observacion: product.observacion,
                url_producto: combinedImageUrls.join(','), 
                imagenes: combinedImageUrls, 
                estado: 'En Producción',
                nombre_producto: productResult.rows[0]?.nombre_producto || 'Producto sin nombre',
                id_proceso_actual: initialProcessId
            });
        }
        
        const processNameResult = await client.query(
            'SELECT nombre FROM estado_proceso WHERE id_proceso = $1',
            [initialProcessId]
        );
        
        const clientNameResult = await client.query(
            'SELECT nombre FROM cliente WHERE id_cliente = $1',
            [clientId]
        );
        
        await client.query('COMMIT');
        
        // Prepare the detailed response
        return {
            success: true,
            data: {
                id_orden: orderId,
                id_cliente: clientId,
                fecha_aproximada: null,
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

async function addProductToOrder(client, orderId, productId, quantity, userAttributes, observations, productImages) {
    const imageUrls = Array.isArray(productImages) ? productImages.join(',') : productImages;
    
    const result = await client.query(
        `INSERT INTO detalle_producto_orden(
            id_orden, id_producto, cantidad, atributosUsuario, 
            observacion, url_producto
        ) VALUES($1, $2, $3, $4, $5, $6) RETURNING id_detalle`,
        [orderId, productId, quantity, userAttributes, observations, imageUrls]
    );
    
    return result.rows[0].id_detalle;
}

async function savePaymentProof(file, baseUrl) {
    const desktopDir = require('os').homedir() + '/Desktop';
    const uploadsDir = path.join(desktopDir, 'Uniformes_Imagenes', 'comprobantes');
    
    if (!fs.existsSync(uploadsDir)){
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const filename = `comprobante_${timestamp}_${file.originalname}`;
    const filepath = path.join(uploadsDir, filename);
    
    const writeStream = fs.createWriteStream(filepath);
    
    return new Promise((resolve, reject) => {
        // Write file
        writeStream.write(file.buffer);
        writeStream.end();
        
        writeStream.on('finish', () => {
            // Devolver URL completa como en las facturas
            const fullUrl = `${baseUrl}/comprobantes/${filename}`;
            resolve(fullUrl);
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

async function createProductionOrder(client, clientId,dueDate, paymentType, comprobanteId, observations, employeeId, direccionId) {
    // Query con manejo condicional para id_comprobante_pago
    let query, params;
    
    if (comprobanteId === null) {
        // Si no hay comprobante, excluir el campo id_comprobante_pago Y fecha_aproximada
        query = `INSERT INTO orden_produccion(
            id_cliente, tipo_pago,
            observaciones, cedula_empleado_responsable, id_direccion
        ) VALUES($1, $2, $3, $4, $5) RETURNING id_orden`;
        
        params = [clientId, paymentType, observations, employeeId, direccionId];
    } else {
        // Si hay comprobante, incluir el campo id_comprobante_pago pero no fecha_aproximada
        query = `INSERT INTO orden_produccion(
            id_cliente, tipo_pago, id_comprobante_pago,
            observaciones, cedula_empleado_responsable, id_direccion
        ) VALUES($1, $2, $3, $4, $5, $6) RETURNING id_orden`;
        
        params = [clientId, paymentType, comprobanteId, observations, employeeId, direccionId];
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

async function deactivateOrder(orderId, motivoDesactivacion) {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const checkOrder = await client.query(
            'SELECT id_orden, activo, id_cliente, observaciones FROM orden_produccion WHERE id_orden = $1',
            [orderId]
        );
        
        if (checkOrder.rows.length === 0) {
            throw new Error('La orden especificada no existe');
        }
        
        if (!checkOrder.rows[0].activo) {
            throw new Error('La orden ya está desactivada');
        }
        
        const observacionesActuales = checkOrder.rows[0].observaciones || '';
        const fechaDesactivacion = new Date().toLocaleString('es-CO', {
            timeZone: 'America/Bogota',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const nuevaObservacion = `[DESACTIVADA ${fechaDesactivacion}] ${motivoDesactivacion || 'Sin motivo especificado'}`;
        const observacionesFinales = observacionesActuales 
            ? `${observacionesActuales}\n\n${nuevaObservacion}`
            : nuevaObservacion;
        
        const deactivateResult = await client.query(
            'UPDATE orden_produccion SET activo = FALSE, observaciones = $1 WHERE id_orden = $2 RETURNING id_orden, id_cliente, fecha_aproximada',
            [observacionesFinales, orderId]
        );
        
        await client.query(
            'UPDATE detalle_proceso SET estado = $1, observaciones = CASE WHEN observaciones IS NULL OR observaciones = \'\' THEN $2 ELSE observaciones || \'\n\' || $2 END WHERE id_orden = $3 AND estado != $4',
            ['Cancelado', `Cancelado: ${motivoDesactivacion || 'Sin motivo especificado'}`, orderId, 'Completado']
        );
        
        await client.query(
            'UPDATE detalle_producto_orden SET estado = $1, observacion = CASE WHEN observacion IS NULL OR observacion = \'\' THEN $2 ELSE observacion || \'\n\' || $2 END WHERE id_orden = $3 AND estado != $4',
            ['Cancelado', `Cancelado: ${motivoDesactivacion || 'Sin motivo especificado'}`, orderId, 'Completado']
        );
        
        await client.query('COMMIT');
        
        return {
            success: true,
            message: "Orden desactivada correctamente",
            data: { 
                id_orden: parseInt(orderId),
                id_cliente: deactivateResult.rows[0]?.id_cliente,
                fecha_aproximada: deactivateResult.rows[0]?.fecha_aproximada,
                estado: 'Desactivada',
                motivo_desactivacion: motivoDesactivacion || 'Sin motivo especificado',
                fecha_desactivacion: fechaDesactivacion
            }
        };
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al desactivar la orden:', error);
        
        return {
            success: false,
            message: "Error al desactivar la orden",
            error: error.message
        };
    } finally {
        client.release();
    }
}

async function reactivateOrder(orderId) {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const checkOrder = await client.query(
            'SELECT id_orden, activo, id_cliente FROM orden_produccion WHERE id_orden = $1',
            [orderId]
        );
        
        if (checkOrder.rows.length === 0) {
            throw new Error('La orden especificada no existe');
        }
        
        if (checkOrder.rows[0].activo) {
            throw new Error('La orden ya está activa');
        }
        
        const reactivateResult = await client.query(
            'UPDATE orden_produccion SET activo = TRUE WHERE id_orden = $1 RETURNING id_orden, id_cliente, fecha_aproximada',
            [orderId]
        );
        
        await client.query(
            'UPDATE detalle_proceso SET estado = $1 WHERE id_orden = $2 AND estado = $3',
            ['En Proceso', orderId, 'Cancelado']
        );
        
        await client.query(
            'UPDATE detalle_producto_orden SET estado = $1 WHERE id_orden = $2 AND estado = $3',
            ['En Producción', orderId, 'Cancelado']
        );
        
        await client.query('COMMIT');
        
        return {
            success: true,
            message: "Orden reactivada correctamente",
            data: { 
                id_orden: parseInt(orderId),
                id_cliente: reactivateResult.rows[0]?.id_cliente,
                fecha_aproximada: reactivateResult.rows[0]?.fecha_aproximada,
                estado: 'Activa'
            }
        };
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al reactivar la orden:', error);
        
        return {
            success: false,
            message: "Error al reactivar la orden",
            error: error.message
        };
    } finally {
        client.release();
    }
}

// Función para procesar atributos de usuario y extraer imágenes base64 (sin reemplazarlas)
async function processUserAttributesImages(userAttributes, productId, orderId) {
    if (!userAttributes || typeof userAttributes !== 'object') {
        return { cleanedAttributes: userAttributes, extractedImages: [] };
    }
    
    const cleanedAttributes = { ...userAttributes };
    const extractedImages = [];
    
    // Función recursiva para buscar y extraer imágenes base64
    function extractAndRemoveBase64Images(obj, path = '') {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                const currentPath = path ? `${path}.${key}` : key;
                
                if (typeof value === 'string' && value.startsWith('data:image/')) {
                    // Es una imagen base64, extraerla y remover del atributo
                    try {
                        const matches = value.match(/^data:image\/([a-zA-Z]*);base64,(.*)$/);
                        if (matches && matches.length === 3) {
                            const extension = matches[1];
                            const base64Data = matches[2];
                            
                            // Crear buffer desde base64
                            const imageBuffer = Buffer.from(base64Data, 'base64');
                            
                            // Generar nombre de archivo único
                            const timestamp = Date.now();
                            const filename = `producto_${productId}_orden_${orderId}_attr_${timestamp}_${extractedImages.length}.${extension}`;
                            
                            extractedImages.push({
                                buffer: imageBuffer,
                                filename: filename,
                                path: currentPath,
                                originalValue: value
                            });
                            
                            // Remover la imagen base64 del atributo (dejar solo el nombre)
                            if (key.toLowerCase().includes('imagen')) {
                                // Si es un campo de imagen, conservar solo el nombre del archivo original
                                const originalName = extractImageName(value);
                                obj[key] = originalName || `imagen_${extractedImages.length}`;
                            } else {
                                // Si no es claramente un campo de imagen, eliminar completamente
                                delete obj[key];
                            }
                        }
                    } catch (error) {
                        console.error('Error al procesar imagen base64:', error);
                    }
                } else if (typeof value === 'object' && value !== null) {
                    // Buscar recursivamente en objetos anidados
                    if (value.preview && typeof value.preview === 'string' && value.preview.startsWith('data:image/')) {
                        // Es un objeto con preview base64, extraer la imagen y limpiar el objeto
                        try {
                            const matches = value.preview.match(/^data:image\/([a-zA-Z]*);base64,(.*)$/);
                            if (matches && matches.length === 3) {
                                const extension = matches[1];
                                const base64Data = matches[2];
                                
                                const imageBuffer = Buffer.from(base64Data, 'base64');
                                const timestamp = Date.now();
                                const filename = `producto_${productId}_orden_${orderId}_attr_${timestamp}_${extractedImages.length}.${extension}`;
                                
                                extractedImages.push({
                                    buffer: imageBuffer,
                                    filename: filename,
                                    path: `${currentPath}.preview`,
                                    originalValue: value.preview
                                });
                                
                                // Limpiar el objeto, mantener solo propiedades útiles
                                obj[key] = {
                                    name: value.name || `imagen_${extractedImages.length}`,
                                    size: value.size,
                                    type: value.type
                                };
                            }
                        } catch (error) {
                            console.error('Error al procesar preview base64:', error);
                        }
                    } else {
                        // Continuar búsqueda recursiva
                        extractAndRemoveBase64Images(value, currentPath);
                    }
                }
            }
        }
    }
    
    extractAndRemoveBase64Images(cleanedAttributes);
    
    return { cleanedAttributes, extractedImages };
}

// Función auxiliar para extraer el nombre de archivo original
function extractImageName(base64String) {
    // Intentar extraer el nombre del archivo si está en algún formato conocido
    // Por ahora, devolver null para que use el nombre generado
    return null;
}

// Función para guardar imágenes extraídas de atributos
// Función unificada para guardar todas las imágenes de un producto (directas + atributos)
async function saveAllProductImages(allImages, productId, orderId, baseUrl) {
    if (!allImages || allImages.length === 0) {
        return [];
    }

    // Crear directorio en el escritorio para las imágenes de productos (ruta absoluta como facturas)
    const desktopDir = require('os').homedir() + '/Desktop';
    const uploadsDir = path.join(desktopDir, 'Uniformes_Imagenes', 'productos');

    // Ensure directory exists
    if (!fs.existsSync(uploadsDir)){
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const savedImages = [];
    const baseUrl = `http://localhost:3000`;

    for (let i = 0; i < allImages.length; i++) {
        const imageItem = allImages[i];
        let fullUrl;

        if (imageItem.type === 'direct') {
            // Es una imagen directa (archivo ya guardado por multer.diskStorage)
            const file = imageItem.file;
            fullUrl = `${baseUrl}/images/productos/${file.filename}`;
        } else if (imageItem.type === 'attribute') {
            // Es una imagen de atributo (base64 convertida) - esta sí hay que guardarla manualmente
            const image = imageItem.image;
            const desktopDir = require('os').homedir() + '/Desktop';
            const uploadsDir = path.join(desktopDir, 'Uniformes_Imagenes', 'productos');
            
            if (!fs.existsSync(uploadsDir)){
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            
            const timestamp = Date.now();
            const extension = image.filename.split('.').pop();
            filename = `producto_${productId}_orden_${orderId}_attr_${timestamp}_${i}.${extension}`;
            filepath = path.join(uploadsDir, filename);
            imageBuffer = image.buffer;
        }

        // Guardar la imagen
        const writeStream = fs.createWriteStream(filepath);
        
        await new Promise((resolve, reject) => {
            writeStream.write(imageBuffer);
            writeStream.end();
            
            writeStream.on('finish', () => {
                resolve();
            });
            
            writeStream.on('error', (err) => {
                reject(err);
            });
        });
        
        // Crear URL completa como en las facturas
        const fullUrl = `${baseUrl}/productos/${filename}`;
        savedImages.push({
            type: imageItem.type,
            url: fullUrl,
            originalIndex: imageItem.index
        });
    }

    return savedImages;
}

module.exports = {
    createOrder,
    deleteProductFromOrder,
    deleteOrder,
    deactivateOrder,
    reactivateOrder
};