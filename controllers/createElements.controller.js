const { updateOrderPriority, getOrderById } = require('../models/createElements.models');

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

module.exports = {
    changePriorityOrder
};