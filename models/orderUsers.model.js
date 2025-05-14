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
    
    const orders = await pool.query(
      `SELECT op.*, 
              c.nombre as cliente_nombre, c.correo as cliente_correo,
              COALESCE(
                (
                  SELECT dp.estado
                  FROM detalle_proceso dp
                  WHERE dp.id_orden = op.id_orden
                  ORDER BY dp.fecha_inicio_proceso DESC
                  LIMIT 1
                ), 'Pendiente'
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
    const orderQuery = await pool.query(
      `SELECT op.*, 
        c.nombre as cliente_nombre, 
        c.correo as cliente_correo,
        c.tipo as tipo_cliente,
        (SELECT tc.telefono FROM telefono_cliente tc WHERE tc.id_cliente = c.id_cliente LIMIT 1) as cliente_telefono,
        (SELECT tc.tipo FROM telefono_cliente tc WHERE tc.id_cliente = c.id_cliente LIMIT 1) as tipo_telefono,
        (SELECT d.direccion FROM direccion d WHERE d.id_cliente = c.id_cliente LIMIT 1) as cliente_direccion,
        (SELECT ci.ciudad FROM ciudad ci 
          JOIN direccion d ON ci.id_ciudad = d.id_ciudad
          WHERE d.id_cliente = c.id_cliente LIMIT 1) as cliente_ciudad,
        (SELECT dep.id_departamento FROM departamento dep
          JOIN ciudad ci ON dep.id_departamento = ci.id_departamento
          JOIN direccion d ON ci.id_ciudad = d.id_ciudad
          WHERE d.id_cliente = c.id_cliente LIMIT 1) as departamento_id,
        (SELECT dep.nombre FROM departamento dep
          JOIN ciudad ci ON dep.id_departamento = ci.id_departamento
          JOIN direccion d ON ci.id_ciudad = d.id_ciudad
          WHERE d.id_cliente = c.id_cliente LIMIT 1) as departamento_nombre,
        (CASE 
          WHEN c.tipo = 'Natural' THEN 
            (SELECT json_build_object('tipo_doc', n.tipo_doc, 'profesion', n.profesion)
            FROM cli_natural n WHERE n.id_cliente = c.id_cliente)
          WHEN c.tipo = 'Juridico' THEN 
            (SELECT json_build_object('sector_economico', j.sector_economico)
            FROM juridico j WHERE j.id_cliente = c.id_cliente)
          ELSE NULL
        END) as datos_especificos
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