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


  getOrderDetails: async (idOrden) => {
    try {
      // 1. Obtener información de la orden
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
      
      // 2. Obtener historial de procesos
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

  updateOrderWithClient: async (idOrden, orderData) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Obtenemos la orden actual para saber el cliente asociado
      const existingOrder = await client.query(
        'SELECT id_cliente FROM orden_produccion WHERE id_orden = $1',
        [idOrden]
      );
      
      if (existingOrder.rows.length === 0) {
        throw new Error('Orden no encontrada');
      }
      
      const idCliente = existingOrder.rows[0].id_cliente;
      
      // 2. Actualizar datos del cliente si se proporcionan
      if (orderData.cliente) {
        const clienteQuery = `
          UPDATE cliente 
          SET nombre = $1, 
              correo = $2
          WHERE id_cliente = $3
          RETURNING *
        `;
        
        await client.query(clienteQuery, [
          orderData.cliente.nombre,
          orderData.cliente.correo,
          idCliente
        ]);
        
        // Actualizar datos específicos según tipo de cliente
        if (orderData.cliente.tipo === 'Natural') {
          await client.query(
            `UPDATE cli_natural 
             SET tipo_doc = $1, profesion = $2 
             WHERE id_cliente = $3`,
            [orderData.cliente.tipo_doc, orderData.cliente.profesion, idCliente]
          );
        } else if (orderData.cliente.tipo === 'Juridico') {
          await client.query(
            `UPDATE juridico 
             SET sector_economico = $1 
             WHERE id_cliente = $2`,
            [orderData.cliente.sector_economico, idCliente]
          );
        }
      }
      
      // 3. Actualizar, crear o eliminar teléfonos del cliente
      if (orderData.telefonos) {
        // Agregar o actualizar teléfonos
        for (const telefono of orderData.telefonos.agregar || []) {
          if (telefono.id_telefono) {
            // Actualizar existente
            await client.query(
              `UPDATE telefono_cliente 
               SET telefono = $1, tipo = $2 
               WHERE id_telefono = $3 AND id_cliente = $4`,
              [telefono.telefono, telefono.tipo, telefono.id_telefono, idCliente]
            );
          } else {
            // Añadir nuevo
            await client.query(
              `INSERT INTO telefono_cliente (id_cliente, telefono, tipo) 
               VALUES ($1, $2, $3)`,
              [idCliente, telefono.telefono, telefono.tipo]
            );
          }
        }
        
        // Eliminar teléfonos
        for (const idTelefono of orderData.telefonos.eliminar || []) {
          await client.query(
            'DELETE FROM telefono_cliente WHERE id_telefono = $1 AND id_cliente = $2',
            [idTelefono, idCliente]
          );
        }
      }
      
      // 4. Actualizar o crear dirección
      if (orderData.direccion) {
        if (orderData.direccion.id_direccion) {
          // Actualizar dirección existente
          await client.query(
            `UPDATE direccion 
             SET direccion = $1, id_ciudad = $2, observaciones = $3 
             WHERE id_direccion = $4 AND id_cliente = $5`,
            [
              orderData.direccion.direccion,
              orderData.direccion.id_ciudad,
              orderData.direccion.observaciones,
              orderData.direccion.id_direccion,
              idCliente
            ]
          );
        } else {
          // Crear nueva dirección
          const nuevaDireccion = await client.query(
            `INSERT INTO direccion (id_cliente, direccion, id_ciudad, observaciones) 
             VALUES ($1, $2, $3, $4) RETURNING id_direccion`,
            [
              idCliente, 
              orderData.direccion.direccion, 
              orderData.direccion.id_ciudad, 
              orderData.direccion.observaciones
            ]
          );
          
          // Actualizar la orden con la nueva dirección
          if (nuevaDireccion.rows[0]) {
            orderData.id_direccion = nuevaDireccion.rows[0].id_direccion;
          }
        }
      }
      
      // 5. Actualizar datos básicos de la orden
      const orderQuery = `
        UPDATE orden_produccion 
        SET 
          fecha_aproximada = $1,
          tipo_pago = $2,
          id_comprobante_pago = $3,
          observaciones = $4,
          id_direccion = $5,
          cedula_empleado_responsable = $6
        WHERE id_orden = $7
        RETURNING *
      `;
      
      await client.query(orderQuery, [
        orderData.fecha_aproximada,
        orderData.tipo_pago,
        orderData.id_comprobante_pago,
        orderData.observaciones,
        orderData.id_direccion,
        orderData.cedula_empleado_responsable,
        idOrden
      ]);
      
      // 6. Actualizar productos de la orden
      if (orderData.productos && Array.isArray(orderData.productos)) {
        for (const producto of orderData.productos) {
          if (producto.id_detalle) {
            // Actualizar producto existente
            await client.query(
              `UPDATE detalle_producto_orden
               SET cantidad = $1,
                   atributosUsuario = $2,
                   bordado = $3,
                   observacion = $4
               WHERE id_detalle = $5 AND id_orden = $6`,
              [
                producto.cantidad,
                producto.atributosUsuario,
                producto.bordado,
                producto.observacion,
                producto.id_detalle,
                idOrden
              ]
            );
          } else {
            // Insertar nuevo producto
            await client.query(
              `INSERT INTO detalle_producto_orden
                (id_orden, id_producto, cantidad, atributosUsuario, bordado, observacion, estado)
               VALUES
                ($1, $2, $3, $4, $5, $6, 'En Producción')`,
              [
                idOrden,
                producto.id_producto,
                producto.cantidad,
                producto.atributosUsuario,
                producto.bordado,
                producto.observacion
              ]
            );
          }
        }
      }
      
      // 7. Eliminar productos si se proporciona lista de IDs
      if (orderData.productosEliminar && Array.isArray(orderData.productosEliminar)) {
        for (const idDetalle of orderData.productosEliminar) {
          // Verificar si el producto está siendo procesado
          const checkResult = await client.query(
            `SELECT EXISTS(
               SELECT 1 FROM producto_proceso pp
               JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
               WHERE pp.id_detalle_producto = $1 AND dp.estado = 'En Proceso'
             ) as en_proceso`,
            [idDetalle]
          );
          
          if (checkResult.rows[0].en_proceso) {
            throw new Error(`No se puede eliminar el producto con ID ${idDetalle} porque está siendo procesado actualmente`);
          }
          
          // Eliminar el producto
          await client.query(
            'DELETE FROM detalle_producto_orden WHERE id_detalle = $1 AND id_orden = $2', 
            [idDetalle, idOrden]
          );
        }
      }
      
      await client.query('COMMIT');
      
      // Obtener datos actualizados de la orden con información del cliente
      const orderDetails = await OrderModel.getOrderDetails(idOrden);
      
      // Obtener teléfonos del cliente
      const phonesResult = await pool.query(
        'SELECT id_telefono, telefono, tipo FROM telefono_cliente WHERE id_cliente = $1',
        [idCliente]
      );
      
      // Obtener direcciones del cliente
      const addressesResult = await pool.query(
        `SELECT d.id_direccion, d.direccion, d.observaciones, 
                c.id_ciudad, c.ciudad, dep.id_departamento, dep.nombre as departamento
         FROM direccion d
         JOIN ciudad c ON d.id_ciudad = c.id_ciudad
         JOIN departamento dep ON c.id_departamento = dep.id_departamento
         WHERE d.id_cliente = $1`,
        [idCliente]
      );
      
      // Combinar toda la información
      return {
        ...orderDetails,
        telefonos: phonesResult.rows,
        direcciones: addressesResult.rows
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Error al actualizar la orden y cliente: ${error.message}`);
    } finally {
      client.release();
    }
  }



};

module.exports = {
  UserModel,
  OrderModel
};