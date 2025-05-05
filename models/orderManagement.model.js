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
  // Obtener órdenes asignadas a un empleado en un proceso específico
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

  // Mantenemos este método por compatibilidad pero será obsoleto
  getOrdersByEmployeeAndProcess: async (cedulaEmpleado, idProceso) => {
    // Simplemente llamamos al método actualizado, ignorando la cédula
    return OrderModel.getOrdersByProcess(idProceso);
  },

  // Obtener todas las órdenes en un proceso específico (para supervisores)
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

  // Avanzar una orden al siguiente proceso
advanceOrderToNextProcess: async (idDetalleProcesoActual, idProcesoSiguiente, cedulaEmpleadoSiguiente = null, observaciones = '') => {
  try {
    // Iniciar transacción
    await pool.query('BEGIN');

    // 1. Obtener información del detalle de proceso actual
    const queryActual = `
      SELECT id_orden, id_proceso
      FROM detalle_proceso
      WHERE id_detalle_proceso = $1 AND estado = 'En Proceso'
    `;
    const procesoActual = await pool.query(queryActual, [idDetalleProcesoActual]);
    
    if (procesoActual.rows.length === 0) {
      throw new Error('Detalle de proceso no encontrado o ya finalizado');
    }
    
    const { id_orden } = procesoActual.rows[0];
    
    // 2. Marcar el proceso actual como completado
    const updateActual = `
      UPDATE detalle_proceso
      SET estado = 'Completado', fecha_final_proceso = CURRENT_TIMESTAMP
      WHERE id_detalle_proceso = $1
      RETURNING *
    `;
    await pool.query(updateActual, [idDetalleProcesoActual]);
    
    // 3. Si no se proporciona un empleado específico, buscar uno del proceso siguiente
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
        const queryEmpleadoAnterior = `
          SELECT cedula_empleado 
          FROM detalle_proceso 
          WHERE id_detalle_proceso = $1
        `;
        const empleadoAnteriorResult = await pool.query(queryEmpleadoAnterior, [idDetalleProcesoActual]);
        empleadoAsignado = empleadoAnteriorResult.rows[0].cedula_empleado;
      }
    }
    
    // 4. Insertar nuevo detalle de proceso para el siguiente proceso
    const insertNuevo = `
      INSERT INTO detalle_proceso (id_orden, id_proceso, cedula_empleado, observaciones)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const nuevoDetalle = await pool.query(insertNuevo, [
      id_orden, 
      idProcesoSiguiente, 
      empleadoAsignado,
      observaciones
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

  // Obtener detalles completos de una orden
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
      
      // Obtener productos de la orden
      const queryProductos = `
        SELECT dpo.*, p.nombre as nombre_producto
        FROM detalle_producto_orden dpo
        JOIN producto p ON dpo.id_producto = p.id_producto
        WHERE dpo.id_orden = $1
      `;
      const productos = await pool.query(queryProductos, [idOrden]);
      
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
        productos: productos.rows,
        procesos: procesos.rows
      };
    } catch (error) {
      throw new Error(`Error al obtener detalles de la orden: ${error.message}`);
    }
  }
};

module.exports = {
  UserModel,
  OrderModel
};