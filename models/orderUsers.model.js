const pool = require('../database/db.js');

/**
 * Obtiene todas las órdenes de producción asociadas al ID de un cliente
 * @param {string} clienteId - ID del cliente
 * @returns {Promise<Array>} - Lista de órdenes de producción
 */
const getOrdersByClientId = async (clienteId) => {
  try {
    // Verificar si el cliente existe
    const clienteQuery = await pool.query(
      `SELECT * FROM cliente WHERE id_cliente = $1`,
      [clienteId]
    );
    
    if (clienteQuery.rows.length === 0) {
      return { clienteExiste: false, orders: [] };
    }
    
    // Obtener las órdenes del cliente
    const orders = await pool.query(
      `SELECT op.*, 
              c.nombre as cliente_nombre,
              (
                SELECT dpo.estado
                FROM detalle_producto_orden dpo
                WHERE dpo.id_orden = op.id_orden
                LIMIT 1
              ) AS estado_general,
              (
                SELECT MIN(dp.fecha_inicio_proceso)
                FROM detalle_proceso dp
                WHERE dp.id_orden = op.id_orden
              ) AS fecha_inicio_proceso
      FROM orden_produccion op
      JOIN cliente c ON op.id_cliente = c.id_cliente
      WHERE op.id_cliente = $1`,
      [clienteId]
    );
    
    return { clienteExiste: true, orders: orders.rows };
  } catch (error) {
    throw new Error(`Error al obtener órdenes: ${error.message}`);
  }
};

/**
 * Obtiene los detalles de una orden específica
 * @param {number} orderId - ID de la orden
 * @returns {Promise<Object>} - Detalles de la orden con sus productos
 */
const getOrderDetailsById = async (orderId) => {
  try {
    // Obtener información de la orden
    const orderQuery = await pool.query(
      `SELECT op.*, c.nombre as cliente_nombre
       FROM orden_produccion op
       JOIN cliente c ON op.id_cliente = c.id_cliente
       WHERE op.id_orden = $1`,
      [orderId]
    );
    
    if (orderQuery.rows.length === 0) {
      return null;
    }
    
    const order = orderQuery.rows[0];
    
    // Obtener productos de la orden
    const productsQuery = await pool.query(
      `SELECT dpo.*, p.nombre_producto
       FROM detalle_producto_orden dpo
       JOIN producto p ON dpo.id_producto = p.id_producto
       WHERE dpo.id_orden = $1`,
      [orderId]
    );
    
    // Obtener procesos de la orden
    const processesQuery = await pool.query(
      `SELECT dp.*, ep.nombre as nombre_proceso
       FROM detalle_proceso dp
       JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
       WHERE dp.id_orden = $1`,
      [orderId]
    );
    
    return {
      ...order,
      productos: productsQuery.rows,
      procesos: processesQuery.rows
    };
  } catch (error) {
    throw new Error(`Error al obtener detalles de la orden: ${error.message}`);
  }
};

module.exports = {
  getOrdersByClientId,
  getOrderDetailsById
};