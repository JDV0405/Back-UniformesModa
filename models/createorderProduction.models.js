const pool = require('../database/db.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { saveFileWithFallback, uploadToBlob, isAzureBlobAvailable } = require('../config/azureStorage');

async function createOrder(orderData, clientData, products, paymentInfo, paymentProofFile, productFiles, baseUrl) {
    const client = await pool.connect();
    
    try {
        // 🔍 DEBUGGING - Agregar al inicio para ver qué datos llegan
        console.log('=== DEBUGGING DATOS RECIBIDOS ===');
        console.log('Total productFiles:', productFiles?.length || 0);
        console.log('Total products:', products?.length || 0);
        
        if (productFiles && productFiles.length > 0) {
            productFiles.forEach((file, index) => {
                console.log(`Archivo ${index}:`, {
                    fieldname: file.fieldname,
                    originalname: file.originalname,
                    size: file.size,
                    mimetype: file.mimetype
                });
            });
        }
        
        if (products && products.length > 0) {
            products.forEach((product, index) => {
                console.log(`Producto ${index}:`, {
                    id: product.id || product.idProducto,
                    quantity: product.quantity || product.cantidad,
                    fields: product.fields || product.atributosUsuario,
                    fieldsKeys: product.fields ? Object.keys(product.fields) : (product.atributosUsuario ? Object.keys(product.atributosUsuario) : [])
                });
            });
        }
        console.log('=== FIN DEBUGGING ===');
        
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
            
            // Adaptar para nuevos nombres de campos del frontend
            const productId = product.id || product.idProducto;
            const quantity = product.quantity || product.cantidad;
            const observations = product.observaciones || product.observacion || '';
            const userAttributes = product.fields || product.atributosUsuario;
            
            console.log(`[DEBUG] Procesando producto ${i}: ID=${productId}, Cantidad=${quantity}`);
            
            // Mejorar el filtrado para evitar archivos duplicados
            const productImageFiles = productFiles ? productFiles.filter((file, index, array) => {
                const isForThisProduct = file.fieldname === `productImages_${i}` || 
                                       file.fieldname === `productImages[${i}]`;
                
                // También filtrar por posición para evitar que el mismo archivo aparezca múltiples veces
                if (isForThisProduct) {
                    const firstIndex = array.findIndex(f => 
                        f.originalname === file.originalname && 
                        f.size === file.size && 
                        (f.fieldname === `productImages_${i}` || f.fieldname === `productImages[${i}]`)
                    );
                    return index === firstIndex; // Solo mantener la primera ocurrencia
                }
                return false;
            }) : [];
            
            console.log(`[DEBUG] Producto ${i}: ${productImageFiles.length} archivos de imagen encontrados después del filtrado`);
            
            const { cleanedAttributes, extractedImages } = await processUserAttributesImages(
                userAttributes, 
                productId, 
                orderId
            );

            console.log(`[DEBUG] Producto ${i}: ${extractedImages.length} imágenes extraídas de atributos`);

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
            const processedImageHashes = new Set(); // Para evitar duplicados
            
            // Función helper para crear hash de imagen
            const createImageHash = (buffer) => {
                const crypto = require('crypto');
                return crypto.createHash('md5').update(buffer).digest('hex');
            };
            
            // Agregar imágenes directas (archivos subidos) - solo si no están duplicadas
            if (productImageFiles.length > 0) {
                console.log(`[DEBUG] Procesando ${productImageFiles.length} archivos directos de imagen`);
                for (let j = 0; j < productImageFiles.length; j++) {
                    const file = productImageFiles[j];
                    const imageHash = createImageHash(file.buffer);
                    
                    console.log(`[DEBUG] Archivo ${j}: fieldname=${file.fieldname}, hash=${imageHash}`);
                    
                    if (!processedImageHashes.has(imageHash)) {
                        processedImageHashes.add(imageHash);
                        allProductImages.push({
                            type: 'direct',
                            file: file,
                            index: j,
                            hash: imageHash
                        });
                        console.log(`[DEBUG] Imagen directa agregada (hash único): ${imageHash}`);
                    } else {
                        console.log(`[DEBUG] Imagen directa omitida (hash duplicado): ${imageHash}`);
                    }
                }
            }
            
            // Agregar imágenes extraídas de atributos (base64) - solo si no están duplicadas
            if (extractedImages.length > 0) {
                console.log(`[DEBUG] Procesando ${extractedImages.length} imágenes de atributos`);
                for (let j = 0; j < extractedImages.length; j++) {
                    const image = extractedImages[j];
                    const imageHash = createImageHash(image.buffer);
                    
                    console.log(`[DEBUG] Atributo ${j}: filename=${image.filename}, hash=${imageHash}`);
                    
                    if (!processedImageHashes.has(imageHash)) {
                        processedImageHashes.add(imageHash);
                        allProductImages.push({
                            type: 'attribute',
                            image: image,
                            index: productImageFiles.length + j,
                            hash: imageHash
                        });
                        console.log(`[DEBUG] Imagen de atributo agregada (hash único): ${imageHash}`);
                    } else {
                        console.log(`[DEBUG] Imagen de atributo omitida (hash duplicado): ${imageHash}`);
                    }
                }
            }
            
            console.log(`[DEBUG] Total de imágenes únicas a procesar: ${allProductImages.length}`);
            
            // Guardar todas las imágenes en una sola operación
            let allImageUrls = [];
            if (allProductImages.length > 0) {
                allImageUrls = await saveAllProductImages(allProductImages, productId, orderId, baseUrl);
            }
            
            // Combinar todas las URLs para url_producto (sin distinguir tipo)
            const combinedImageUrls = allImageUrls.map(img => img.url);
            
            console.log(`[DEBUG] URLs finales para producto ${i}: ${combinedImageUrls.length} URLs`);
            console.log(`[DEBUG] URLs: ${combinedImageUrls.join(', ')}`);
            
            // Insertar el producto en detalle_producto_orden (sin columna bordado)
            const detailId = await addProductToOrder(
                client,
                orderId,
                productId,
                quantity,
                cleanedAttributes, 
                observations,
                combinedImageUrls 
            );
            
            // Insertar el proceso inicial en producto_proceso
            await client.query(
                `INSERT INTO producto_proceso(
                    id_detalle_producto, id_detalle_proceso, cantidad
                ) VALUES ($1, $2, $3)`,
                [detailId, processId, quantity]
            );
            
            // Obtener el nombre del producto para la respuesta
            const productResult = await client.query(
                'SELECT nombre_producto FROM producto WHERE id_producto = $1',
                [productId]
            );
            
            productDetails.push({
                id_detalle: detailId,
                id_orden: orderId,
                id_producto: productId,
                cantidad: quantity,
                atributosusuario: cleanedAttributes, 
                bordado: hasBordado, // Mantener en la respuesta para compatibilidad
                observacion: observations,
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
    // Validar que el archivo existe
    if (!file) {
        throw new Error('El archivo de comprobante no fue proporcionado');
    }
    
    try {
        // Usar la función saveFileWithFallback que maneja Azure y fallback local
        return await saveFileWithFallback(file, 'comprobantes', baseUrl);
    } catch (error) {
        console.error('Error al guardar comprobante de pago:', error);
        throw new Error(`Error al guardar comprobante: ${error.message}`);
    }
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
    const processedImages = new Set(); // Evitar duplicados dentro de atributos
    
    // Función recursiva para buscar y extraer imágenes base64
    function extractAndRemoveBase64Images(obj, path = '') {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                const currentPath = path ? `${path}.${key}` : key;
                
                // Caso 1: String que es base64 (formato anterior)
                if (typeof value === 'string' && value.startsWith('data:image/')) {
                    // Verificar si ya procesamos esta imagen base64
                    if (!processedImages.has(value)) {
                        processedImages.add(value);
                        
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
                                const randomId = Math.random().toString(36).substr(2, 9);
                                const filename = `producto_${productId}_orden_${orderId}_attr_${timestamp}_${randomId}.${extension}`;
                                
                                extractedImages.push({
                                    buffer: imageBuffer,
                                    filename: filename,
                                    path: currentPath,
                                    originalValue: value
                                });
                            }
                        } catch (error) {
                            console.error('Error al procesar imagen base64:', error);
                        }
                    }
                    
                    // Remover la imagen base64 del atributo (dejar solo el nombre)
                    if (key.toLowerCase().includes('imagen')) {
                        // Si es un campo de imagen, conservar solo el nombre del archivo original
                        const originalName = extractImageName(value);
                        obj[key] = originalName || `imagen_procesada_${extractedImages.length}`;
                    } else {
                        // Si no es claramente un campo de imagen, eliminar completamente
                        delete obj[key];
                    }
                }
                // Caso 2: String que es nombre de archivo (nuevo formato)
                else if (typeof value === 'string' && 
                         key.toLowerCase().includes('imagen') && 
                         !value.startsWith('data:') && 
                         value.trim() !== '') {
                    
                    console.log(`[DEBUG] Campo de imagen encontrado (nombre de archivo): ${key} = ${value}`);
                    // Mantener el nombre del archivo tal como está - no hacer nada
                    // El archivo se procesará por separado en productFiles
                }
                // Caso 3: Objeto con preview (formato anterior)
                else if (typeof value === 'object' && value !== null) {
                    // Buscar recursivamente en objetos anidados
                    if (value.preview && typeof value.preview === 'string' && value.preview.startsWith('data:image/')) {
                        // Verificar duplicados en preview también
                        if (!processedImages.has(value.preview)) {
                            processedImages.add(value.preview);
                            
                            // Es un objeto con preview base64, extraer la imagen y limpiar el objeto
                            try {
                                const matches = value.preview.match(/^data:image\/([a-zA-Z]*);base64,(.*)$/);
                                if (matches && matches.length === 3) {
                                    const extension = matches[1];
                                    const base64Data = matches[2];
                                    
                                    const imageBuffer = Buffer.from(base64Data, 'base64');
                                    const timestamp = Date.now();
                                    const randomId = Math.random().toString(36).substr(2, 9);
                                    const filename = `producto_${productId}_orden_${orderId}_preview_${timestamp}_${randomId}.${extension}`;
                                    
                                    extractedImages.push({
                                        buffer: imageBuffer,
                                        filename: filename,
                                        path: `${currentPath}.preview`,
                                        originalValue: value.preview
                                    });
                                }
                            } catch (error) {
                                console.error('Error al procesar preview base64:', error);
                            }
                        }
                        
                        // Limpiar el objeto, mantener solo propiedades útiles
                        obj[key] = {
                            name: value.name || `imagen_${extractedImages.length}`,
                            size: value.size,
                            type: value.type
                        };
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

// Función unificada para guardar todas las imágenes de un producto (directas + atributos)
async function saveAllProductImages(allImages, productId, orderId, baseUrl) {
    if (!allImages || allImages.length === 0) {
        return [];
    }

    const savedImages = [];
    console.log(`[DEBUG] Procesando ${allImages.length} imágenes para producto ${productId}, orden ${orderId}`);

    for (let i = 0; i < allImages.length; i++) {
        const imageItem = allImages[i];
        let fullUrl;

        try {
            console.log(`[DEBUG] Procesando imagen ${i + 1}/${allImages.length}, tipo: ${imageItem.type}, hash: ${imageItem.hash}`);
            
            if (imageItem.type === 'direct') {
                // Es una imagen directa (archivo de multer)
                const file = imageItem.file;
                
                // Guardar usando saveFileWithFallback UNA SOLA VEZ
                fullUrl = await saveFileWithFallback(file, 'productos', baseUrl);
                console.log(`[DEBUG] Imagen directa guardada: ${fullUrl}`);
                
                savedImages.push({
                    type: imageItem.type,
                    url: fullUrl,
                    originalIndex: imageItem.index,
                    hash: imageItem.hash
                });
                
            } else if (imageItem.type === 'attribute') {
                // Es una imagen de atributo (base64 convertida)
                const image = imageItem.image;
                
                // Validar que la imagen tiene buffer
                if (!image.buffer) {
                    console.error('Error: imagen de atributo no tiene buffer:', image);
                    continue;
                }
                
                // Crear objeto de archivo simulado para saveFileWithFallback
                const timestamp = Date.now();
                const extension = image.filename.split('.').pop();
                const filename = `producto_${productId}_orden_${orderId}_attr_${timestamp}_${i}.${extension}`;
                
                const fakeFile = {
                    buffer: image.buffer,
                    originalname: filename,
                    mimetype: `image/${extension}`,
                    filename: filename
                };
                
                fullUrl = await saveFileWithFallback(fakeFile, 'productos', baseUrl);
                console.log(`[DEBUG] Imagen de atributo guardada: ${fullUrl}`);
                
                savedImages.push({
                    type: imageItem.type,
                    url: fullUrl,
                    originalIndex: imageItem.index,
                    hash: imageItem.hash
                });
            }
        } catch (error) {
            console.error(`Error al guardar imagen ${i}:`, error);
            // Continuar con las siguientes imágenes en lugar de fallar completamente
        }
    }

    console.log(`[DEBUG] Total de imágenes guardadas: ${savedImages.length}`);
    return savedImages;
}

module.exports = {
    createOrder,
    deleteProductFromOrder,
    deleteOrder,
    deactivateOrder,
    reactivateOrder
};