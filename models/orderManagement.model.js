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

  updateOrder: async (idOrden, orderData) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Verificar que la orden existe
      const checkOrderQuery = await client.query(
        'SELECT id_orden, id_cliente FROM orden_produccion WHERE id_orden = $1',
        [idOrden]
      );
      
      if (checkOrderQuery.rows.length === 0) {
        throw new Error('Orden no encontrada');
      }
      
      const currentOrder = checkOrderQuery.rows[0];
      const idCliente = currentOrder.id_cliente;
      
      // 2. Actualizar datos básicos de la orden
      if (orderData.fecha_aproximada || orderData.tipo_pago || 
          orderData.observaciones !== undefined || 
          orderData.cedula_empleado_responsable || 
          orderData.id_comprobante_pago) {
        
        const updateFields = [];
        const updateValues = [];
        let paramCounter = 1;
        
        if (orderData.fecha_aproximada) {
          updateFields.push(`fecha_aproximada = $${paramCounter++}`);
          updateValues.push(orderData.fecha_aproximada);
        }
        
        if (orderData.tipo_pago) {
          updateFields.push(`tipo_pago = $${paramCounter++}`);
          updateValues.push(orderData.tipo_pago);
        }
        
        if (orderData.observaciones !== undefined) {
          updateFields.push(`observaciones = $${paramCounter++}`);
          updateValues.push(orderData.observaciones);
        }
        
        if (orderData.cedula_empleado_responsable) {
          updateFields.push(`cedula_empleado_responsable = $${paramCounter++}`);
          updateValues.push(orderData.cedula_empleado_responsable);
        }
        
        if (orderData.id_comprobante_pago) {
          updateFields.push(`id_comprobante_pago = $${paramCounter++}`);
          updateValues.push(orderData.id_comprobante_pago);
        }
        
        // Solo actualizamos si hay cambios
        if (updateFields.length > 0) {
          updateValues.push(idOrden); // Añadimos el ID de la orden como último parámetro
          
          await client.query(
            `UPDATE orden_produccion SET ${updateFields.join(', ')} WHERE id_orden = $${paramCounter}`,
            updateValues
          );
        }
      }
      
      // 3. Actualizar información del cliente si se proporciona
      if (orderData.cliente) {
        if (orderData.cliente.nombre || orderData.cliente.correo) {
          const updateClientFields = [];
          const updateClientValues = [];
          let clientParamCounter = 1;
          
          if (orderData.cliente.nombre) {
            updateClientFields.push(`nombre = $${clientParamCounter++}`);
            updateClientValues.push(orderData.cliente.nombre);
          }
          
          if (orderData.cliente.correo) {
            updateClientFields.push(`correo = $${clientParamCounter++}`);
            updateClientValues.push(orderData.cliente.correo);
          }
          
          if (updateClientFields.length > 0) {
            updateClientValues.push(idCliente);
            
            await client.query(
              `UPDATE cliente SET ${updateClientFields.join(', ')} WHERE id_cliente = $${clientParamCounter}`,
              updateClientValues
            );
          }
        }
        
        // 3.1 Actualizar datos específicos según el tipo de cliente
        const checkClientType = await client.query(
          'SELECT tipo FROM cliente WHERE id_cliente = $1',
          [idCliente]
        );
        
        const clientType = checkClientType.rows[0]?.tipo?.trim();
        
        if (clientType === 'Natural') {
          if (orderData.cliente.tipo_doc || orderData.cliente.profesion) {
            const updateNaturalFields = [];
            const updateNaturalValues = [];
            let naturalParamCounter = 1;
            
            if (orderData.cliente.tipo_doc) {
              updateNaturalFields.push(`tipo_doc = $${naturalParamCounter++}`);
              updateNaturalValues.push(orderData.cliente.tipo_doc);
            }
            
            if (orderData.cliente.profesion) {
              updateNaturalFields.push(`profesion = $${naturalParamCounter++}`);
              updateNaturalValues.push(orderData.cliente.profesion);
            }
            
            if (updateNaturalFields.length > 0) {
              updateNaturalValues.push(idCliente);
              
              await client.query(
                `UPDATE cli_natural SET ${updateNaturalFields.join(', ')} WHERE id_cliente = $${naturalParamCounter}`,
                updateNaturalValues
              );
            }
          }
        } else if (clientType === 'Juridico') {
          if (orderData.cliente.sector_economico) {
            await client.query(
              'UPDATE juridico SET sector_economico = $1 WHERE id_cliente = $2',
              [orderData.cliente.sector_economico, idCliente]
            );
          }
        }
      }
      
      // 4. Actualizar teléfono si se proporciona
      if (orderData.telefono) {
        // Verificar si el cliente ya tiene teléfono - buscar específicamente por número
        const checkPhone = await client.query(
          'SELECT id_telefono FROM telefono_cliente WHERE id_cliente = $1 ORDER BY id_telefono DESC LIMIT 1',
          [idCliente]
        );
        
        if (checkPhone.rows.length > 0) {
          // Actualizar teléfono existente
          await client.query(
            'UPDATE telefono_cliente SET telefono = $1, tipo = $2 WHERE id_telefono = $3',
            [orderData.telefono.numero, orderData.telefono.tipo, checkPhone.rows[0].id_telefono]
          );
          
          // Log para depuración
        } else {
          // Crear nuevo teléfono
          await client.query(
            'INSERT INTO telefono_cliente (id_cliente, telefono, tipo) VALUES ($1, $2, $3)',
            [idCliente, orderData.telefono.numero, orderData.telefono.tipo || 'Móvil']
          );
        }
      }
      
      // 5. Actualizar dirección si se proporciona
      if (orderData.direccion) {
        if (orderData.id_direccion) {
          // Actualizar dirección existente
          await client.query(
            'UPDATE direccion SET direccion = $1, id_ciudad = $2, observaciones = $3 WHERE id_direccion = $4',
            [
              orderData.direccion.direccion,
              orderData.direccion.id_ciudad,
              orderData.direccion.observaciones || '',
              orderData.id_direccion
            ]
          );
        } else {
          // Crear nueva dirección
          const newAddressResult = await client.query(
            'INSERT INTO direccion (id_cliente, direccion, id_ciudad, observaciones) VALUES ($1, $2, $3, $4) RETURNING id_direccion',
            [
              idCliente, 
              orderData.direccion.direccion, 
              orderData.direccion.id_ciudad,
              orderData.direccion.observaciones || ''
            ]
          );
          
          // Actualizar la orden con la nueva dirección
          await client.query(
            'UPDATE orden_produccion SET id_direccion = $1 WHERE id_orden = $2',
            [newAddressResult.rows[0].id_direccion, idOrden]
          );
        }
      }
      
      // 6. Actualizar productos (modificar existentes, añadir nuevos)
      if (orderData.productos && Array.isArray(orderData.productos)) {
        for (const producto of orderData.productos) {
          if (producto.id_detalle) {
            // Producto existente - actualizar
            const updateProductFields = [];
            const updateProductValues = [];
            let productParamCounter = 1;
            
            if (producto.cantidad) {
              updateProductFields.push(`cantidad = $${productParamCounter++}`);
              updateProductValues.push(producto.cantidad);
            }
            
            if (producto.atributosusuario) {
              updateProductFields.push(`atributosusuario = $${productParamCounter++}`);
              updateProductValues.push(producto.atributosusuario);
            }
            
            if (producto.bordado !== undefined) {
              updateProductFields.push(`bordado = $${productParamCounter++}`);
              updateProductValues.push(producto.bordado);
            }
            
            if (producto.observacion !== undefined) {
              updateProductFields.push(`observacion = $${productParamCounter++}`);
              updateProductValues.push(producto.observacion);
            }
            
            if (producto.url_producto !== undefined) {
              updateProductFields.push(`url_producto = $${productParamCounter++}`);
              updateProductValues.push(producto.url_producto);
            }
            
            if (updateProductFields.length > 0) {
              updateProductValues.push(producto.id_detalle);
              updateProductValues.push(idOrden);
              
              await client.query(
                `UPDATE detalle_producto_orden 
                SET ${updateProductFields.join(', ')} 
                WHERE id_detalle = $${productParamCounter++} 
                AND id_orden = $${productParamCounter}`, // CORREGIDO: Usar productParamCounter
                updateProductValues
              );
            }
          } else {
            // Producto nuevo - insertar
            await client.query(
              `INSERT INTO detalle_producto_orden 
              (id_orden, id_producto, cantidad, atributosusuario, bordado, observacion, url_producto, estado) 
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                idOrden,
                producto.id_producto,
                producto.cantidad || 1,
                producto.atributosusuario || {},
                producto.bordado || false,
                producto.observacion || '',
                producto.url_producto || null,
                'En Producción'
              ]
            );
          }
        }
      }
      
      // 7. Eliminar productos si se proporciona un array de IDs a eliminar
      if (orderData.productos_eliminar && Array.isArray(orderData.productos_eliminar)) {
        for (const idDetalle of orderData.productos_eliminar) {
          // Verificar si el producto puede ser eliminado
          const productProcessCheck = await client.query(
            `SELECT COUNT(*) FROM producto_proceso pp 
            WHERE pp.id_detalle_producto = $1`,
            [idDetalle]
          );
          
          if (parseInt(productProcessCheck.rows[0].count) === 0) {
            // Si no tiene procesos asociados, se puede eliminar
            await client.query(
              'DELETE FROM detalle_producto_orden WHERE id_detalle = $1 AND id_orden = $2',
              [idDetalle, idOrden]
            );
          } else {
            // Si tiene procesos asociados, no se puede eliminar directamente
            throw new Error(`No se puede eliminar el producto con ID ${idDetalle} porque tiene procesos asociados.`);
          }
        }
      }
      const phoneCheck = await client.query(
        'SELECT telefono FROM telefono_cliente WHERE id_cliente = $1',
        [idCliente]
      );
      await client.query('COMMIT');
      
      // Obtener la orden actualizada para devolverla
      return await OrderModel.getOrderDetails(idOrden);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Error al actualizar la orden: ${error.message}`);
    } finally {
      client.release();
    }
  }


};

module.exports = {
  UserModel,
  OrderModel
};