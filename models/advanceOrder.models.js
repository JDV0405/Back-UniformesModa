const db = require('../database/db');

class AdvanceOrderModel {
  // Verifica si un producto de una orden ya está en un proceso específico
  async isProductInProcess(idDetalleProducto, idProceso) {
    try {
      const query = `
        SELECT COUNT(*) AS count
        FROM producto_proceso pp
        JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
        WHERE pp.id_detalle_producto = $1 AND dp.id_proceso = $2
      `;
      
      const result = await db.query(query, [idDetalleProducto, idProceso]);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      throw new Error(`Error al verificar si el producto está en el proceso: ${error.message}`);
    }
  }

  // Obtiene los detalles de productos de una orden específica
  async getOrderProducts(idOrden) {
    try {
      const query = `
        SELECT dpo.id_detalle, dpo.id_producto, p.nombre_producto, dpo.cantidad, dpo.estado
        FROM detalle_producto_orden dpo
        JOIN producto p ON dpo.id_producto = p.id_producto
        WHERE dpo.id_orden = $1
      `;
      
      const result = await db.query(query, [idOrden]);
      return result.rows;
    } catch (error) {
      throw new Error(`Error al obtener los productos de la orden: ${error.message}`);
    }
  }

  // Obtiene los productos que están actualmente en un proceso específico
  async getProductsInProcess(idOrden, idProceso) {
    try {
      const query = `
        SELECT dpo.id_detalle, dpo.id_producto, p.nombre_producto, pp.cantidad, 
              pp.id_producto_proceso, dp.id_detalle_proceso,
              pp.id_confeccionista,
              c.nombre as nombre_confeccionista,
              c.cedula as cedula_confeccionista,
              c.telefono as telefono_confeccionista
        FROM detalle_producto_orden dpo
        JOIN producto p ON dpo.id_producto = p.id_producto
        JOIN producto_proceso pp ON dpo.id_detalle = pp.id_detalle_producto
        JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
        LEFT JOIN confeccionista c ON pp.id_confeccionista = c.id_confeccionista
        WHERE dpo.id_orden = $1 AND dp.id_proceso = $2 AND dp.estado = 'En Proceso'
      `;
      
      const result = await db.query(query, [idOrden, idProceso]);
      return result.rows;
    } catch (error) {
      throw new Error(`Error al obtener los productos en el proceso: ${error.message}`);
    }
  }

