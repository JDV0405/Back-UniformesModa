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

  advanceOrderToNextProcess: async (idDetalleProcesoActual, idProcesoSiguiente, cedulaEmpleadoActual, cedulaEmpleadoSiguiente = null, observaciones = '') => {
    try {
      // Iniciar transacción
      await pool.query('BEGIN');

      // 1. Obtener información del detalle de proceso actual, incluyendo observaciones
      const queryActual = `
        SELECT id_orden, id_proceso, observaciones
        FROM detalle_proceso
        WHERE id_detalle_proceso = $1 AND estado = 'En Proceso'
      `;
      const procesoActual = await pool.query(queryActual, [idDetalleProcesoActual]);
      
      if (procesoActual.rows.length === 0) {
        throw new Error('Detalle de proceso no encontrado o ya finalizado');
      }
      
      const { id_orden, observaciones: observacionesAnteriores } = procesoActual.rows[0];
      
      // 2. Marcar el proceso actual como completado y registrar quién lo completó
      const updateActual = `
        UPDATE detalle_proceso
        SET estado = 'Completado', 
            fecha_final_proceso = CURRENT_TIMESTAMP,
            cedula_empleado = $2,
            observaciones = CASE WHEN LENGTH($3) > 0 THEN $3 ELSE observaciones END
        WHERE id_detalle_proceso = $1
        RETURNING *
      `;
      await pool.query(updateActual, [
        idDetalleProcesoActual, 
        cedulaEmpleadoActual, 
        observaciones
      ]);
      
      // 3. Si no se proporciona un empleado específico para el siguiente proceso, buscar uno automáticamente
      let empleadoAsignado = cedulaEmpleadoSiguiente;
      
      if (!empleadoAsignado) {
        // Buscar un empleado que trabaje en el proceso siguiente
        const queryEmpleado = `
          SELECT e.cedula 
          FROM empleado e
          JOIN rol r ON e.id_rol = r.id_rol
          WHERE r.nombre_rol = (
            SELECT nombre FROM estado_proceso WHERE id_proceso = $1
          )
          AND e.estado = true
          LIMIT 1
        `;
        const empleadoResult = await pool.query(queryEmpleado, [idProcesoSiguiente]);
        
        if (empleadoResult.rows.length > 0) {
          empleadoAsignado = empleadoResult.rows[0].cedula;
        } else {
          // Si no encontramos un empleado específico, usamos el mismo que completó el proceso anterior
          empleadoAsignado = cedulaEmpleadoActual;
        }
      }

      // 4. Preparar las observaciones para el nuevo proceso (mantener historial)
      // Si hay observaciones nuevas y anteriores, combinarlas. Si no, mantener las anteriores
      let observacionesNuevoProceso = observacionesAnteriores || '';
      
      if (observaciones && observaciones.length > 0) {
        // Agregar la nueva observación con fecha y nombre del proceso actual
        const nombreProcesoActualQuery = `SELECT nombre FROM estado_proceso WHERE id_proceso = (SELECT id_proceso FROM detalle_proceso WHERE id_detalle_proceso = $1)`;
        const nombreProcesoResult = await pool.query(nombreProcesoActualQuery, [idDetalleProcesoActual]);
        const nombreProcesoActual = nombreProcesoResult.rows[0]?.nombre || 'Proceso anterior';
        
        const fechaActual = new Date().toLocaleString();
        const nuevaObservacion = `[${fechaActual} - ${nombreProcesoActual}]: ${observaciones}`;
        
        observacionesNuevoProceso = observacionesNuevoProceso 
          ? `${observacionesNuevoProceso}\n${nuevaObservacion}`
          : nuevaObservacion;
      }
      
      // 5. Insertar nuevo detalle de proceso para el siguiente proceso con las observaciones heredadas
      const insertNuevo = `
        INSERT INTO detalle_proceso (id_orden, id_proceso, cedula_empleado, fecha_inicio_proceso, observaciones)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
        RETURNING *
      `;
      const nuevoDetalle = await pool.query(insertNuevo, [
        id_orden, 
        idProcesoSiguiente, 
        empleadoAsignado,
        observacionesNuevoProceso  // Pasamos las observaciones acumuladas
      ]);
      
      // Confirmar transacción
      await pool.query('COMMIT');
      
      return nuevoDetalle.rows[0];
    } catch (error) {
      // Revertir transacción en caso de error
      await pool.query('ROLLBACK');
      throw new Error(`Error al avanzar la orden: ${error.message}`);
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
      
      return {
        orden: orden.rows[0],
        procesos: procesos.rows
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

};

module.exports = {
  UserModel,
  OrderModel
};