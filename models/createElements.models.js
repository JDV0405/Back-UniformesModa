const pool = require('../database/db');

const updateOrderPriority = async (idOrden, nuevaPrioridad) => {
    const query = `
        UPDATE orden_produccion 
        SET prioridad_orden = $1 
        WHERE id_orden = $2 AND activo = true
        RETURNING id_orden, prioridad_orden
    `;
    
    try {
        const result = await pool.query(query, [nuevaPrioridad, idOrden]);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

const getOrderById = async (idOrden) => {
    const query = `
        SELECT id_orden, prioridad_orden, id_cliente, fecha_aproximada
        FROM orden_produccion 
        WHERE id_orden = $1 AND activo = true
    `;
    
    try {
        const result = await pool.query(query, [idOrden]);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

// Función para actualizar la cantidad cortada de un producto
const actualizarCantidadCortada = async (idProductoProceso, cantidadCortada) => {
    const query = `
        UPDATE producto_proceso 
        SET cantidad_cortada = $1,
            cortado = CASE WHEN $1 >= cantidad THEN true ELSE false END
        WHERE id_producto_proceso = $2
        RETURNING *
    `;
    
    try {
        const result = await pool.query(query, [cantidadCortada, idProductoProceso]);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

// Función para marcar un producto como cortado o no cortado (mantener compatibilidad)
const marcarProductoCortado = async (idProductoProceso, cortado) => {
    const query = `
        UPDATE producto_proceso 
        SET cortado = $1,
            cantidad_cortada = CASE WHEN $1 = true THEN cantidad ELSE 0 END
        WHERE id_producto_proceso = $2
        RETURNING *
    `;
    
    try {
        const result = await pool.query(query, [cortado, idProductoProceso]);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

// Función para obtener productos por estado de cortado
const obtenerProductosPorEstadoCortado = async (cortado) => {
    const query = `
        SELECT 
            pp.id_producto_proceso,
            pp.cortado,
            pp.cantidad,
            pp.cantidad_cortada,
            pp.fecha_registro,
            dpo.id_detalle as id_detalle_producto,
            dpo.id_orden,
            dpo.atributosUsuario,
            p.nombre_producto,
            p.descripcion as descripcion_producto,
            c.nombre as nombre_cliente,
            c.id_cliente,
            conf.nombre as nombre_confeccionista,
            ep.nombre as nombre_proceso,
            dp.estado as estado_proceso,
            CASE 
                WHEN pp.cantidad_cortada = 0 THEN 'Sin cortar'
                WHEN pp.cantidad_cortada < pp.cantidad THEN 'Parcialmente cortado'
                WHEN pp.cantidad_cortada >= pp.cantidad THEN 'Completamente cortado'
            END as estado_cortado
        FROM producto_proceso pp
        JOIN detalle_producto_orden dpo ON pp.id_detalle_producto = dpo.id_detalle
        JOIN producto p ON dpo.id_producto = p.id_producto
        JOIN orden_produccion op ON dpo.id_orden = op.id_orden
        JOIN cliente c ON op.id_cliente = c.id_cliente
        JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
        JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
        LEFT JOIN confeccionista conf ON pp.id_confeccionista = conf.id_confeccionista
        WHERE pp.cortado = $1
        ORDER BY pp.fecha_registro DESC
    `;
    
    try {
        const result = await pool.query(query, [cortado]);
        return result.rows;
    } catch (error) {
        throw error;
    }
};

// Función para obtener un producto proceso específico
const obtenerProductoProcesoPorId = async (idProductoProceso) => {
    const query = `
        SELECT 
            pp.*,
            dpo.id_orden,
            p.nombre_producto,
            c.nombre as nombre_cliente
        FROM producto_proceso pp
        JOIN detalle_producto_orden dpo ON pp.id_detalle_producto = dpo.id_detalle
        JOIN producto p ON dpo.id_producto = p.id_producto
        JOIN orden_produccion op ON dpo.id_orden = op.id_orden
        JOIN cliente c ON op.id_cliente = c.id_cliente
        WHERE pp.id_producto_proceso = $1
    `;
    
    try {
        const result = await pool.query(query, [idProductoProceso]);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

// Función para obtener todos los productos de una orden con su estado de cortado
const obtenerProductosOrdenConEstadoCortado = async (idOrden, opciones = {}) => {
    const { 
        mostrarSoloMasAvanzado = false, 
        agruparPorProducto = false,
        filtrarPorProceso = null,
        mostrarTodos = false  // Nueva opción para mostrar todos los procesos
    } = opciones;

    let query = `
        SELECT 
            pp.id_producto_proceso,
            pp.cortado,
            pp.cantidad,
            pp.cantidad_cortada,
            dpo.id_detalle as id_detalle_producto,
            dpo.id_producto,
            p.nombre_producto,
            p.descripcion as descripcion_producto,
            ep.nombre as nombre_proceso,
            ep.id_proceso,
            conf.nombre as nombre_confeccionista,
            pp.fecha_registro,
            CASE 
                WHEN pp.cantidad_cortada = 0 THEN 'Sin cortar'
                WHEN pp.cantidad_cortada < pp.cantidad THEN 'Parcialmente cortado'
                WHEN pp.cantidad_cortada >= pp.cantidad THEN 'Completamente cortado'
            END as estado_cortado,
            (pp.cantidad - COALESCE(pp.cantidad_cortada, 0)) as cantidad_pendiente
        FROM detalle_producto_orden dpo
        JOIN producto p ON dpo.id_producto = p.id_producto
        LEFT JOIN producto_proceso pp ON dpo.id_detalle = pp.id_detalle_producto
        LEFT JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
        LEFT JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
        LEFT JOIN confeccionista conf ON pp.id_confeccionista = conf.id_confeccionista
        WHERE dpo.id_orden = $1
          AND pp.cantidad > 0
    `;

    const params = [idOrden];

    // Por defecto, mostrar solo productos en proceso de "Cortes" (id_proceso = 3)
    // a menos que se especifique mostrarTodos o un filtro específico
    if (!mostrarTodos && !filtrarPorProceso) {
        query += ' AND ep.id_proceso = 3';
    }

    // Filtrar por proceso específico si se proporciona
    if (filtrarPorProceso) {
        query += ' AND ep.nombre = $2';
        params.push(filtrarPorProceso);
    }

    query += ' ORDER BY p.nombre_producto, ep.id_proceso DESC, pp.fecha_registro DESC';
    
    try {
        const result = await pool.query(query, params);
        let productos = result.rows;

        // Filtrar duplicados y mostrar solo el proceso más avanzado por producto
        if (mostrarSoloMasAvanzado) {
            const productosMap = new Map();
            
            productos.forEach(producto => {
                const key = `${producto.id_producto}`;
                if (!productosMap.has(key)) {
                    productosMap.set(key, producto);
                } else {
                    // Mantener el que tenga mayor id_proceso (más avanzado)
                    const existing = productosMap.get(key);
                    if (producto.id_proceso > existing.id_proceso) {
                        productosMap.set(key, producto);
                    }
                }
            });
            
            productos = Array.from(productosMap.values());
        }

        // Agrupar por producto con resumen de procesos
        if (agruparPorProducto) {
            const gruposProducto = {};
            
            productos.forEach(producto => {
                const key = `${producto.id_producto}`;
                if (!gruposProducto[key]) {
                    gruposProducto[key] = {
                        id_producto: producto.id_producto,
                        nombre_producto: producto.nombre_producto,
                        descripcion_producto: producto.descripcion_producto,
                        id_detalle_producto: producto.id_detalle_producto,
                        procesos: [],
                        cantidad_total_original: 0,
                        cantidad_total_actual: 0,
                        cantidad_total_cortada: 0
                    };
                }
                
                gruposProducto[key].procesos.push({
                    id_producto_proceso: producto.id_producto_proceso,
                    nombre_proceso: producto.nombre_proceso,
                    id_proceso: producto.id_proceso,
                    cantidad: producto.cantidad,
                    cantidad_cortada: producto.cantidad_cortada,
                    cantidad_pendiente: producto.cantidad_pendiente,
                    estado_cortado: producto.estado_cortado,
                    nombre_confeccionista: producto.nombre_confeccionista,
                    fecha_registro: producto.fecha_registro
                });
                
                gruposProducto[key].cantidad_total_actual += producto.cantidad;
                gruposProducto[key].cantidad_total_cortada += producto.cantidad_cortada || 0;
            });
            
            productos = Object.values(gruposProducto);
        }

        return productos;
    } catch (error) {
        console.error('Error en obtenerProductosOrdenConEstadoCortado:', error);
        throw error;
    }
};

// Función para obtener productos con cantidades parcialmente cortadas
const obtenerProductosParcialmenteCortados = async () => {
    const query = `
        SELECT 
            pp.id_producto_proceso,
            pp.cortado,
            pp.cantidad,
            pp.cantidad_cortada,
            pp.fecha_registro,
            dpo.id_detalle as id_detalle_producto,
            dpo.id_orden,
            p.nombre_producto,
            c.nombre as nombre_cliente,
            ep.nombre as nombre_proceso,
            (pp.cantidad - pp.cantidad_cortada) as cantidad_pendiente
        FROM producto_proceso pp
        JOIN detalle_producto_orden dpo ON pp.id_detalle_producto = dpo.id_detalle
        JOIN producto p ON dpo.id_producto = p.id_producto
        JOIN orden_produccion op ON dpo.id_orden = op.id_orden
        JOIN cliente c ON op.id_cliente = c.id_cliente
        JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
        JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
        WHERE pp.cantidad_cortada > 0 AND pp.cantidad_cortada < pp.cantidad
        ORDER BY pp.fecha_registro DESC
    `;
    
    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    updateOrderPriority,
    getOrderById,
    actualizarCantidadCortada,
    marcarProductoCortado,
    obtenerProductosPorEstadoCortado,
    obtenerProductoProcesoPorId,
    obtenerProductosOrdenConEstadoCortado,
    obtenerProductosParcialmenteCortados
};