  async validateConfeccionista(idConfeccionista) {
    try {
      const query = `
        SELECT id_confeccionista, nombre, activo
        FROM confeccionista
        WHERE id_confeccionista = $1
      `;
      
      const result = await db.query(query, [idConfeccionista]);
      
      if (result.rows.length === 0) {
        throw new Error(`No se encontró el confeccionista con ID ${idConfeccionista}`);
      }
      
      if (!result.rows[0].activo) {
        throw new Error(`El confeccionista ${result.rows[0].nombre} no está activo`);
      }
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Obtener todos los confeccionistas activos
  async getActiveConfeccionistas() {
    try {
      const query = `
        SELECT id_confeccionista, cedula, nombre, telefono
        FROM confeccionista
        WHERE activo = true
        ORDER BY nombre
      `;
      
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Error al obtener confeccionistas: ${error.message}`);
    }
  }

  async getProductsWithAllConfeccionistas(idOrden, idProceso) {
    try {
      const query = `
        SELECT 
          dpo.id_detalle, 
          dpo.id_producto, 
          p.nombre_producto, 
          pp.cantidad, 
          pp.id_producto_proceso, 
          dp.id_detalle_proceso,
          pp.id_confeccionista,
          c.nombre as nombre_confeccionista,
          c.telefono as telefono_confeccionista,
          c.cedula as cedula_confeccionista,
          -- Obtener cantidad total del producto en este proceso
          (SELECT SUM(pp2.cantidad) 
          FROM producto_proceso pp2 
          JOIN detalle_proceso dp2 ON pp2.id_detalle_proceso = dp2.id_detalle_proceso
          WHERE pp2.id_detalle_producto = dpo.id_detalle 
          AND dp2.id_proceso = $2 AND dp2.estado = 'En Proceso') as cantidad_total_proceso
        FROM detalle_producto_orden dpo
        JOIN producto p ON dpo.id_producto = p.id_producto
        JOIN producto_proceso pp ON dpo.id_detalle = pp.id_detalle_producto
        JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
        LEFT JOIN confeccionista c ON pp.id_confeccionista = c.id_confeccionista
        WHERE dpo.id_orden = $1 AND dp.id_proceso = $2 AND dp.estado = 'En Proceso'
        ORDER BY dpo.id_detalle, pp.id_confeccionista
      `;
      
      const result = await db.query(query, [idOrden, idProceso]);
      
      // Agrupar por producto y mostrar todos los confeccionistas asignados
      const productosAgrupados = {};
      
      result.rows.forEach(row => {
        const key = row.id_detalle;
        
        if (!productosAgrupados[key]) {
          productosAgrupados[key] = {
            id_detalle: row.id_detalle,
            id_producto: row.id_producto,
            nombre_producto: row.nombre_producto,
            cantidad_total_proceso: row.cantidad_total_proceso,
            confeccionistas: []
          };
        }
        
        if (row.id_confeccionista) {
          productosAgrupados[key].confeccionistas.push({
            id_confeccionista: row.id_confeccionista,
            nombre_confeccionista: row.nombre_confeccionista,
            telefono_confeccionista: row.telefono_confeccionista,
            cedula_confeccionista: row.cedula_confeccionista,
            cantidad_asignada: row.cantidad,
            id_producto_proceso: row.id_producto_proceso
          });
        }
      });
      
      return Object.values(productosAgrupados);
    } catch (error) {
      throw new Error(`Error al obtener productos con confeccionistas: ${error.message}`);
    }
  }

  // Verificar si estamos pasando de cortes a confección
  isTransitionFromCortesToConfeccion(idProcesoActual, idProcesoSiguiente) {
    // Asumiendo que el proceso de cortes es ID 2 y confección es ID 3
    // Ajusta estos IDs según tu configuración
    return parseInt(idProcesoActual) === 3 && parseInt(idProcesoSiguiente) === 4;
  }

  // Avanza productos al siguiente proceso con la nueva estructura de datos
  async advanceProductsToNextProcess(datos) {
    const { idOrden, idProcesoActual, idProcesoSiguiente, cedulaEmpleadoActual, itemsToAdvance, observaciones } = datos;
    
    try {
      await db.query('BEGIN');
      const isSolicitudToTrazos = parseInt(idProcesoActual) === 1 && parseInt(idProcesoSiguiente) === 2;
    
    // Si estamos pasando a trazos y moldes, actualizar la fecha aproximada
    if (isSolicitudToTrazos) {
      // Asumimos que la fecha aproximada es 15 días después de hoy (ajustar según sea necesario)
      const fechaAprox = new Date();
      fechaAprox.setDate(fechaAprox.getDate() + 40); // 15 días para la fecha aproximada
      
      await db.query(
        `UPDATE orden_produccion SET fecha_aproximada = $1 WHERE id_orden = $2`,
        [fechaAprox, idOrden]
      );
      
      // Podemos agregar una observación para registrar cuándo se asignó la fecha aproximada
      const fechaActual = new Date().toLocaleString('es-CO', { 
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit' 
      });
      
      const nuevaObservacion = observaciones ? 
        `${observaciones}\n\n[${fechaActual}] Fecha aproximada de entrega asignada: ${fechaAprox.toLocaleDateString('es-CO')}` : 
        `[${fechaActual}] Fecha aproximada de entrega asignada: ${fechaAprox.toLocaleDateString('es-CO')}`;
      
      datos.observaciones = nuevaObservacion;
    }
      // 1. Crear o obtener el detalle_proceso para el siguiente proceso
      let idDetalleProcesoSiguiente;
      const procesoSiguienteQuery = await db.query(
        `SELECT id_detalle_proceso, observaciones FROM detalle_proceso 
        WHERE id_orden = $1 AND id_proceso = $2 AND estado = 'En Proceso'`,
        [idOrden, idProcesoSiguiente]
      );
      
      if (procesoSiguienteQuery.rows.length > 0) {
        idDetalleProcesoSiguiente = procesoSiguienteQuery.rows[0].id_detalle_proceso;
        
        // NUEVA LÓGICA: Si hay observaciones nuevas, concatenarlas con las existentes
        if (observaciones && observaciones.trim() !== '') {
          const observacionesExistentes = procesoSiguienteQuery.rows[0].observaciones;
          let observacionesConcatenadas = '';
          
          if (observacionesExistentes && observacionesExistentes.trim() !== '') {
            // Obtener timestamp actual para la nueva observación
            const now = new Date();
            const timestamp = now.toLocaleString('es-CO', { 
              timeZone: 'America/Bogota',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
            
            observacionesConcatenadas = `${observacionesExistentes}\n\n[${timestamp}] ${observaciones}`;
          } else {
            // Si no hay observaciones previas, agregar timestamp a la nueva
            const now = new Date();
            const timestamp = now.toLocaleString('es-CO', { 
              timeZone: 'America/Bogota',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
            
            observacionesConcatenadas = `[${timestamp}] ${observaciones}`;
          }
          
          // Actualizar las observaciones concatenadas
          await db.query(
            `UPDATE detalle_proceso SET observaciones = $1 WHERE id_detalle_proceso = $2`,
            [observacionesConcatenadas, idDetalleProcesoSiguiente]
          );
        }
      } else {
        // Si no existe el proceso, crear uno nuevo con timestamp en la observación
        let observacionConTimestamp = '';
        if (observaciones && observaciones.trim() !== '') {
          const now = new Date();
          const timestamp = now.toLocaleString('es-CO', { 
            timeZone: 'America/Bogota',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          
          observacionConTimestamp = `[${timestamp}] ${observaciones}`;
        }
        
        const nuevoProcesoQuery = await db.query(
          `INSERT INTO detalle_proceso 
          (id_orden, id_proceso, cedula_empleado, observaciones) 
          VALUES ($1, $2, $3, $4) RETURNING id_detalle_proceso`,
          [idOrden, idProcesoSiguiente, cedulaEmpleadoActual, observacionConTimestamp]
        );
        idDetalleProcesoSiguiente = nuevoProcesoQuery.rows[0].id_detalle_proceso;
      }
      
      // Verificar si estamos pasando de cortes a confección
      const isCorteToConfeccion = parseInt(idProcesoActual) === 3 && parseInt(idProcesoSiguiente) === 4;
      
      // 2. Procesar cada producto (resto del código permanece igual)
      for (const item of itemsToAdvance) {
        const { idDetalle, cantidadAvanzar, idConfeccionista, idProductoProceso, fechaRecibido, fechaEntrega } = item;
        
        // NUEVA LÓGICA: Si viene de confección (proceso 4) y tiene idProductoProceso específico
        if (parseInt(idProcesoActual) === 4 && idProductoProceso) {
          // Obtener la cantidad específica de este producto_proceso
          const cantidadEspecificaQuery = await db.query(
            `SELECT pp.cantidad, pp.id_confeccionista
            FROM producto_proceso pp
            JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
            WHERE pp.id_producto_proceso = $1 AND dp.id_orden = $2 AND dp.id_proceso = $3 AND dp.estado = 'En Proceso'`,
            [idProductoProceso, idOrden, idProcesoActual]
          );
          
          if (cantidadEspecificaQuery.rows.length === 0) {
            throw new Error(`No se encontró el producto específico ${idProductoProceso} en el proceso actual`);
          }
          
          const cantidadEnProcesoActual = cantidadEspecificaQuery.rows[0].cantidad;
          const confeccionistaOriginal = cantidadEspecificaQuery.rows[0].id_confeccionista;
          
          if (cantidadAvanzar > cantidadEnProcesoActual) {
            throw new Error(`No se puede avanzar ${cantidadAvanzar} unidades. Solo hay ${cantidadEnProcesoActual} disponibles en esta asignación específica`);
          }
          
          // Avanzar al siguiente proceso (sin confeccionista ya que sale de confección)
          const existeEnSiguienteQuery = await db.query(
            `SELECT pp.id_producto_proceso, pp.cantidad
            FROM producto_proceso pp
            WHERE pp.id_detalle_producto = $1 AND pp.id_detalle_proceso = $2`,
            [idDetalle, idDetalleProcesoSiguiente]
          );
          
          if (existeEnSiguienteQuery.rows.length > 0) {
            const cantidadExistente = existeEnSiguienteQuery.rows[0].cantidad;
            const nuevaCantidad = cantidadExistente + cantidadAvanzar;
            
            await db.query(
              `UPDATE producto_proceso 
              SET cantidad = $1
              WHERE id_detalle_producto = $2 AND id_detalle_proceso = $3`,
              [nuevaCantidad, idDetalle, idDetalleProcesoSiguiente]
            );
          } else {
            await db.query(
              `INSERT INTO producto_proceso 
              (id_detalle_producto, id_detalle_proceso, cantidad) 
              VALUES ($1, $2, $3)`,
              [idDetalle, idDetalleProcesoSiguiente, cantidadAvanzar]
            );
          }
          
          // Actualizar o eliminar el registro específico en confección
          const nuevaCantidadProcesoActual = cantidadEnProcesoActual - cantidadAvanzar;
          
          if (nuevaCantidadProcesoActual === 0) {
            // Eliminar este registro específico
            await db.query(
              `DELETE FROM producto_proceso WHERE id_producto_proceso = $1`,
              [idProductoProceso]
            );
          } else {
            // Actualizar la cantidad de este registro específico
            await db.query(
              `UPDATE producto_proceso SET cantidad = $1 WHERE id_producto_proceso = $2`,
              [nuevaCantidadProcesoActual, idProductoProceso]
            );
          }
        } else {
          // LÓGICA ORIGINAL para otros procesos
          // Obtener la cantidad actual en el proceso actual
          let cantidadActualQuery;
          
          if (idConfeccionista && parseInt(idProcesoActual) === 4) {
            // Si estamos en confección y se especifica confeccionista
            cantidadActualQuery = await db.query(
              `SELECT pp.cantidad
              FROM producto_proceso pp
              JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
              WHERE pp.id_detalle_producto = $1 AND dp.id_orden = $2 AND dp.id_proceso = $3 
              AND dp.estado = 'En Proceso' AND pp.id_confeccionista = $4`,
              [idDetalle, idOrden, idProcesoActual, idConfeccionista]
            );
          } else {
            cantidadActualQuery = await db.query(
              `SELECT pp.cantidad
              FROM producto_proceso pp
              JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
              WHERE pp.id_detalle_producto = $1 AND dp.id_orden = $2 AND dp.id_proceso = $3 AND dp.estado = 'En Proceso'`,
              [idDetalle, idOrden, idProcesoActual]
            );
          }
          
          if (cantidadActualQuery.rows.length === 0) {
            throw new Error(`No se encontró el producto ${idDetalle} en el proceso actual`);
          }
          
          const cantidadEnProcesoActual = cantidadActualQuery.rows[0].cantidad;
          
          if (cantidadAvanzar > cantidadEnProcesoActual) {
            throw new Error(`No se puede avanzar ${cantidadAvanzar} unidades. Solo hay ${cantidadEnProcesoActual} disponibles`);
          }
          
          // Lógica para manejar destino (con o sin confeccionista)
          if (isCorteToConfeccion) {
            const existeConConfeccionistaQuery = await db.query(
              `SELECT pp.id_producto_proceso, pp.cantidad
              FROM producto_proceso pp
              WHERE pp.id_detalle_producto = $1 
              AND pp.id_detalle_proceso = $2 
              AND pp.id_confeccionista = $3`,
              [idDetalle, idDetalleProcesoSiguiente, idConfeccionista]
            );
            
            if (existeConConfeccionistaQuery.rows.length > 0) {
              const cantidadExistente = existeConConfeccionistaQuery.rows[0].cantidad;
              const nuevaCantidad = cantidadExistente + cantidadAvanzar;
              
              await db.query(
                `UPDATE producto_proceso 
                SET cantidad = $1, fecha_recibido = $2, fecha_entrega = $3
                WHERE id_detalle_producto = $4 
                AND id_detalle_proceso = $5 
                AND id_confeccionista = $6`,
                [nuevaCantidad, fechaRecibido, fechaEntrega, idDetalle, idDetalleProcesoSiguiente, idConfeccionista]
              );
            } else {
              await db.query(
                `INSERT INTO producto_proceso 
                (id_detalle_producto, id_detalle_proceso, cantidad, id_confeccionista, fecha_recibido, fecha_entrega) 
                VALUES ($1, $2, $3, $4, $5, $6)`,
                [idDetalle, idDetalleProcesoSiguiente, cantidadAvanzar, idConfeccionista, fechaRecibido, fechaEntrega]
              );
            }
          } else {
            // Para procesos que no son corte a confección
            const existeEnSiguienteQuery = await db.query(
              `SELECT pp.id_producto_proceso, pp.cantidad
              FROM producto_proceso pp
              WHERE pp.id_detalle_producto = $1 AND pp.id_detalle_proceso = $2`,
              [idDetalle, idDetalleProcesoSiguiente]
            );
            
            if (existeEnSiguienteQuery.rows.length > 0) {
              const cantidadExistente = existeEnSiguienteQuery.rows[0].cantidad;
              const nuevaCantidad = cantidadExistente + cantidadAvanzar;
              
              await db.query(
                `UPDATE producto_proceso 
                SET cantidad = $1
                WHERE id_detalle_producto = $2 AND id_detalle_proceso = $3`,
                [nuevaCantidad, idDetalle, idDetalleProcesoSiguiente]
              );
            } else {
              await db.query(
                `INSERT INTO producto_proceso 
                (id_detalle_producto, id_detalle_proceso, cantidad) 
                VALUES ($1, $2, $3)`,
                [idDetalle, idDetalleProcesoSiguiente, cantidadAvanzar]
              );
            }
          }
          
          // Actualizar la cantidad en el proceso actual
          const nuevaCantidadProcesoActual = cantidadEnProcesoActual - cantidadAvanzar;
          
          if (nuevaCantidadProcesoActual === 0) {
            // Si no queda cantidad, eliminar el registro del proceso actual
            if (idConfeccionista && parseInt(idProcesoActual) === 4) {
              await db.query(
                `DELETE FROM producto_proceso pp
                WHERE pp.id_detalle_producto = $1 
                AND pp.id_detalle_proceso IN (
                  SELECT dp.id_detalle_proceso 
                  FROM detalle_proceso dp 
                  WHERE dp.id_orden = $2 AND dp.id_proceso = $3 AND dp.estado = 'En Proceso'
                ) AND pp.id_confeccionista = $4`,
                [idDetalle, idOrden, idProcesoActual, idConfeccionista]
              );
            } else {
              await db.query(
                `DELETE FROM producto_proceso pp
                WHERE pp.id_detalle_producto = $1 
                AND pp.id_detalle_proceso IN (
                  SELECT dp.id_detalle_proceso 
                  FROM detalle_proceso dp 
                  WHERE dp.id_orden = $2 AND dp.id_proceso = $3 AND dp.estado = 'En Proceso'
                )`,
                [idDetalle, idOrden, idProcesoActual]
              );
            }
          } else {
            // Si queda cantidad, actualizar el registro
            if (idConfeccionista && parseInt(idProcesoActual) === 4) {
              await db.query(
                `UPDATE producto_proceso 
                SET cantidad = $1
                WHERE id_detalle_producto = $2 
                AND id_detalle_proceso IN (
                  SELECT dp.id_detalle_proceso 
                  FROM detalle_proceso dp 
                  WHERE dp.id_orden = $3 AND dp.id_proceso = $4 AND dp.estado = 'En Proceso'
                ) AND id_confeccionista = $5`,
                [nuevaCantidadProcesoActual, idDetalle, idOrden, idProcesoActual, idConfeccionista]
              );
            } else {
              await db.query(
                `UPDATE producto_proceso 
                SET cantidad = $1
                WHERE id_detalle_producto = $2 
                AND id_detalle_proceso IN (
                  SELECT dp.id_detalle_proceso 
                  FROM detalle_proceso dp 
                  WHERE dp.id_orden = $3 AND dp.id_proceso = $4 AND dp.estado = 'En Proceso'
                )`,
                [nuevaCantidadProcesoActual, idDetalle, idOrden, idProcesoActual]
              );
            }
          }
        }
      }
      
      // 3. Verificar si ya no quedan productos en el proceso actual
      const productosRestantesQuery = await db.query(
        `SELECT COUNT(*) as count
        FROM producto_proceso pp
        JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
        WHERE dp.id_orden = $1 AND dp.id_proceso = $2 AND dp.estado = 'En Proceso'`,
        [idOrden, idProcesoActual]
      );
      
      // Si no quedan productos en el proceso actual, cerramos ese proceso
      if (parseInt(productosRestantesQuery.rows[0].count) === 0) {
        await db.query(
          `UPDATE detalle_proceso 
          SET estado = 'Completado', fecha_final_proceso = CURRENT_TIMESTAMP 
          WHERE id_orden = $1 AND id_proceso = $2 AND estado = 'En Proceso'`,
          [idOrden, idProcesoActual]
        );
      }
      
      await db.query('COMMIT');
      return true;
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  // Obtener órdenes por proceso
  async getOrdersByProcess(idProceso) {
    try {
      const query = `
        WITH order_info AS (
          SELECT 
            op.id_orden,
            op.id_cliente,
            c.nombre AS nombre_cliente,
            ep.nombre AS nombre_proceso,
            dp.id_detalle_proceso,
            dp.fecha_inicio_proceso,
            dp.estado AS estado_proceso,
            dp.observaciones,
            dp.fecha_final_proceso,
            e.nombre AS nombre_empleado,
            e.apellidos AS apellidos_empleado
          FROM orden_produccion op
          JOIN detalle_proceso dp ON op.id_orden = dp.id_orden
          JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
          JOIN cliente c ON op.id_cliente = c.id_cliente
          JOIN empleado e ON dp.cedula_empleado = e.cedula
          WHERE dp.id_proceso = $1
        )
        SELECT 
          oi.*,
          dpo.id_detalle,
          dpo.id_producto,
          p.nombre_producto,
          dpo.cantidad,
          dpo.estado AS estado_producto,
          pp.id_producto_proceso
        FROM order_info oi
        LEFT JOIN detalle_producto_orden dpo ON oi.id_orden = dpo.id_orden
        LEFT JOIN producto p ON dpo.id_producto = p.id_producto
        LEFT JOIN producto_proceso pp ON dpo.id_detalle = pp.id_detalle_producto AND pp.id_detalle_proceso = oi.id_detalle_proceso
        ORDER BY oi.id_orden, dpo.id_detalle
      `;
      
      const result = await db.query(query, [idProceso]);
      
      // Procesamos el resultado para agrupar los productos por orden
      const orderMap = new Map();
      
      for (const row of result.rows) {
        const orderId = row.id_orden;
        
        if (!orderMap.has(orderId)) {
          // Creamos una nueva entrada para esta orden
          const orderInfo = {
            id_orden: row.id_orden,
            id_cliente: row.id_cliente,
            nombre_cliente: row.nombre_cliente,
            nombre_proceso: row.nombre_proceso,
            id_detalle_proceso: row.id_detalle_proceso,
            fecha_inicio_proceso: row.fecha_inicio_proceso,
            estado_proceso: row.estado_proceso,
            observaciones: row.observaciones,
            fecha_final_proceso: row.fecha_final_proceso,
            nombre_empleado: row.nombre_empleado,
            apellidos_empleado: row.apellidos_empleado,
            productos: []
          };
          
          orderMap.set(orderId, orderInfo);
        }
        
        // Si hay un producto (id_detalle no es null), lo añadimos a la lista de productos de la orden
        if (row.id_detalle) {
          const orderInfo = orderMap.get(orderId);
          orderInfo.productos.push({
            id_detalle: row.id_detalle,
            id_producto: row.id_producto,
            nombre_producto: row.nombre_producto,
            cantidad: row.cantidad,
            estado: row.estado_producto,
            id_producto_proceso: row.id_producto_proceso
          });
        }
      }
      
      // Convertimos el Map a un array para retornarlo
      return Array.from(orderMap.values());
    } catch (error) {
      throw new Error(`Error al obtener las órdenes por proceso: ${error.message}`);
    }
  }

  // Obtener el detalle de una orden específica
  async getOrderDetail(idOrden) {
    try {
      // 1. Obtener información general de la orden
      const orderInfoQuery = `
        SELECT 
          op.id_orden, op.id_cliente, op.fecha_aproximada, op.tipo_pago,
          op.id_comprobante_pago, op.observaciones, op.cedula_empleado_responsable, op.id_direccion,
          c.nombre as cliente_nombre, c.correo as cliente_correo, c.tipo as tipo_cliente,
          d.direccion as cliente_direccion, d.id_ciudad,
          ci.ciudad as cliente_ciudad, ci.id_departamento as departamento_id,
          dep.nombre as departamento_nombre,
          CASE 
            WHEN c.tipo = 'Natural' THEN 
              (SELECT jsonb_build_object('tipo_doc', n.tipo_doc, 'profesion', n.profesion) FROM cli_natural n WHERE n.id_cliente = c.id_cliente)
            WHEN c.tipo = 'Juridico' THEN 
              (SELECT jsonb_build_object('sector_economico', j.sector_economico) FROM juridico j WHERE j.id_cliente = c.id_cliente)
            ELSE NULL
          END as datos_especificos
        FROM orden_produccion op
        JOIN cliente c ON op.id_cliente = c.id_cliente
        LEFT JOIN direccion d ON op.id_direccion = d.id_direccion
        LEFT JOIN ciudad ci ON d.id_ciudad = ci.id_ciudad
        LEFT JOIN departamento dep ON ci.id_departamento = dep.id_departamento
        WHERE op.id_orden = $1
      `;
      
      // 2. Obtener teléfonos del cliente
      const telQuery = `
        SELECT telefono, tipo as tipo_telefono
        FROM telefono_cliente
        WHERE id_cliente = (SELECT id_cliente FROM orden_produccion WHERE id_orden = $1)
        LIMIT 1
      `;
      
      // 3. NUEVA CONSULTA MEJORADA: Obtener productos con TODAS sus asignaciones
      const productsQuery = `
        WITH producto_procesos AS (
          SELECT 
            dpo.id_detalle, 
            dpo.id_orden, 
            dpo.id_producto, 
            dpo.cantidad as cantidad_total,
            dpo.atributosUsuario, 
            dpo.bordado, 
            dpo.observacion,
            dpo.url_producto, 
            dpo.estado,
            p.nombre_producto,
            COALESCE(pp.cantidad, 0) as cantidad_en_proceso,
            COALESCE(dp.id_proceso, 1) as id_proceso_actual,
            COALESCE(ep.nombre, 'Solicitud') as nombre_proceso_actual,
            pp.id_confeccionista,
            c.nombre as nombre_confeccionista,
            c.cedula as cedula_confeccionista,
            c.telefono as telefono_confeccionista,
            pp.id_producto_proceso
          FROM detalle_producto_orden dpo
          JOIN producto p ON dpo.id_producto = p.id_producto
          LEFT JOIN producto_proceso pp ON dpo.id_detalle = pp.id_detalle_producto
          LEFT JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso 
            AND dp.estado = 'En Proceso'
          LEFT JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
          LEFT JOIN confeccionista c ON pp.id_confeccionista = c.id_confeccionista
          WHERE dpo.id_orden = $1
        )
        SELECT 
          id_detalle, id_orden, id_producto, cantidad_total, cantidad_en_proceso as cantidad,
          atributosUsuario, bordado, observacion, url_producto, estado,
          nombre_producto, id_proceso_actual, nombre_proceso_actual,
          id_confeccionista, nombre_confeccionista, cedula_confeccionista, telefono_confeccionista,
          id_producto_proceso
        FROM producto_procesos
        WHERE cantidad_en_proceso > 0 OR (cantidad_en_proceso = 0 AND id_proceso_actual = 1)
        ORDER BY id_detalle, id_proceso_actual, id_confeccionista
      `;
      
      // 4. Obtener procesos por los que ha pasado la orden
      const processesQuery = `
        SELECT 
          dp.id_detalle_proceso, dp.id_orden, dp.id_proceso,
          dp.fecha_inicio_proceso, dp.fecha_final_proceso,
          dp.cedula_empleado, dp.observaciones, dp.estado,
          ep.nombre as nombre_proceso
        FROM detalle_proceso dp
        JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
        WHERE dp.id_orden = $1
        ORDER BY dp.fecha_inicio_proceso DESC
      `;
      
      // Ejecutar todas las consultas
      const [orderResult, telResult, productsResult, processesResult] = await Promise.all([
        db.query(orderInfoQuery, [idOrden]),
        db.query(telQuery, [idOrden]),
        db.query(productsQuery, [idOrden]),
        db.query(processesQuery, [idOrden])
      ]);
      
      // Si no se encuentra la orden
      if (orderResult.rows.length === 0) {
        return {
          success: false,
          message: `No se encontró la orden con ID ${idOrden}`
        };
      }
      
      // NUEVO PROCESAMIENTO: Agrupar productos mostrando todas las asignaciones
      const productosAgrupados = {};
      let contadorUnico = 1;
      
      productsResult.rows.forEach(producto => {
        const keyBase = `${producto.id_detalle}_${producto.id_proceso_actual}`;
        
        if (producto.id_confeccionista) {
          // Si tiene confeccionista, crear una entrada única para cada asignación
          const keyUnica = `${keyBase}_conf_${producto.id_confeccionista}`;
          
          productosAgrupados[keyUnica] = {
            ...producto,
            id_detalle: `${producto.id_detalle}_${producto.id_proceso_actual}_${contadorUnico}`,
            id_detalle_original: producto.id_detalle,
            descripcion: `${producto.nombre_producto} - ${producto.nombre_confeccionista} (${producto.cantidad} unidades)`,
            nombre: producto.nombre_producto,
            nombre_producto: producto.nombre_producto,
            // Información del confeccionista
            confeccionista: {
              id_confeccionista: producto.id_confeccionista,
              nombre_confeccionista: producto.nombre_confeccionista,
              cedula_confeccionista: producto.cedula_confeccionista,
              telefono_confeccionista: producto.telefono_confeccionista
            }
          };
          contadorUnico++;
        } else {
          // Si no tiene confeccionista, usar la key base
          if (!productosAgrupados[keyBase]) {
            productosAgrupados[keyBase] = {
              ...producto,
              id_detalle: `${producto.id_detalle}_${producto.id_proceso_actual}`,
              id_detalle_original: producto.id_detalle,
              descripcion: producto.nombre_producto,
              nombre: producto.nombre_producto,
              nombre_producto: producto.nombre_producto,
              confeccionista: null
            };
          }
        }
      });
      
      // Convertir el objeto agrupado en array
      const productosFinales = Object.values(productosAgrupados);
      
      // Construir el objeto de respuesta
      const orderInfo = {
        ...orderResult.rows[0],
        cliente_telefono: telResult.rows.length > 0 ? telResult.rows[0].telefono : null,
        tipo_telefono: telResult.rows.length > 0 ? telResult.rows[0].tipo_telefone : null,
        productos: productosFinales,
        procesos: processesResult.rows
      };
      
      return {
        success: true,
        data: orderInfo,
        message: "Detalles de la orden obtenidos exitosamente"
      };
      
    } catch (error) {
      throw new Error(`Error al obtener detalles de la orden: ${error.message}`);
    }
  }

  // Verifica si todos los productos de una orden están en un proceso específico
  async areAllProductsInDelivery(idOrden, idProcesoEntrega) {
    try {
      const query = `
        SELECT 
          COUNT(*) AS total_products,
          SUM(CASE WHEN latest_process.id_proceso = $2 THEN 1 ELSE 0 END) AS products_in_delivery
        FROM detalle_producto_orden dpo
        LEFT JOIN LATERAL (
          SELECT dp.id_proceso
          FROM producto_proceso pp
          JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
          WHERE pp.id_detalle_producto = dpo.id_detalle
          ORDER BY dp.fecha_inicio_proceso DESC
          LIMIT 1
        ) latest_process ON true
        WHERE dpo.id_orden = $1
      `;
      
      const result = await db.query(query, [idOrden, idProcesoEntrega]);
      
      if (result.rows.length === 0) {
        return false;
      }
      
      const { total_products, products_in_delivery } = result.rows[0];
      
      // Verificar que haya productos y que todos estén en entrega
      return parseInt(total_products) > 0 && parseInt(total_products) === parseInt(products_in_delivery);
    } catch (error) {
      throw new Error(`Error al verificar si todos los productos están en entrega: ${error.message}`);
    }
  }

  // Completa la orden cuando todos sus productos están en entrega
  async completeOrder(datos) {
      const { 
        idOrden, 
        idProcesoEntrega, 
        cedulaEmpleado,
        observaciones 
      } = datos;
      
      try {
        // Iniciamos transacción
        await db.query('BEGIN');
        
        // 1. Verificar que todos los productos estén en entrega
        const allInDelivery = await this.areAllProductsInDelivery(idOrden, idProcesoEntrega);
        
        if (!allInDelivery) {
          throw new Error('No se puede completar la orden porque no todos los productos están en el proceso de entrega');
        }
        
        // 2. Marcar el proceso de entrega como "Completado"
        await db.query(
          `UPDATE detalle_proceso 
          SET estado = 'Completado', fecha_final_proceso = CURRENT_TIMESTAMP 
          WHERE id_orden = $1 AND id_proceso = $2 AND estado = 'En Proceso'`,
          [idOrden, idProcesoEntrega]
        );
        
        // 3. Actualizar los productos de la orden como entregados
        await db.query(
          `UPDATE detalle_producto_orden 
          SET estado = 'Entregado' 
          WHERE id_orden = $1`,
          [idOrden]
        );
        
        // Si hay observaciones, guardarlas
        if (observaciones) {
          await db.query(
            `UPDATE detalle_proceso 
            SET observaciones = CASE 
              WHEN observaciones IS NULL THEN $1
              ELSE observaciones || E'\n' || $1
            END
            WHERE id_orden = $2 AND id_proceso = $3 AND fecha_final_proceso IS NOT NULL`,
            [observaciones, idOrden, idProcesoEntrega]
          );
        }
        
        await db.query('COMMIT');
        return true;
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
  }
  
  // Obtener órdenes completadas
  async getCompletedOrders() {
    try {
      const query = `
        WITH order_info AS (
          SELECT DISTINCT
            op.id_orden,
            op.id_cliente,
            op.fecha_aproximada,
            c.nombre AS nombre_cliente,
            (
              SELECT dp.fecha_final_proceso
              FROM detalle_proceso dp
              JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
              WHERE dp.id_orden = op.id_orden
              AND dp.estado = 'Completado'
              ORDER BY dp.fecha_final_proceso DESC
              LIMIT 1
            ) AS fecha_completado,
            (
              SELECT dp.observaciones
              FROM detalle_proceso dp
              JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
              WHERE dp.id_orden = op.id_orden
              AND dp.estado = 'Completado'
              ORDER BY dp.fecha_final_proceso DESC
              LIMIT 1
            ) AS observaciones,
            (
              SELECT ep.nombre
              FROM detalle_proceso dp
              JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
              WHERE dp.id_orden = op.id_orden
              AND dp.estado = 'Completado'
              ORDER BY dp.fecha_final_proceso DESC
              LIMIT 1
            ) AS proceso_final
          FROM orden_produccion op
          JOIN cliente c ON op.id_cliente = c.id_cliente
          JOIN detalle_producto_orden dpo ON op.id_orden = dpo.id_orden
          WHERE dpo.estado = 'Entregado'
          GROUP BY op.id_orden, op.id_cliente, op.fecha_aproximada, c.nombre
          HAVING COUNT(CASE WHEN dpo.estado != 'Entregado' THEN 1 END) = 0
          ORDER BY fecha_completado DESC
        )
        SELECT 
          oi.*,
          COUNT(dpo.id_detalle) AS total_productos
        FROM order_info oi
        JOIN detalle_producto_orden dpo ON oi.id_orden = dpo.id_orden
        GROUP BY oi.id_orden, oi.id_cliente, oi.nombre_cliente, oi.fecha_aproximada, oi.fecha_completado, oi.observaciones, oi.proceso_final
      `;
      
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Error al obtener las órdenes completadas: ${error.message}`);
    }
  }

  // Obtener el detalle de una orden completada
  async getCompletedOrderDetail(idOrden) {
      try {
        // Verificar primero si la orden está completada
        const checkQuery = `
          SELECT COUNT(*) AS total, 
                COUNT(CASE WHEN dpo.estado = 'Entregado' THEN 1 END) AS completed
          FROM detalle_producto_orden dpo
          WHERE dpo.id_orden = $1
        `;
        
        const checkResult = await db.query(checkQuery, [idOrden]);
        
        if (checkResult.rows[0].total !== checkResult.rows[0].completed) {
          return {
            success: false,
            message: "Esta orden no está completamente entregada"
          };
        }
        
        // Si está completada, obtener todos los detalles
        return await this.getOrderDetail(idOrden);
      } catch (error) {
        throw new Error(`Error al obtener el detalle de la orden completada: ${error.message}`);
      }
  }

}

module.exports = new AdvanceOrderModel();