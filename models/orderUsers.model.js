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
 * @returns {Promise<Object>} - Detalles de la orden con sus productos y proceso actual por producto
 */
const getOrderDetailsById = async (orderId) => {
  try {
    // Primero obtenemos la información básica de la orden
    const orderQuery = await pool.query(
      `SELECT op.id_orden, op.fecha_aproximada, op.id_cliente, op.id_direccion,
              cp.url_comprobante,
              e.nombre as empleado_nombre, e.apellidos as empleado_apellidos
       FROM orden_produccion op
       LEFT JOIN comprobante_pago cp ON op.id_comprobante_pago = cp.id_comprobante_pago
       LEFT JOIN empleado e ON op.cedula_empleado_responsable = e.cedula 
       WHERE op.id_orden = $1`,
      [orderId]
    );
    
    if (orderQuery.rows.length === 0) {
      return null;
    }
    
    // Consulta principal con información relacionada usando la dirección asociada a la orden
    const detailsQuery = await pool.query(
      `SELECT 
        op.*, 
        c.nombre as cliente_nombre, 
        c.correo as cliente_correo,
        c.tipo as tipo_cliente,
        d.direccion as cliente_direccion,
        ci.id_ciudad,
        ci.ciudad as cliente_ciudad,
        dep.id_departamento as departamento_id,
        dep.nombre as departamento_nombre,
        (
          SELECT json_build_object(
            'telefono', tc.telefono,
            'tipo', tc.tipo
          )
          FROM telefono_cliente tc 
          WHERE tc.id_cliente = op.id_cliente
          ORDER BY tc.id_telefono DESC
          LIMIT 1
        ) as telefono_info,
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
      LEFT JOIN direccion d ON op.id_direccion = d.id_direccion
      LEFT JOIN ciudad ci ON d.id_ciudad = ci.id_ciudad
      LEFT JOIN departamento dep ON ci.id_departamento = dep.id_departamento
      WHERE op.id_orden = $1`,
      [orderId]
    );
    
    if (detailsQuery.rows.length === 0) {
      return null;
    }
    
    const order = detailsQuery.rows[0];
    
    // Extraemos y estructuramos los datos agrupados
    if (order.telefono_info) {
      order.cliente_telefono = order.telefono_info.telefono;
      order.tipo_telefono = order.telefono_info.tipo;
      delete order.telefono_info;
    }
    
    // MODIFICADO: Obtener productos con información del proceso actual
    const productsQuery = await pool.query(
      `SELECT 
        dpo.*, 
        p.nombre_producto,
        JSONB_BUILD_OBJECT(
          'id_categoria', c.id_categoria,
          'nombre_categoria', c.nombre_categoria,
          'descripcion', c.descripcion
        ) AS categoria,
        -- NUEVO: Información del proceso actual del producto
        COALESCE(
          (
            SELECT dp.id_proceso
            FROM producto_proceso pp
            JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
            WHERE pp.id_detalle_producto = dpo.id_detalle
            ORDER BY dp.fecha_inicio_proceso DESC
            LIMIT 1
          ), NULL
        ) AS id_proceso_actual,
        COALESCE(
          (
            SELECT ep.nombre
            FROM producto_proceso pp
            JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
            JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
            WHERE pp.id_detalle_producto = dpo.id_detalle
            ORDER BY dp.fecha_inicio_proceso DESC
            LIMIT 1
          ), 'Sin proceso asignado'
        ) AS nombre_proceso_actual
      FROM detalle_producto_orden dpo
      JOIN producto p ON dpo.id_producto = p.id_producto
      JOIN categoria c ON p.id_categoria = c.id_categoria
      WHERE dpo.id_orden = $1
      ORDER BY dpo.id_detalle`,
      [orderId]
    );
    
    // Obtener procesos de la orden
    const processesQuery = await pool.query(
      `SELECT 
        dp.*, 
        ep.nombre as nombre_proceso,
        e.nombre as empleado_nombre,
        e.apellidos as empleado_apellidos,
        e.telefono as empleado_telefono,
        -- Información de productos en este proceso
        (
          SELECT COUNT(DISTINCT pp.id_detalle_producto)
          FROM producto_proceso pp
          WHERE pp.id_detalle_proceso = dp.id_detalle_proceso
        ) as productos_en_proceso,
        (
          SELECT SUM(pp.cantidad)
          FROM producto_proceso pp
          WHERE pp.id_detalle_proceso = dp.id_detalle_proceso
        ) as cantidad_total_proceso
      FROM detalle_proceso dp
      JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
      JOIN empleado e ON dp.cedula_empleado = e.cedula
      WHERE dp.id_orden = $1
      ORDER BY dp.fecha_inicio_proceso ASC`,
      [orderId]
    );
    
    // Procesamiento de colores (código existente)
    const colorsQuery = await pool.query(
      `SELECT id_color, nombre_color, codigo_hex FROM color`
    );
    
    const colorMap = {};
    colorsQuery.rows.forEach(color => {
      colorMap[color.nombre_color.toLowerCase()] = {
        id_color: color.id_color,
        codigo_hex: color.codigo_hex,
        nombre_color: color.nombre_color
      };
    });
    
    // Procesamiento de estampados (código existente)
    const estampadosQuery = await pool.query(
      `SELECT id_estampado, nombre_estampado FROM estampado`
    );
    
    const estampadoMap = {};
    estampadosQuery.rows.forEach(estampado => {
      estampadoMap[estampado.nombre_estampado.toLowerCase()] = {
        id_estampado: estampado.id_estampado,
        nombre_estampado: estampado.nombre_estampado
      };
    });
    
    // MODIFICADO: Procesamiento de productos con información del proceso actual
    const productosConColores = productsQuery.rows.map(producto => {
      const productoConColor = { ...producto };
      
      // Nos aseguramos de que atributosusuario sea un objeto
      if (!productoConColor.atributosusuario) {
        productoConColor.atributosusuario = {};
      }
      
      // Procesamiento de color (código existente)
      if (productoConColor.atributosusuario.color) {
        const nombreColor = productoConColor.atributosusuario.color.toLowerCase();
        
        if (colorMap[nombreColor]) {
          productoConColor.color_id = colorMap[nombreColor].id_color;
          productoConColor.color_nombre = colorMap[nombreColor].nombre_color;
          productoConColor.color_hexadecimal = colorMap[nombreColor].codigo_hex;
        } else {
          const colorParcial = Object.keys(colorMap).find(color => 
            nombreColor.includes(color.toLowerCase()) || color.toLowerCase().includes(nombreColor)
          );
          
          if (colorParcial) {
            productoConColor.color_id = colorMap[colorParcial].id_color;
            productoConColor.color_nombre = colorMap[colorParcial].nombre_color;
            productoConColor.color_hexadecimal = colorMap[colorParcial].codigo_hex;
          } else {
            productoConColor.color_id = null;
            productoConColor.color_nombre = null;
            productoConColor.color_hexadecimal = null;
          }
        }
      } else {
        productoConColor.color_id = null;
        productoConColor.color_nombre = null;
        productoConColor.color_hexadecimal = null;
      }
      
      // Procesamiento de estampado (código existente)
      if (productoConColor.atributosusuario.estampado) {
        const nombreEstampado = productoConColor.atributosusuario.estampado.toLowerCase();
        
        if (estampadoMap[nombreEstampado]) {
          productoConColor.estampado_id = estampadoMap[nombreEstampado].id_estampado;
          productoConColor.estampado_nombre = estampadoMap[nombreEstampado].nombre_estampado;
        } else {
          const estampadoParcial = Object.keys(estampadoMap).find(estampado => 
            nombreEstampado.includes(estampado.toLowerCase()) || estampado.toLowerCase().includes(nombreEstampado)
          );
          
          if (estampadoParcial) {
            productoConColor.estampado_id = estampadoMap[estampadoParcial].id_estampado;
            productoConColor.estampado_nombre = estampadoMap[estampadoParcial].nombre_estampado;
          } else {
            productoConColor.estampado_id = null;
            productoConColor.estampado_nombre = null;
          }
        }
      } else {
        productoConColor.estampado_id = null;
        productoConColor.estampado_nombre = null;
      }
      
      return productoConColor;
    });
    
    return {
      ...order,
      productos: productosConColores,
      procesos: processesQuery.rows,
      proceso_actual: processesQuery.rows.length > 0 ? 
        processesQuery.rows[processesQuery.rows.length - 1] : null
    };
  } catch (error) {
    throw new Error(`Error al obtener detalles de la orden: ${error.message}`);
  }
};
module.exports = {
  getOrdersByClientId,
  getOrderDetailsById,
};