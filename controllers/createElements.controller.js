const { 
    updateOrderPriority, 
    getOrderById,
    actualizarCantidadCortada,
    marcarProductoCortado,
    obtenerProductosPorEstadoCortado,
    obtenerProductoProcesoPorId,
    obtenerProductosOrdenConEstadoCortado,
    obtenerProductosParcialmenteCortados
} = require('../models/createElements.models');

const changePriorityOrder = async (req, res) => {
    try {
        const { id_orden } = req.params;
        const { prioridad_orden } = req.body;

        // Validar que se proporcionen los datos necesarios
        if (!id_orden || !prioridad_orden) {
            return res.status(400).json({
                success: false,
                message: 'El ID de la orden y la nueva prioridad son requeridos'
            });
        }

        // Verificar que la orden existe
        const orderExists = await getOrderById(id_orden);
        if (!orderExists) {
            return res.status(404).json({
                success: false,
                message: 'Orden no encontrada'
            });
        }

        // Actualizar la prioridad
        const updatedOrder = await updateOrderPriority(id_orden, prioridad_orden);
        
        if (!updatedOrder) {
            return res.status(500).json({
                success: false,
                message: 'Error al actualizar la prioridad de la orden'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Prioridad de la orden actualizada exitosamente',
            data: updatedOrder
        });

    } catch (error) {
        console.error('Error al cambiar prioridad de orden:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Controlador para actualizar cantidad cortada
const actualizarCantidadCortadaController = async (req, res) => {
    try {
        const { id_producto_proceso } = req.params;
        const { cantidad_cortada } = req.body;

        // Validar que se proporcionen los datos necesarios
        if (!id_producto_proceso || cantidad_cortada === undefined) {
            return res.status(400).json({
                success: false,
                message: 'El ID del producto proceso y la cantidad cortada son requeridos'
            });
        }

        // Validar que la cantidad sea un número positivo
        if (cantidad_cortada < 0) {
            return res.status(400).json({
                success: false,
                message: 'La cantidad cortada no puede ser negativa'
            });
        }

        // Verificar que el producto proceso existe
        const productoProceso = await obtenerProductoProcesoPorId(id_producto_proceso);
        if (!productoProceso) {
            return res.status(404).json({
                success: false,
                message: 'Producto proceso no encontrado'
            });
        }

        // Validar que la cantidad cortada no exceda la cantidad total
        if (cantidad_cortada > productoProceso.cantidad) {
            return res.status(400).json({
                success: false,
                message: `La cantidad cortada (${cantidad_cortada}) no puede ser mayor a la cantidad total (${productoProceso.cantidad})`
            });
        }

        // Actualizar la cantidad cortada
        const productoActualizado = await actualizarCantidadCortada(id_producto_proceso, cantidad_cortada);
        
        if (!productoActualizado) {
            return res.status(500).json({
                success: false,
                message: 'Error al actualizar la cantidad cortada'
            });
        }

        // Determinar el estado
        let estadoTexto = '';
        if (productoActualizado.cantidad_cortada === 0) {
            estadoTexto = 'Sin cortar';
        } else if (productoActualizado.cantidad_cortada < productoActualizado.cantidad) {
            estadoTexto = 'Parcialmente cortado';
        } else {
            estadoTexto = 'Completamente cortado';
        }

        res.status(200).json({
            success: true,
            message: `Cantidad cortada actualizada exitosamente. Estado: ${estadoTexto}`,
            data: {
                ...productoActualizado,
                estado_cortado: estadoTexto,
                cantidad_pendiente: productoActualizado.cantidad - productoActualizado.cantidad_cortada
            }
        });

    } catch (error) {
        console.error('Error al actualizar cantidad cortada:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Controlador para marcar producto como cortado (mantener compatibilidad)
const marcarCortado = async (req, res) => {
    try {
        const { id_producto_proceso } = req.params;
        const { cortado } = req.body;

        // Validar que se proporcionen los datos necesarios
        if (!id_producto_proceso || cortado === undefined) {
            return res.status(400).json({
                success: false,
                message: 'El ID del producto proceso y el estado cortado son requeridos'
            });
        }

        // Verificar que el producto proceso existe
        const productoProceso = await obtenerProductoProcesoPorId(id_producto_proceso);
        if (!productoProceso) {
            return res.status(404).json({
                success: false,
                message: 'Producto proceso no encontrado'
            });
        }

        // Marcar/desmarcar como cortado
        const productoActualizado = await marcarProductoCortado(id_producto_proceso, cortado);
        
        if (!productoActualizado) {
            return res.status(500).json({
                success: false,
                message: 'Error al actualizar el estado de cortado'
            });
        }

        res.status(200).json({
            success: true,
            message: `Producto ${cortado ? 'marcado como cortado' : 'desmarcado como cortado'} exitosamente`,
            data: productoActualizado
        });

    } catch (error) {
        console.error('Error al marcar producto como cortado:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Controlador para obtener productos por estado de cortado
const obtenerProductosCortados = async (req, res) => {
    try {
        const { estado } = req.params; // 'cortados', 'no-cortados', 'parciales'
        
        let productos;
        
        if (estado === 'cortados') {
            productos = await obtenerProductosPorEstadoCortado(true);
        } else if (estado === 'no-cortados') {
            productos = await obtenerProductosPorEstadoCortado(false);
        } else if (estado === 'parciales') {
            productos = await obtenerProductosParcialmenteCortados();
        } else {
            return res.status(400).json({
                success: false,
                message: 'Estado inválido. Use "cortados", "no-cortados" o "parciales"'
            });
        }

        res.status(200).json({
            success: true,
            message: `Productos ${estado} obtenidos exitosamente`,
            data: productos,
            total: productos.length
        });

    } catch (error) {
        console.error('Error al obtener productos por estado de cortado:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Controlador para obtener todos los productos de una orden con estado de cortado
const obtenerProductosOrden = async (req, res) => {
    try {
        const { id_orden } = req.params;
        const { 
            mostrar_solo_mas_avanzado, 
            agrupar_por_producto,
            filtrar_por_proceso,
            mostrar_todos
        } = req.query;

        if (!id_orden) {
            return res.status(400).json({
                success: false,
                message: 'El ID de la orden es requerido'
            });
        }

        // Verificar que la orden existe
        const orden = await getOrderById(id_orden);
        if (!orden) {
            return res.status(404).json({
                success: false,
                message: 'Orden no encontrada'
            });
        }

        // Configurar opciones de consulta
        const opciones = {
            mostrarSoloMasAvanzado: mostrar_solo_mas_avanzado === 'true',
            agruparPorProducto: agrupar_por_producto === 'true',
            filtrarPorProceso: filtrar_por_proceso || null,
            mostrarTodos: mostrar_todos === 'true'
        };


        const productos = await obtenerProductosOrdenConEstadoCortado(id_orden, opciones);

        res.status(200).json({
            success: true,
            message: productos.length > 0 ? 
                'Productos pendientes por cortar obtenidos exitosamente' : 
                'No hay productos pendientes por cortar en esta orden',
            data: productos,
            total: productos.length,
            opciones_aplicadas: opciones
        });

    } catch (error) {
        console.error('Error al obtener productos de la orden:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

module.exports = {
    changePriorityOrder,
    actualizarCantidadCortadaController,
    marcarCortado,
    obtenerProductosCortados,
    obtenerProductosOrden
};