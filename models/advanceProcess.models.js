const db = require('../database/db');

const AdvanceProcessModel = {
  /**
   * Advance the process for an entire order
   */
  advanceOrderProcess: async (orderId, targetProcessId, employeeId, observations = '') => {
    try {
      // Start a transaction
      await db.query('BEGIN');
      
      // Get current process details for the order
      const currentProcessResult = await db.query(
        `SELECT id_detalle_proceso, id_proceso 
         FROM detalle_proceso 
         WHERE id_orden = $1 
         AND estado = 'En Proceso'`,
        [orderId]
      );
      
      if (currentProcessResult.rows.length === 0) {
        throw new Error('No active process found for this order');
      }
      
      const currentProcess = currentProcessResult.rows[0];
      
      // Verificar que el proceso destino sea un avance (mayor que el proceso actual)
      if (parseInt(targetProcessId) <= parseInt(currentProcess.id_proceso)) {
        throw new Error('El proceso destino debe ser un avance respecto al proceso actual');
      }
      
      // Verificar que la orden no haya pasado ya por este proceso
      const processHistoryCheck = await db.query(
        `SELECT id_proceso 
         FROM detalle_proceso 
         WHERE id_orden = $1 AND id_proceso = $2`,
        [orderId, targetProcessId]
      );
      
      if (processHistoryCheck.rows.length > 0) {
        throw new Error('La orden ya ha pasado por este proceso anteriormente');
      }
      
      // Update the current process end date
      await db.query(
        `UPDATE detalle_proceso 
         SET fecha_final_proceso = CURRENT_TIMESTAMP, 
             estado = 'Completado' 
         WHERE id_detalle_proceso = $1`,
        [currentProcess.id_detalle_proceso]
      );
      
      // Create a new process entry
      const newProcessResult = await db.query(
        `INSERT INTO detalle_proceso(id_orden, id_proceso, cedula_empleado, observaciones) 
         VALUES($1, $2, $3, $4) 
         RETURNING id_detalle_proceso`,
        [orderId, targetProcessId, employeeId, observations]
      );
      
      const newProcessId = newProcessResult.rows[0].id_detalle_proceso;
      
      // Get all product details for this order
      const productDetailsResult = await db.query(
        `SELECT id_detalle, cantidad 
         FROM detalle_producto_orden 
         WHERE id_orden = $1`,
        [orderId]
      );
      
      // Create producto_proceso entries for each product
      for (const product of productDetailsResult.rows) {
        await db.query(
          `INSERT INTO producto_proceso(id_detalle_producto, id_detalle_proceso, cantidad)
           VALUES($1, $2, $3)`,
          [product.id_detalle, newProcessId, product.cantidad]
        );
      }
      
      // Commit the transaction
      await db.query('COMMIT');
      
      return { success: true, processId: newProcessId };
    } catch (error) {
      // Rollback in case of error
      await db.query('ROLLBACK');
      throw error;
    }
  },
  
  /**
   * Advance the process for specific products within an order
   */
  advanceProductProcess: async (orderId, targetProcessId, employeeId, productDetails, observations = '') => {
    try {
      // Start a transaction
      await db.query('BEGIN');
      
      // Verificar que la orden tenga un proceso activo
      const currentProcessResult = await db.query(
        `SELECT id_detalle_proceso, id_proceso 
         FROM detalle_proceso 
         WHERE id_orden = $1 
         AND estado = 'En Proceso'`,
        [orderId]
      );
      
      if (currentProcessResult.rows.length === 0) {
        throw new Error('No active process found for this order');
      }
      
      const currentProcess = currentProcessResult.rows[0];
      
      // Verificar que el proceso destino sea un avance (mayor que el proceso actual)
      if (parseInt(targetProcessId) <= parseInt(currentProcess.id_proceso)) {
        throw new Error('El proceso destino debe ser un avance respecto al proceso actual');
      }
      
      // Create a new process entry
      const newProcessResult = await db.query(
        `INSERT INTO detalle_proceso(id_orden, id_proceso, cedula_empleado, observaciones) 
         VALUES($1, $2, $3, $4) 
         RETURNING id_detalle_proceso`,
        [orderId, targetProcessId, employeeId, observations]
      );
      
      const newProcessId = newProcessResult.rows[0].id_detalle_proceso;
      
      // Process each product detail
      for (const detail of productDetails) {
        // Validate product belongs to this order
        const productValidation = await db.query(
          `SELECT id_detalle, cantidad 
           FROM detalle_producto_orden 
           WHERE id_detalle = $1 AND id_orden = $2`,
          [detail.productDetailId, orderId]
        );
        
        if (productValidation.rows.length === 0) {
          throw new Error(`Producto con ID ${detail.productDetailId} no pertenece a la orden ${orderId}`);
        }
        
        const totalQuantity = productValidation.rows[0].cantidad;
        
        // Verificar que la cantidad a avanzar no supere la cantidad total del producto
        if (detail.quantity <= 0 || detail.quantity > totalQuantity) {
          throw new Error(`Cantidad inválida para el producto ID ${detail.productDetailId}`);
        }
        
        // Verificar que el producto no haya pasado ya por este proceso
        const productProcessCheck = await db.query(
          `SELECT pp.id_detalle_producto
           FROM producto_proceso pp
           JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
           WHERE dp.id_orden = $1 
           AND pp.id_detalle_producto = $2
           AND dp.id_proceso = $3`,
          [orderId, detail.productDetailId, targetProcessId]
        );
        
        if (productProcessCheck.rows.length > 0) {
          throw new Error(`El producto ${detail.productDetailId} ya ha pasado por este proceso anteriormente`);
        }
        
        // Create producto_proceso entry
        await db.query(
          `INSERT INTO producto_proceso(id_detalle_producto, id_detalle_proceso, cantidad)
           VALUES($1, $2, $3)`,
          [detail.productDetailId, newProcessId, detail.quantity]
        );
      }
      
      // Commit the transaction
      await db.query('COMMIT');
      
      return { success: true, processId: newProcessId };
    } catch (error) {
      // Rollback in case of error
      await db.query('ROLLBACK');
      throw error;
    }
  },
  
  /**
   * Get process history for an order
   */
  getOrderProcessHistory: async (orderId) => {
    try {
      const result = await db.query(
        `SELECT dp.id_detalle_proceso, dp.id_proceso, 
                ep.nombre as nombre_proceso, 
                dp.fecha_inicio_proceso, dp.fecha_final_proceso, 
                dp.cedula_empleado, dp.observaciones, dp.estado,
                e.nombre as nombre_empleado
         FROM detalle_proceso dp
         JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
         JOIN empleado e ON dp.cedula_empleado = e.cedula
         WHERE dp.id_orden = $1
         ORDER BY dp.fecha_inicio_proceso DESC`,
        [orderId]
      );
      
      return result.rows;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Get product distribution across processes for an order
   */
  getOrderProductDistribution: async (orderId) => {
    try {
      const result = await db.query(
        `SELECT pp.id_detalle_producto, dpo.id_producto, p.nombre_producto, 
                pp.id_detalle_proceso, dp.id_proceso, ep.nombre as nombre_proceso,
                pp.cantidad, pp.fecha_registro
         FROM producto_proceso pp
         JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
         JOIN detalle_producto_orden dpo ON pp.id_detalle_producto = dpo.id_detalle
         JOIN producto p ON dpo.id_producto = p.id_producto
         JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
         WHERE dp.id_orden = $1
         ORDER BY pp.fecha_registro DESC`,
        [orderId]
      );
      
      return result.rows;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Get partially advanced products for an order
   */
  getPartiallyAdvancedProducts: async (orderId) => {
    try {
      const result = await db.query(
        `SELECT 
            o.id_orden,
            dpo.id_detalle,
            p.nombre_producto,
            dpo.cantidad AS cantidad_total,
            SUM(pp.cantidad) AS cantidad_procesada,
            COUNT(DISTINCT dp.id_proceso) AS numero_de_procesos,
            STRING_AGG(DISTINCT ep.nombre || ' (' || pp.cantidad || ' unidades)', ', ') AS distribucion_procesos
        FROM 
            orden_produccion o
        JOIN 
            detalle_producto_orden dpo ON o.id_orden = dpo.id_orden
        JOIN 
            producto p ON dpo.id_producto = p.id_producto
        JOIN 
            producto_proceso pp ON dpo.id_detalle = pp.id_detalle_producto
        JOIN 
            detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
        JOIN 
            estado_proceso ep ON dp.id_proceso = ep.id_proceso
        WHERE 
            o.id_orden = $1
        GROUP BY 
            o.id_orden, dpo.id_detalle, p.nombre_producto, dpo.cantidad
        HAVING 
            COUNT(DISTINCT dp.id_proceso) > 1
        ORDER BY 
            dpo.id_detalle`,
        [orderId]
      );
      
      return result.rows;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get advanced products with their current and previous processes
   */
  getAdvancedProductsDetail: async (orderId) => {
    try {
      const result = await db.query(
        `WITH productos_procesos AS (
            SELECT 
                pp.id_detalle_producto,
                p.nombre_producto,
                dpo.cantidad as cantidad_total,
                dp.id_proceso,
                ep.nombre as nombre_proceso,
                pp.cantidad as cantidad_en_proceso,
                dp.fecha_inicio_proceso,
                dp.cedula_empleado,
                e.nombre as nombre_empleado,
                ROW_NUMBER() OVER (PARTITION BY pp.id_detalle_producto, dp.id_proceso ORDER BY dp.fecha_inicio_proceso DESC) as rn
            FROM 
                producto_proceso pp
            JOIN 
                detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
            JOIN 
                detalle_producto_orden dpo ON pp.id_detalle_producto = dpo.id_detalle
            JOIN 
                producto p ON dpo.id_producto = p.id_producto
            JOIN 
                estado_proceso ep ON dp.id_proceso = ep.id_proceso
            JOIN
                empleado e ON dp.cedula_empleado = e.cedula
            WHERE 
                dp.id_orden = $1
        )
        SELECT 
            pp1.id_detalle_producto,
            pp1.nombre_producto,
            pp1.id_proceso as proceso_actual,
            pp1.nombre_proceso as nombre_proceso_actual,
            pp1.cantidad_en_proceso as cantidad_en_proceso_actual,
            pp2.id_proceso as proceso_anterior,
            pp2.nombre_proceso as nombre_proceso_anterior,
            pp1.cantidad_total - pp1.cantidad_en_proceso as cantidad_no_avanzada,
            pp1.fecha_inicio_proceso as fecha_avance,
            pp1.nombre_empleado as avanzado_por
        FROM 
            productos_procesos pp1
        LEFT JOIN 
            productos_procesos pp2 ON pp1.id_detalle_producto = pp2.id_detalle_producto AND pp2.id_proceso < pp1.id_proceso
        WHERE 
            pp1.rn = 1
            AND (pp2.rn = 1 OR pp2.rn IS NULL)
        ORDER BY 
            pp1.id_detalle_producto, pp1.id_proceso DESC, pp2.id_proceso DESC`,
        [orderId]
      );
      
      return result.rows;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Get products in a specific process
   */
  getProductsByProcess: async (processId) => {
    try {
      const result = await db.query(
        `SELECT 
            pp.id_detalle_producto,
            dpo.id_producto,
            p.nombre_producto,
            pp.cantidad,
            dp.id_orden,
            o.id_cliente,
            c.nombre as nombre_cliente,
            dp.fecha_inicio_proceso
        FROM 
            producto_proceso pp
        JOIN 
            detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
        JOIN 
            detalle_producto_orden dpo ON pp.id_detalle_producto = dpo.id_detalle
        JOIN 
            producto p ON dpo.id_producto = p.id_producto
        JOIN 
            orden_produccion o ON dp.id_orden = o.id_orden
        JOIN 
            cliente c ON o.id_cliente = c.id_cliente
        WHERE 
            dp.id_proceso = $1
            AND dp.estado = 'En Proceso'
        ORDER BY 
            dp.fecha_inicio_proceso DESC`,
        [processId]
      );
      
      return result.rows;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Get all active orders with their current processes
   */
  getAllActiveOrders: async () => {
    try {
      const result = await db.query(
        `SELECT 
            o.id_orden,
            o.id_cliente,
            c.nombre as nombre_cliente,
            o.fecha_aproximada,
            dp.id_proceso,
            ep.nombre as nombre_proceso,
            dp.fecha_inicio_proceso,
            COUNT(DISTINCT dpo.id_detalle) as total_productos,
            SUM(dpo.cantidad) as total_unidades,
            e.nombre as nombre_empleado_responsable
        FROM 
            orden_produccion o
        JOIN 
            cliente c ON o.id_cliente = c.id_cliente
        JOIN 
            detalle_proceso dp ON o.id_orden = dp.id_orden
        JOIN 
            estado_proceso ep ON dp.id_proceso = ep.id_proceso
        JOIN 
            empleado e ON dp.cedula_empleado = e.cedula
        JOIN 
            detalle_producto_orden dpo ON o.id_orden = dpo.id_orden
        WHERE 
            dp.estado = 'En Proceso'
        GROUP BY 
            o.id_orden, o.id_cliente, c.nombre, o.fecha_aproximada, 
            dp.id_proceso, ep.nombre, dp.fecha_inicio_proceso, e.nombre
        ORDER BY 
            dp.fecha_inicio_proceso DESC`
      );
      
      return result.rows;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Get detailed information about an order including all products and their processes
   */
  getOrderDetails: async (orderId) => {
    try {
      // Datos de la orden
      const orderResult = await db.query(
        `SELECT 
            o.id_orden,
            o.id_cliente,
            c.nombre as nombre_cliente,
            c.tipo as tipo_cliente,
            c.correo as correo_cliente,
            o.fecha_aproximada,
            o.tipo_pago,
            o.observaciones,
            e.nombre || ' ' || e.apellidos as empleado_responsable,
            dp.id_proceso,
            ep.nombre as nombre_proceso,
            dp.fecha_inicio_proceso
        FROM 
            orden_produccion o
        JOIN 
            cliente c ON o.id_cliente = c.id_cliente
        JOIN 
            empleado e ON o.cedula_empleado_responsable = e.cedula
        JOIN 
            detalle_proceso dp ON o.id_orden = dp.id_orden
        JOIN 
            estado_proceso ep ON dp.id_proceso = ep.id_proceso
        WHERE 
            o.id_orden = $1
            AND dp.estado = 'En Proceso'`,
        [orderId]
      );
      
      if (orderResult.rows.length === 0) {
        throw new Error(`No se encontró una orden activa con el ID ${orderId}`);
      }
      
      const orderData = orderResult.rows[0];
      
      // Productos de la orden
      const productsResult = await db.query(
        `WITH producto_procesos AS (
            SELECT 
                dpo.id_detalle,
                dpo.id_producto,
                p.nombre_producto,
                dpo.cantidad as cantidad_total,
                dpo.bordado,
                dpo.observacion,
                dpo.url_producto,
                dpo.estado as estado_producto,
                dpo.atributosUsuario,
                pp.id_detalle_proceso,
                dp.id_proceso,
                ep.nombre as nombre_proceso,
                pp.cantidad as cantidad_en_proceso,
                dp.estado as estado_proceso
            FROM 
                detalle_producto_orden dpo
            JOIN 
                producto p ON dpo.id_producto = p.id_producto
            LEFT JOIN 
                producto_proceso pp ON dpo.id_detalle = pp.id_detalle_producto
            LEFT JOIN 
                detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
            LEFT JOIN 
                estado_proceso ep ON dp.id_proceso = ep.id_proceso
            WHERE 
                dpo.id_orden = $1
        )
        SELECT 
            id_detalle,
            id_producto,
            nombre_producto,
            cantidad_total,
            bordado,
            observacion,
            url_producto,
            estado_producto,
            atributosUsuario,
            json_agg(
                json_build_object(
                    'id_proceso', id_proceso,
                    'nombre_proceso', nombre_proceso,
                    'cantidad', cantidad_en_proceso,
                    'estado_proceso', estado_proceso
                )
            ) as procesos
        FROM 
            producto_procesos
        GROUP BY 
            id_detalle, id_producto, nombre_producto, cantidad_total,
            bordado, observacion, url_producto, estado_producto, atributosUsuario`,
        [orderId]
      );
      
      // Combinar datos
      const result = {
        ...orderData,
        productos: productsResult.rows
      };
      
      return result;
    } catch (error) {
      throw error;
    }
  }
};

module.exports = AdvanceProcessModel;