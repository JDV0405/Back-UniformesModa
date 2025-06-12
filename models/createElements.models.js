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

module.exports = {
    updateOrderPriority,
    getOrderById
};