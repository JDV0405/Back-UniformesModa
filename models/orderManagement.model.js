const  pool  = require('../database/db.js'); // Importar la conexión a la base de datos
const bcrypt = require('bcrypt');

const UserModel = {
  login: async (email, password) => {
    try {
      const query = `
        SELECT u.id_usuario, u.email, u.contrasena, u.activo, 
              e.cedula, e.nombre, e.apellidos, e.estado, 
              r.id_rol, r.nombre_rol 
        FROM usuario u
        JOIN empleado e ON u.cedula_empleado = e.cedula
        JOIN rol r ON e.id_rol = r.id_rol
        WHERE u.email = $1 AND u.activo = true AND e.estado = true
      `;
      const result = await pool.query(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const user = result.rows[0];
      
      const isPasswordValid = await bcrypt.compare(password, user.contrasena);
      
      if (!isPasswordValid) {
        return null;
      }
      
      delete user.contrasena;
      return user;
      
    } catch (error) {
      throw new Error(`Error en login: ${error.message}`);
    }
  },

  // Obtener información del empleado por ID de usuario
  getEmployeeByUserId: async (userId) => {
    try {
      const query = `
        SELECT e.cedula, e.nombre, e.apellidos, e.estado, e.telefono,
              r.id_rol, r.nombre_rol, r.descripcion
        FROM usuario u
        JOIN empleado e ON u.cedula_empleado = e.cedula
        JOIN rol r ON e.id_rol = r.id_rol
        WHERE u.id_usuario = $1 AND u.activo = true
      `;
      const result = await pool.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error al obtener empleado: ${error.message}`);
    }
  }
};

// Modelo para gestión de órdenes
const OrderModel = {
  
  getOrdersByProcess: async (idProceso) => {
    try {
      const query = `
        SELECT 
          op.id_orden as numero_orden, 
          c.nombre as nombre_cliente,
          ep.nombre as nombre_proceso,
          dp.id_detalle_proceso,
          dp.fecha_inicio_proceso,
          dp.estado as estado_proceso, 
          dp.observaciones,
          dp.fecha_final_proceso,
          e.nombre as nombre_empleado,
          e.apellidos as apellidos_empleado
        FROM orden_produccion op
        JOIN detalle_proceso dp ON op.id_orden = dp.id_orden
        JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
        JOIN cliente c ON op.id_cliente = c.id_cliente
        JOIN empleado e ON dp.cedula_empleado = e.cedula
        WHERE dp.id_proceso = $1 
          AND dp.estado = 'En Proceso'
        ORDER BY dp.fecha_inicio_proceso ASC
      `;
      const result = await pool.query(query, [idProceso]);
      return result.rows;
    } catch (error) {
      throw new Error(`Error al obtener órdenes por proceso: ${error.message}`);
    }
  },

  getOrdersByEmployeeAndProcess: async (cedulaEmpleado, idProceso) => {
    // Simplemente llamamos al método actualizado, ignorando la cédula
    return OrderModel.getOrdersByProcess(idProceso);
  },

  getOrdersByProcess: async (idProceso) => {
    try {
      const query = `
        SELECT 
          op.id_orden as numero_orden, 
          c.nombre as nombre_cliente,
          ep.nombre as nombre_proceso,
          dp.fecha_inicio_proceso,
          dp.estado as estado_proceso, 
          dp.observaciones,
          dp.fecha_final_proceso
        FROM orden_produccion op
        JOIN detalle_proceso dp ON op.id_orden = dp.id_orden
        JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
        JOIN cliente c ON op.id_cliente = c.id_cliente
        WHERE dp.id_proceso = $1 
          AND dp.estado = 'En Proceso'
        ORDER BY dp.fecha_inicio_proceso ASC
      `;
      const result = await pool.query(query, [idProceso]);
      return result.rows;
    } catch (error) {
      throw new Error(`Error al obtener órdenes por proceso: ${error.message}`);
    }
  },

  // ...existing code...

  // Add this function to the OrderModel object
  advancePartialOrderToNextProcess: async (idOrden, idProcesoActual, idProcesoSiguiente, cedulaEmpleadoActual, itemsToAdvance, observaciones = '') => {
    try {
      // Iniciar transacción
      await pool.query('BEGIN');

      // 1. Validar que los productos existen en la orden
      const queryValidateProducts = `
        SELECT id_detalle, id_producto, cantidad, estado
        FROM detalle_producto_orden
        WHERE id_orden = $1 AND id_detalle IN (${itemsToAdvance.map((_, i) => `$${i + 2}`).join(',')})
      `;
      
      const validProducts = await pool.query(
        queryValidateProducts, 
        [idOrden, ...itemsToAdvance.map(item => item.idDetalle)]
      );
      
      if (validProducts.rows.length !== itemsToAdvance.length) {
        throw new Error('Algunos productos seleccionados no existen en esta orden');
      }

      // 2. Obtener el detalle de proceso actual
      const queryDetalleProcesoActual = `
        SELECT id_detalle_proceso, observaciones
        FROM detalle_proceso
        WHERE id_orden = $1 AND id_proceso = $2 AND estado = 'En Proceso'
      `;
      const detalleProcesoActual = await pool.query(queryDetalleProcesoActual, [idOrden, idProcesoActual]);
      
      if (detalleProcesoActual.rows.length === 0) {
        throw new Error('No existe un proceso activo para esta orden en la etapa indicada');
      }
      
      const { id_detalle_proceso: idDetalleProcesoActual, observaciones: observacionesAnteriores } = detalleProcesoActual.rows[0];

      // 3. Preparar las observaciones para el nuevo proceso
      let observacionesNuevoProceso = observacionesAnteriores || '';
      
      if (observaciones && observaciones.length > 0) {
        const nombreProcesoActualQuery = `SELECT nombre FROM estado_proceso WHERE id_proceso = $1`;
        const nombreProcesoResult = await pool.query(nombreProcesoActualQuery, [idProcesoActual]);
        const nombreProcesoActual = nombreProcesoResult.rows[0]?.nombre || 'Proceso anterior';
        
        const fechaActual = new Date().toLocaleString();
        const productosAvanzados = itemsToAdvance.map(item => `ID:${item.idDetalle}(${item.cantidad})`).join(', ');
        const nuevaObservacion = `[${fechaActual} - ${nombreProcesoActual}]: Avance parcial - Productos: ${productosAvanzados}. ${observaciones}`;
        
        observacionesNuevoProceso = observacionesNuevoProceso 
          ? `${observacionesNuevoProceso}\n${nuevaObservacion}`
          : nuevaObservacion;
      }

      // 4. Buscar si ya existe un registro de proceso para el siguiente paso
      const queryBuscarProcesoSiguiente = `
        SELECT id_detalle_proceso, observaciones
        FROM detalle_proceso
        WHERE id_orden = $1 AND id_proceso = $2 AND estado = 'En Proceso'
      `;
      const procesoSiguienteExistente = await pool.query(queryBuscarProcesoSiguiente, [idOrden, idProcesoSiguiente]);
      
      let idDetalleProcesoSiguiente;
      
      if (procesoSiguienteExistente.rows.length > 0) {
        // Si ya existe un registro para el proceso siguiente, utilizamos ese
        idDetalleProcesoSiguiente = procesoSiguienteExistente.rows[0].id_detalle_proceso;
        
        // Actualizar las observaciones del proceso existente
        const updateObservacionesProcesoExistente = `
          UPDATE detalle_proceso
          SET observaciones = CASE 
                WHEN observaciones IS NULL OR observaciones = '' THEN $2
                ELSE observaciones || E'\n' || $2
              END
          WHERE id_detalle_proceso = $1
        `;
        await pool.query(updateObservacionesProcesoExistente, [
          idDetalleProcesoSiguiente, 
          observacionesNuevoProceso
        ]);
      } else {
        // Si no existe, creamos un nuevo registro para el proceso siguiente
        const insertNuevoProcesoSiguiente = `
          INSERT INTO detalle_proceso (id_orden, id_proceso, cedula_empleado, fecha_inicio_proceso, observaciones)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
          RETURNING id_detalle_proceso
        `;
        const nuevoProcesoResult = await pool.query(insertNuevoProcesoSiguiente, [
          idOrden, 
          idProcesoSiguiente, 
          cedulaEmpleadoActual,
          observacionesNuevoProceso
        ]);
        
        idDetalleProcesoSiguiente = nuevoProcesoResult.rows[0].id_detalle_proceso;
      }

      // 5. Actualizamos cada producto individual para marcar su avance
      for (const item of itemsToAdvance) {
      // Crear registro que vincule el producto con el proceso siguiente
        const updateProductoProceso = `
          INSERT INTO producto_proceso (id_detalle_producto, id_detalle_proceso, cantidad)
          VALUES ($1, $2, $3)
          RETURNING *
        `;
        await pool.query(updateProductoProceso, [
          item.idDetalle,
          idDetalleProcesoSiguiente,
          item.cantidad
        ]);
        
        // Actualizar el estado del producto si todos sus items fueron avanzados
        const queryTotalProducto = `
          SELECT cantidad FROM detalle_producto_orden WHERE id_detalle = $1
        `;
        const totalProductoResult = await pool.query(queryTotalProducto, [item.idDetalle]);
        const cantidadTotal = totalProductoResult.rows[0]?.cantidad || 0;
        
        // Obtener cantidad total ya avanzada para este producto
        const queryAvanzado = `
          SELECT COALESCE(SUM(cantidad), 0) as cantidad_avanzada
          FROM producto_proceso
          WHERE id_detalle_producto = $1
        `;
        const avanzadoResult = await pool.query(queryAvanzado, [item.idDetalle]);
        const cantidadAvanzada = parseInt(avanzadoResult.rows[0]?.cantidad_avanzada || 0);
        
        // Si la cantidad avanzada es igual a la cantidad total, marcar como "En Siguiente Proceso"
        if (cantidadAvanzada >= cantidadTotal) {
          const updateEstadoProducto = `
            UPDATE detalle_producto_orden
            SET estado = 'En Siguiente Proceso'
            WHERE id_detalle = $1
          `;
          await pool.query(updateEstadoProducto, [item.idDetalle]);
        } else {
          // Si solo se ha avanzado parcialmente, marcar como "Parcialmente Avanzado"
          const updateEstadoProductoParcial = `
            UPDATE detalle_producto_orden
            SET estado = 'Parcialmente Avanzado'
            WHERE id_detalle = $1
          `;
          await pool.query(updateEstadoProductoParcial, [item.idDetalle]);
        }
      }

      // 6. Verificar si todos los productos del proceso actual han sido avanzados
      const queryProductosPendientes = `
        SELECT COUNT(*) as pendientes
        FROM detalle_producto_orden dpo
        WHERE dpo.id_orden = $1
        AND dpo.estado NOT IN ('En Siguiente Proceso', 'Finalizado')
        AND NOT EXISTS (
          SELECT 1 FROM producto_proceso pp
          JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
          WHERE pp.id_detalle_producto = dpo.id_detalle
          AND dp.id_proceso > $2
        )
      `;
      
      const pendientesResult = await pool.query(queryProductosPendientes, [idOrden, idProcesoActual]);
      const productosPendientes = parseInt(pendientesResult.rows[0].pendientes);
      
      // Si no quedan productos pendientes, marcar el proceso actual como completado
      if (productosPendientes === 0) {
        const completarProcesoActual = `
          UPDATE detalle_proceso
          SET estado = 'Completado',
              fecha_final_proceso = CURRENT_TIMESTAMP,
              observaciones = CASE 
                WHEN observaciones IS NULL OR observaciones = '' THEN $3
                ELSE observaciones || E'\n' || $3
              END
          WHERE id_orden = $1 AND id_proceso = $2 AND estado = 'En Proceso'
        `;
        
        const mensajeCompletado = `[${new Date().toLocaleString()}] Proceso completado automáticamente: todos los productos han sido avanzados al siguiente proceso.`;
        await pool.query(completarProcesoActual, [idOrden, idProcesoActual, mensajeCompletado]);
      }

      // Confirmar transacción
      await pool.query('COMMIT');
      
      return {
        idDetalleProcesoSiguiente,
        itemsAdvanced: itemsToAdvance.length,
        success: true
      };
    } catch (error) {
      // Revertir transacción en caso de error
      await pool.query('ROLLBACK');
      throw new Error(`Error al avanzar parcialmente la orden: ${error.message}`);
    }
  },

  // Get product details for an order
  getOrderProductDetails: async (idOrden) => {
    try {
      const query = `
        WITH procesos_por_producto AS (
          SELECT 
            pp.id_detalle_producto,
            dp.id_proceso,
            ep.nombre as nombre_proceso,
            pp.cantidad,
            dp.id_detalle_proceso,
            dp.estado as estado_proceso
          FROM producto_proceso pp
          JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
          JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
          WHERE dp.id_orden = $1 AND dp.estado = 'En Proceso'
        )
        SELECT 
          dpo.id_detalle,
          dpo.id_producto,
          p.nombre_producto,
          dpo.cantidad,
          dpo.estado,
          dpo.observacion,
          c.nombre_categoria,
          CASE 
            WHEN ppp.nombre_proceso IS NOT NULL THEN 
              JSON_BUILD_OBJECT(
                'id_proceso', ppp.id_proceso,
                'nombre_proceso', ppp.nombre_proceso,
                'cantidad', ppp.cantidad,
                'id_detalle_proceso', ppp.id_detalle_proceso
              )
            ELSE NULL
          END as proceso_actual
        FROM detalle_producto_orden dpo
        JOIN producto p ON dpo.id_producto = p.id_producto
        JOIN categoria c ON p.id_categoria = c.id_categoria
        LEFT JOIN procesos_por_producto ppp ON dpo.id_detalle = ppp.id_detalle_producto
        WHERE dpo.id_orden = $1
        ORDER BY dpo.id_detalle
      `;
      
      const result = await pool.query(query, [idOrden]);
      return result.rows;
    } catch (error) {
      throw new Error(`Error al obtener detalles de productos de la orden: ${error.message}`);
    }
  },

  advancePartialOrderToNextProcess: async (idOrden, idProcesoActual, idProcesoSiguiente, cedulaEmpleadoActual, itemsToAdvance, observaciones = '') => {
    try {
      // Iniciar transacción
      await pool.query('BEGIN');

      // 1. Validar que los productos existen en la orden y están en el proceso actual
      const queryValidateProducts = `
        WITH productos_en_proceso_actual AS (
          SELECT 
            dpo.id_detalle,
            dpo.cantidad,
            COALESCE(
              (SELECT SUM(pp.cantidad) 
              FROM producto_proceso pp
              JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
              WHERE pp.id_detalle_producto = dpo.id_detalle 
              AND dp.id_proceso = $2
              AND dp.estado = 'En Proceso'), 0
            ) as cantidad_en_proceso_actual
          FROM detalle_producto_orden dpo
          WHERE dpo.id_orden = $1
        )
        SELECT 
          id_detalle, 
          cantidad, 
          cantidad_en_proceso_actual,
          (cantidad - cantidad_en_proceso_actual) as disponible_para_avanzar
        FROM productos_en_proceso_actual
        WHERE id_detalle IN (${itemsToAdvance.map((_, i) => `$${i + 3}`).join(',')})
      `;
      
      const validProducts = await pool.query(
        queryValidateProducts, 
        [idOrden, idProcesoActual, ...itemsToAdvance.map(item => item.idDetalle)]
      );
      
      if (validProducts.rows.length !== itemsToAdvance.length) {
        throw new Error('Algunos productos seleccionados no existen en esta orden');
      }

      // Validar que tenemos suficiente cantidad disponible para avanzar
      for (const item of itemsToAdvance) {
        const producto = validProducts.rows.find(p => p.id_detalle == item.idDetalle);
        if (!producto) {
          throw new Error(`Producto con ID ${item.idDetalle} no encontrado en la orden`);
        }
        
        if (item.cantidad > producto.disponible_para_avanzar) {
          throw new Error(`No hay suficiente cantidad disponible para avanzar el producto ${item.idDetalle}. Solicitado: ${item.cantidad}, Disponible: ${producto.disponible_para_avanzar}`);
        }
      }

      // 2. Obtener el detalle de proceso actual
      const queryDetalleProcesoActual = `
        SELECT id_detalle_proceso, observaciones
        FROM detalle_proceso
        WHERE id_orden = $1 AND id_proceso = $2 AND estado = 'En Proceso'
      `;
      const detalleProcesoActual = await pool.query(queryDetalleProcesoActual, [idOrden, idProcesoActual]);
      
      if (detalleProcesoActual.rows.length === 0) {
        throw new Error('No existe un proceso activo para esta orden en la etapa indicada');
      }
      
      const { id_detalle_proceso: idDetalleProcesoActual, observaciones: observacionesAnteriores } = detalleProcesoActual.rows[0];

      // 3. Preparar las observaciones para el nuevo proceso
      let observacionesNuevoProceso = '';
      
      if (observaciones && observaciones.length > 0) {
        const nombreProcesoActualQuery = `SELECT nombre FROM estado_proceso WHERE id_proceso = $1`;
        const nombreProcesoResult = await pool.query(nombreProcesoActualQuery, [idProcesoActual]);
        const nombreProcesoActual = nombreProcesoResult.rows[0]?.nombre || 'Proceso anterior';
        
        const fechaActual = new Date().toLocaleString();
        const productosAvanzados = itemsToAdvance.map(item => `ID:${item.idDetalle}(${item.cantidad})`).join(', ');
        const nuevaObservacion = `[${fechaActual} - ${nombreProcesoActual}]: Avance parcial - Productos: ${productosAvanzados}. ${observaciones}`;
        
        observacionesNuevoProceso = nuevaObservacion;
      }

      // 4. Buscar si ya existe un registro de proceso para el siguiente paso
      const queryBuscarProcesoSiguiente = `
        SELECT id_detalle_proceso, observaciones
        FROM detalle_proceso
        WHERE id_orden = $1 AND id_proceso = $2 AND estado = 'En Proceso'
      `;
      const procesoSiguienteExistente = await pool.query(queryBuscarProcesoSiguiente, [idOrden, idProcesoSiguiente]);
      
      let idDetalleProcesoSiguiente;
      
      if (procesoSiguienteExistente.rows.length > 0) {
        // Si ya existe un registro para el proceso siguiente, utilizamos ese
        idDetalleProcesoSiguiente = procesoSiguienteExistente.rows[0].id_detalle_proceso;
        
        // Actualizar las observaciones del proceso existente
        if (observacionesNuevoProceso) {
          const updateObservacionesProcesoExistente = `
            UPDATE detalle_proceso
            SET observaciones = CASE 
                  WHEN observaciones IS NULL OR observaciones = '' THEN $2
                  ELSE observaciones || E'\n' || $2
                END
            WHERE id_detalle_proceso = $1
          `;
          await pool.query(updateObservacionesProcesoExistente, [
            idDetalleProcesoSiguiente, 
            observacionesNuevoProceso
          ]);
        }
      } else {
        // Si no existe, creamos un nuevo registro para el proceso siguiente
        const insertNuevoProcesoSiguiente = `
          INSERT INTO detalle_proceso (id_orden, id_proceso, cedula_empleado, fecha_inicio_proceso, observaciones)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
          RETURNING id_detalle_proceso
        `;
        const nuevoProcesoResult = await pool.query(insertNuevoProcesoSiguiente, [
          idOrden, 
          idProcesoSiguiente, 
          cedulaEmpleadoActual,
          observacionesNuevoProceso
        ]);
        
        idDetalleProcesoSiguiente = nuevoProcesoResult.rows[0].id_detalle_proceso;
      }

      // 5. Avanzar cada producto eliminándolo del proceso actual y agregándolo al siguiente
      for (const item of itemsToAdvance) {
        // Registrar el producto en el nuevo proceso
        const insertProductoProcesoSiguiente = `
          INSERT INTO producto_proceso (id_detalle_producto, id_detalle_proceso, cantidad)
          VALUES ($1, $2, $3)
          RETURNING *
        `;
        await pool.query(insertProductoProcesoSiguiente, [
          item.idDetalle,
          idDetalleProcesoSiguiente,
          item.cantidad
        ]);
        
        // Actualizar el estado del producto según la cantidad total y avanzada
        const queryTotalProducto = `
          SELECT cantidad FROM detalle_producto_orden WHERE id_detalle = $1
        `;
        const totalProductoResult = await pool.query(queryTotalProducto, [item.idDetalle]);
        const cantidadTotal = parseInt(totalProductoResult.rows[0]?.cantidad || 0);
        
        // Obtener la cantidad total avanzada a cualquier proceso posterior al actual
        const queryTotalAvanzado = `
          SELECT COALESCE(SUM(pp.cantidad), 0) as total_avanzado
          FROM producto_proceso pp
          JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
          WHERE pp.id_detalle_producto = $1
          AND dp.id_proceso > $2
        `;
        const totalAvanzadoResult = await pool.query(queryTotalAvanzado, [item.idDetalle, idProcesoActual]);
        const cantidadTotalAvanzada = parseInt(totalAvanzadoResult.rows[0]?.total_avanzado || 0);
        
        // Actualizar el estado del producto según la cantidad avanzada
        let nuevoEstado;
        if (cantidadTotalAvanzada >= cantidadTotal) {
          nuevoEstado = 'En Siguiente Proceso';
        } else if (cantidadTotalAvanzada > 0) {
          nuevoEstado = 'Parcialmente Avanzado';
        } else {
          nuevoEstado = 'En Producción';
        }
        
        const updateEstadoProducto = `
          UPDATE detalle_producto_orden
          SET estado = $2
          WHERE id_detalle = $1
        `;
        await pool.query(updateEstadoProducto, [item.idDetalle, nuevoEstado]);
      }

      // 6. Verificar si todos los productos han sido completamente avanzados del proceso actual
      const queryProductosPendientes = `
        WITH productos_orden AS (
          SELECT 
            dpo.id_detalle,
            dpo.cantidad as cantidad_total
          FROM detalle_producto_orden dpo
          WHERE dpo.id_orden = $1
        ),
        productos_avanzados AS (
          SELECT 
            pp.id_detalle_producto,
            SUM(pp.cantidad) as cantidad_avanzada
          FROM producto_proceso pp
          JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
          WHERE dp.id_orden = $1 AND dp.id_proceso > $2
          GROUP BY pp.id_detalle_producto
        )
        SELECT COUNT(*) as pendientes
        FROM productos_orden po
        LEFT JOIN productos_avanzados pa ON po.id_detalle = pa.id_detalle_producto
        WHERE COALESCE(pa.cantidad_avanzada, 0) < po.cantidad_total
      `;
      
      const pendientesResult = await pool.query(queryProductosPendientes, [idOrden, idProcesoActual]);
      const productosPendientes = parseInt(pendientesResult.rows[0].pendientes);
      
      // Si no quedan productos pendientes, marcar el proceso actual como completado
      if (productosPendientes === 0) {
        const completarProcesoActual = `
          UPDATE detalle_proceso
          SET estado = 'Completado',
              fecha_final_proceso = CURRENT_TIMESTAMP,
              observaciones = CASE 
                WHEN observaciones IS NULL OR observaciones = '' THEN $3
                ELSE observaciones || E'\n' || $3
              END
          WHERE id_orden = $1 AND id_proceso = $2 AND estado = 'En Proceso'
        `;
        
        const mensajeCompletado = `[${new Date().toLocaleString()}] Proceso completado automáticamente: todos los productos han sido avanzados al siguiente proceso.`;
        await pool.query(completarProcesoActual, [idOrden, idProcesoActual, mensajeCompletado]);
      }

      // Confirmar transacción
      await pool.query('COMMIT');
      
      return {
        idDetalleProcesoSiguiente,
        itemsAdvanced: itemsToAdvance.length,
        success: true
      };
    } catch (error) {
      // Revertir transacción en caso de error
      await pool.query('ROLLBACK');
      throw new Error(`Error al avanzar parcialmente la orden: ${error.message}`);
    }
  },

  completeOrder: async (idOrden, cedulaEmpleado, observaciones = '') => {
    try {
      // Iniciar transacción
      await pool.query('BEGIN');
      
      // 1. Obtener el detalle de proceso actual que está en progreso
      const queryDetalleActual = `
        SELECT dp.id_detalle_proceso, dp.id_proceso, dp.observaciones
        FROM detalle_proceso dp
        WHERE dp.id_orden = $1 AND dp.estado = 'En Proceso'
        LIMIT 1
      `;
      const detalleActual = await pool.query(queryDetalleActual, [idOrden]);
      
      if (detalleActual.rows.length === 0) {
        throw new Error('No se encontró un proceso activo para esta orden');
      }
      
      const { id_detalle_proceso, observaciones: observacionesAnteriores } = detalleActual.rows[0];
      
      // 2. Preparar las observaciones finales
      let observacionesFinales = observacionesAnteriores || '';
      
      if (observaciones && observaciones.length > 0) {
        const nombreProcesoActualQuery = `SELECT nombre FROM estado_proceso WHERE id_proceso = (SELECT id_proceso FROM detalle_proceso WHERE id_detalle_proceso = $1)`;
        const nombreProcesoResult = await pool.query(nombreProcesoActualQuery, [id_detalle_proceso]);
        const nombreProcesoActual = nombreProcesoResult.rows[0]?.nombre || 'Proceso final';
        
        const fechaActual = new Date().toLocaleString();
        const nuevaObservacion = `[${fechaActual} - ${nombreProcesoActual} - FINALIZACIÓN]: ${observaciones}`;
        
        observacionesFinales = observacionesFinales 
          ? `${observacionesFinales}\n${nuevaObservacion}`
          : nuevaObservacion;
      }
      
      // 3. Actualizar el detalle de proceso actual a "Completado"
      const updateDetalle = `
        UPDATE detalle_proceso
        SET estado = 'Completado', 
            fecha_final_proceso = CURRENT_TIMESTAMP,
            cedula_empleado = $2,
            observaciones = $3
        WHERE id_detalle_proceso = $1
        RETURNING *
      `;
      const procesoCompletado = await pool.query(updateDetalle, [
        id_detalle_proceso, 
        cedulaEmpleado, 
        observacionesFinales
      ]);
      
      // 4. Actualizar el estado de los productos de la orden a "Finalizado"
      const updateDetalleProductos = `
        UPDATE detalle_producto_orden
        SET estado = 'Finalizado'
        WHERE id_orden = $1
        RETURNING *
      `;
      await pool.query(updateDetalleProductos, [idOrden]);
      
      // 5. Añadir una observación general a la orden de producción
      const updateObservacionesOrden = `
        UPDATE orden_produccion
        SET observaciones = CASE 
              WHEN observaciones IS NULL OR observaciones = '' THEN $2
              ELSE observaciones || E'\n' || $2
            END
        WHERE id_orden = $1
        RETURNING *
      `;
      
      const mensajeFinalizacion = `[${new Date().toLocaleString()} - Finalización] Orden completada por empleado ${cedulaEmpleado}`;
      const ordenFinalizada = await pool.query(updateObservacionesOrden, [idOrden, mensajeFinalizacion]);
      
      // Confirmar transacción
      await pool.query('COMMIT');
      
      return {
        ...ordenFinalizada.rows[0],
        proceso_completado: procesoCompletado.rows[0]
      };
    } catch (error) {
      // Revertir transacción en caso de error
      await pool.query('ROLLBACK');
      throw new Error(`Error al finalizar la orden: ${error.message}`);
    }
  },

  
  getOrderDetails: async (idOrden) => {
    try {
      // Obtener información de la orden
      const queryOrden = `
        SELECT op.*, c.nombre as nombre_cliente
        FROM orden_produccion op
        JOIN cliente c ON op.id_cliente = c.id_cliente
        WHERE op.id_orden = $1
      `;
      const orden = await pool.query(queryOrden, [idOrden]);
      
      if (orden.rows.length === 0) {
        throw new Error('Orden no encontrada');
      }
      
      // Obtener historial de procesos
      const queryProcesos = `
        SELECT dp.*, ep.nombre as nombre_proceso, 
              e.nombre as nombre_empleado, e.apellidos as apellidos_empleado
        FROM detalle_proceso dp
        JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
        JOIN empleado e ON dp.cedula_empleado = e.cedula
        WHERE dp.id_orden = $1
        ORDER BY dp.fecha_inicio_proceso ASC
      `;
      const procesos = await pool.query(queryProcesos, [idOrden]);
      
      // Obtener productos de la orden
      const queryProductos = `
        SELECT 
          dpo.id_detalle,
          dpo.id_producto,
          p.nombre_producto,
          dpo.cantidad,
          dpo.estado,
          dpo.observacion,
          dpo.bordado,
          dpo.atributosUsuario,
          dpo.url_producto,
          c.nombre_categoria,
          c.id_categoria,
          (
            SELECT JSON_AGG(
              JSONB_BUILD_OBJECT(
                'id_detalle_proceso', pp.id_detalle_proceso,
                'id_proceso', dp.id_proceso,
                'nombre_proceso', ep.nombre,
                'cantidad', pp.cantidad,
                'fecha_registro', pp.fecha_registro,
                'estado_proceso', dp.estado
              )
            )
            FROM producto_proceso pp
            JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
            JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
            WHERE pp.id_detalle_producto = dpo.id_detalle
          ) as historial_procesos
        FROM detalle_producto_orden dpo
        JOIN producto p ON dpo.id_producto = p.id_producto
        JOIN categoria c ON p.id_categoria = c.id_categoria
        WHERE dpo.id_orden = $1
        ORDER BY dpo.id_detalle
      `;
      const productos = await pool.query(queryProductos, [idOrden]);
      
      return {
        orden: orden.rows[0],
        procesos: procesos.rows,
        productos: productos.rows
      };
    } catch (error) {
      throw new Error(`Error al obtener detalles de la orden: ${error.message}`);
    }
  },

  getAllOrders: async () => {
    try {
      const query = `
        SELECT 
          op.id_orden as numero_orden, 
          c.nombre as nombre_cliente,
          ep.nombre as nombre_proceso,
          dp.id_detalle_proceso,
          dp.fecha_inicio_proceso,
          dp.estado as estado_proceso, 
          dp.observaciones,
          dp.fecha_final_proceso,
          e.nombre as nombre_empleado,
          e.apellidos as apellidos_empleado
        FROM orden_produccion op
        JOIN detalle_proceso dp ON op.id_orden = dp.id_orden
        JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
        JOIN cliente c ON op.id_cliente = c.id_cliente
        JOIN empleado e ON dp.cedula_empleado = e.cedula
        WHERE dp.estado = 'En Proceso'
        ORDER BY dp.fecha_inicio_proceso ASC
      `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Error al obtener todas las órdenes: ${error.message}`);
    }
  },

  getCompletedOrders: async () => {
    try {
      const query = `
        SELECT 
          op.id_orden as numero_orden, 
          c.nombre as nombre_cliente,
          MAX(dp.fecha_final_proceso) as fecha_finalizacion,
          STRING_AGG(DISTINCT e.nombre || ' ' || e.apellidos, ', ') as empleados_involucrados
        FROM orden_produccion op
        JOIN detalle_proceso dp ON op.id_orden = dp.id_orden
        JOIN cliente c ON op.id_cliente = c.id_cliente
        JOIN empleado e ON dp.cedula_empleado = e.cedula
        WHERE NOT EXISTS (
          SELECT 1 FROM detalle_proceso dp2
          WHERE dp2.id_orden = op.id_orden AND dp2.estado = 'En Proceso'
        )
        AND EXISTS (
          SELECT 1 FROM detalle_producto_orden dpo
          WHERE dpo.id_orden = op.id_orden AND dpo.estado = 'Finalizado'
        )
        GROUP BY op.id_orden, c.nombre
        ORDER BY fecha_finalizacion DESC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Error al obtener órdenes completadas: ${error.message}`);
    }
  },

  getProductsInProcess: async (idOrden, idProceso) => {
    try {
      const query = `
        WITH productos_totales AS (
          SELECT 
            dpo.id_detalle,
            dpo.id_producto,
            p.nombre_producto,
            dpo.cantidad as cantidad_total,
            dpo.estado,
            c.nombre_categoria
          FROM detalle_producto_orden dpo
          JOIN producto p ON dpo.id_producto = p.id_producto
          JOIN categoria c ON p.id_categoria = c.id_categoria
          WHERE dpo.id_orden = $1
        ),
        productos_en_proceso AS (
          SELECT 
            pp.id_detalle_producto,
            SUM(pp.cantidad) as cantidad_en_proceso
          FROM producto_proceso pp
          JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
          WHERE dp.id_orden = $1 AND dp.id_proceso = $2 AND dp.estado = 'En Proceso'
          GROUP BY pp.id_detalle_producto
        ),
        productos_en_procesos_posteriores AS (
          SELECT 
            pp.id_detalle_producto,
            SUM(pp.cantidad) as cantidad_en_procesos_posteriores
          FROM producto_proceso pp
          JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
          WHERE dp.id_orden = $1 AND dp.id_proceso > $2
          GROUP BY pp.id_detalle_producto
        )
        SELECT 
          pt.*,
          COALESCE(pep.cantidad_en_proceso, 0) as cantidad_en_proceso,
          COALESCE(pepp.cantidad_en_procesos_posteriores, 0) as cantidad_en_procesos_posteriores,
          (
            pt.cantidad_total - 
            COALESCE(pep.cantidad_en_proceso, 0) - 
            COALESCE(pepp.cantidad_en_procesos_posteriores, 0)
          ) as cantidad_en_procesos_anteriores
        FROM productos_totales pt
        LEFT JOIN productos_en_proceso pep ON pt.id_detalle = pep.id_detalle_producto
        LEFT JOIN productos_en_procesos_posteriores pepp ON pt.id_detalle = pepp.id_detalle_producto
        WHERE COALESCE(pep.cantidad_en_proceso, 0) > 0
        ORDER BY pt.id_detalle
      `;
      
      const result = await pool.query(query, [idOrden, idProceso]);
      return result.rows;
    } catch (error) {
      throw new Error(`Error al obtener productos en proceso: ${error.message}`);
    }
  },

  getProductMovementHistory: async (idDetalle) => {
    try {
      const query = `
        SELECT 
          pp.id_producto_proceso,
          pp.cantidad,
          pp.fecha_registro,
          dp.id_proceso,
          ep.nombre as nombre_proceso,
          dp.fecha_inicio_proceso,
          dp.fecha_final_proceso,
          dp.estado as estado_proceso,
          e.nombre || ' ' || e.apellidos as empleado
        FROM producto_proceso pp
        JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
        JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
        JOIN empleado e ON dp.cedula_empleado = e.cedula
        WHERE pp.id_detalle_producto = $1
        ORDER BY pp.fecha_registro ASC
      `;
      
      const result = await pool.query(query, [idDetalle]);
      return result.rows;
    } catch (error) {
      throw new Error(`Error al obtener historial de movimiento del producto: ${error.message}`);
    }
  }

};

module.exports = {
  UserModel,
  OrderModel
};