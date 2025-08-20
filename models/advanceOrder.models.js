const db = require('../database/db');
const NodeCache = require('node-cache');

class AdvanceOrderModel {
  constructor() {
    // Inicializar caché con TTL por defecto de 5 minutos
    this.cache = new NodeCache({ 
      stdTTL: 300, // 5 minutos
      checkperiod: 60, // verificar cada minuto por expirados
      maxKeys: 100 // máximo 100 llaves en caché
    });
  }
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

  // Obtener todos los confeccionistas activos con caché
  async getActiveConfeccionistas() {
    try {
      // Implementar caché simple con TTL de 5 minutos
      const cacheKey = 'active_confeccionistas';
      const cacheData = this.cache?.get(cacheKey);
      
      if (cacheData) {
        return cacheData;
      }
      
      const query = `
        SELECT id_confeccionista, cedula, nombre, telefono
        FROM confeccionista
        WHERE activo = true
        ORDER BY nombre
      `;
      
      const result = await db.query(query);
      
      // Guardar en caché por 5 minutos (300 segundos)
      if (this.cache) {
        this.cache.set(cacheKey, result.rows, 300);
      }
      
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
    const { 
      idOrden, 
      idProcesoActual, 
      idProcesoSiguiente, 
      cedulaEmpleadoActual, 
      itemsToAdvance, 
      observaciones,
      // NUEVO: Permitir especificar destino para cada producto cuando viene de confección
      destinosPorProducto = {},
      // NUEVO: Datos de factura para transición de facturación a entrega
      facturaData = null,
      // NUEVO: Fecha aproximada proporcionada por el frontend
      fechaAproximada = null
    } = datos;
    
    try {
      await db.query('BEGIN');
      
      // Convertir a enteros y validar
      const idOrdenInt = parseInt(idOrden);
      const idProcesoActualInt = parseInt(idProcesoActual);
      const idProcesoSiguienteInt = idProcesoSiguiente !== null && idProcesoSiguiente !== undefined ? parseInt(idProcesoSiguiente) : null;
      
      // Validar que las conversiones sean válidas
      if (isNaN(idOrdenInt) || isNaN(idProcesoActualInt)) {
        throw new Error(`Los IDs de orden y proceso actual deben ser números válidos. Recibido: idOrden=${idOrden} (${typeof idOrden}), idProcesoActual=${idProcesoActual} (${typeof idProcesoActual})`);
      }
      
      if (idProcesoSiguiente !== null && idProcesoSiguiente !== undefined && isNaN(idProcesoSiguienteInt)) {
        throw new Error(`El ID de proceso siguiente debe ser un número válido o null. Recibido: idProcesoSiguiente=${idProcesoSiguiente} (${typeof idProcesoSiguiente})`);
      }
      
      const isSolicitudToTrazos = idProcesoActualInt === 1 && idProcesoSiguienteInt === 2;
    
    if (isSolicitudToTrazos) {
      // Si el frontend proporciona una fecha aproximada, usarla
      let fechaAprox = null;
      if (fechaAproximada) {
        fechaAprox = new Date(fechaAproximada);
        
        // Validar que la fecha sea válida
        if (isNaN(fechaAprox.getTime())) {
          throw new Error('La fecha aproximada proporcionada no es válida');
        }
        
        await db.query(
          `UPDATE orden_produccion SET fecha_aproximada = $1 WHERE id_orden = $2`,
          [fechaAprox, idOrdenInt]
        );
        
        // Agregar una observación para registrar cuándo se asignó la fecha aproximada
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
    }
      let idDetalleProcesoSiguiente = null;
      
      if (idProcesoSiguienteInt !== null) {
        
        const procesoSiguienteQuery = await db.query(
          `SELECT id_detalle_proceso, observaciones FROM detalle_proceso 
          WHERE id_orden = $1 AND id_proceso = $2 AND estado = 'En Proceso'`,
          [idOrdenInt, idProcesoSiguienteInt]
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
            [idOrdenInt, idProcesoSiguienteInt, cedulaEmpleadoActual, observacionConTimestamp]
          );
          idDetalleProcesoSiguiente = nuevoProcesoQuery.rows[0].id_detalle_proceso;
          
        }
      }
      
      // Verificar si estamos pasando de cortes a confección
      const isCorteToConfeccion = idProcesoActualInt === 3 && idProcesoSiguienteInt === 4;
      
      //Verificar si estamos saliendo de confección
      const isLeavingConfeccion = idProcesoActualInt === 4;
      
      // Verificar si estamos pasando de facturación a entrega
      const isFacturacionToEntrega = idProcesoActualInt === 6 && idProcesoSiguienteInt === 7;
      
      // Si es transición de facturación a entrega y se proporcionan datos de factura
      let idFacturaCreada = null;
      if (isFacturacionToEntrega && facturaData) {
        // Verificar que el número de factura no exista
        const existeFacturaQuery = await db.query(
          `SELECT id_factura FROM factura WHERE numero_factura = $1`,
          [facturaData.numero_factura]
        );
        
        if (existeFacturaQuery.rows.length > 0) {
          throw new Error(`Ya existe una factura con el número: ${facturaData.numero_factura}`);
        }
        
        // Crear la factura
        const facturaQuery = await db.query(
          `INSERT INTO factura (numero_factura, url_factura, observaciones) 
           VALUES ($1, $2, $3) RETURNING id_factura`,
          [facturaData.numero_factura, facturaData.url_factura, facturaData.observaciones]
        );
        idFacturaCreada = facturaQuery.rows[0].id_factura;
      }
      
      // 2. Registrar al empleado en el historial para el proceso actual (si existe)
      if (idProcesoActualInt && cedulaEmpleadoActual) {
        // Obtener el id_detalle_proceso del proceso actual
        const procesoActualQuery = await db.query(
          `SELECT id_detalle_proceso FROM detalle_proceso 
          WHERE id_orden = $1 AND id_proceso = $2 AND estado = 'En Proceso'`,
          [idOrdenInt, idProcesoActualInt]
        );
        
        if (procesoActualQuery.rows.length > 0) {
          const idDetalleProcesoActual = procesoActualQuery.rows[0].id_detalle_proceso;
          
          // Verificar si el empleado ya está registrado en este proceso
          const empleadoExistenteQuery = await db.query(
            `SELECT id_historial FROM historial_empleado_proceso 
            WHERE id_detalle_proceso = $1 AND cedula_empleado = $2`,
            [idDetalleProcesoActual, cedulaEmpleadoActual]
          );
          
          // Solo registrar si no existe previamente
          if (empleadoExistenteQuery.rows.length === 0) {
            // Preparar información detallada de productos avanzados
            const productosAvanzados = [];
            let cantidadTotalAvanzada = 0;
            
            // Obtener nombres de procesos
            const procesoOrigenQuery = await db.query(
              `SELECT nombre FROM estado_proceso WHERE id_proceso = $1`, [idProcesoActualInt]
            );
            const procesoDestinoQuery = await db.query(
              `SELECT nombre FROM estado_proceso WHERE id_proceso = $1`, [idProcesoSiguienteInt || 0]
            );
            
            const nombreProcesoOrigen = procesoOrigenQuery.rows[0]?.nombre || 'Proceso desconocido';
            const nombreProcesoDestino = procesoDestinoQuery.rows[0]?.nombre || 'Múltiples destinos';
            
            // Recopilar información de cada producto avanzado
            for (const item of itemsToAdvance) {
              // Obtener nombre del producto
              const productoQuery = await db.query(
                `SELECT p.nombre_producto 
                FROM detalle_producto_orden dpo
                JOIN producto p ON dpo.id_producto = p.id_producto
                WHERE dpo.id_detalle = $1`, [item.idDetalle]
              );
              
              const nombreProducto = productoQuery.rows[0]?.nombre_producto || 'Producto desconocido';
              const cantidadAvanzada = parseInt(item.cantidadAvanzar);
              
              productosAvanzados.push({
                id_detalle: parseInt(item.idDetalle),
                nombre_producto: nombreProducto,
                cantidad_avanzada: cantidadAvanzada,
                proceso_origen: nombreProcesoOrigen,
                proceso_destino: isLeavingConfeccion && destinosPorProducto[item.idDetalle] 
                  ? destinosPorProducto[item.idDetalle].nombreProceso 
                  : nombreProcesoDestino,
                id_producto_proceso: item.idProductoProceso || null
              });
              
              cantidadTotalAvanzada += cantidadAvanzada;
            }
            
            await db.query(
              `INSERT INTO historial_empleado_proceso 
              (id_detalle_proceso, cedula_empleado, observaciones, productos_avanzados, cantidad_total_avanzada)
              VALUES ($1, $2, $3, $4, $5)`,
              [
                idDetalleProcesoActual, 
                cedulaEmpleadoActual, 
                `Empleado que avanza productos del proceso ${idProcesoActualInt} al ${idProcesoSiguienteInt || 'procesos específicos'}`,
                JSON.stringify(productosAvanzados),
                cantidadTotalAvanzada
              ]
            );
          }
        }
      }

      // 3. OPTIMIZACIÓN: Preparar consultas en batch para evitar N+1
      const itemIds = itemsToAdvance.map(item => parseInt(item.idDetalle));
      
      // Una sola consulta para obtener todas las cantidades actuales
      const cantidadesActualesQuery = `
        SELECT pp.id_detalle_producto, pp.cantidad, pp.id_producto_proceso, pp.id_confeccionista,
               dp.id_detalle_proceso, p.nombre_producto
        FROM producto_proceso pp
        JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
        JOIN detalle_producto_orden dpo ON pp.id_detalle_producto = dpo.id_detalle
        JOIN producto p ON dpo.id_producto = p.id_producto
        WHERE pp.id_detalle_producto = ANY($1::int[]) 
        AND dp.id_orden = $2 AND dp.id_proceso = $3 AND dp.estado = 'En Proceso'
      `;
      
      const cantidadesResult = await db.query(cantidadesActualesQuery, 
        [itemIds, idOrdenInt, idProcesoActualInt]);
      
      // Crear mapa para acceso O(1)
      const cantidadesMap = new Map();
      cantidadesResult.rows.forEach(row => {
        // Para cortes (proceso 3), el confeccionista siempre es null en el proceso actual
        // Por eso creamos claves múltiples para asegurar que encontremos el producto
        const keyWithConfeccionista = `${row.id_detalle_producto}_${row.id_confeccionista || 'null'}`;
        const keyWithoutConfeccionista = `${row.id_detalle_producto}_null`;
        const keySimple = `${row.id_detalle_producto}`;
        
        cantidadesMap.set(keyWithConfeccionista, row);
        cantidadesMap.set(keyWithoutConfeccionista, row);
        cantidadesMap.set(keySimple, row);
      });

      // 3. Procesar cada producto con lógica de múltiples destinos
      for (const item of itemsToAdvance) {
        
        const { idDetalle, cantidadAvanzar, idConfeccionista, idProductoProceso, fechaRecibido, fechaEntrega } = item;
        
        // Parsear y validar todos los valores numéricos con logging detallado
        const idDetalleInt = parseInt(idDetalle);
        const cantidadAvanzarInt = parseInt(cantidadAvanzar);
        const idConfeccionistaInt = idConfeccionista ? parseInt(idConfeccionista) : null;
        const idProductoProcesoInt = idProductoProceso ? parseInt(idProductoProceso) : null;
        
        // Validar que los valores sean números válidos
        if (isNaN(idDetalleInt) || isNaN(cantidadAvanzarInt)) {
          throw new Error(`Valores inválidos para producto: idDetalle=${idDetalle} (${typeof idDetalle}), cantidadAvanzar=${cantidadAvanzar} (${typeof cantidadAvanzar})`);
        }
        
        if (idConfeccionista && isNaN(idConfeccionistaInt)) {
          throw new Error(`ID de confeccionista inválido: ${idConfeccionista} (${typeof idConfeccionista})`);
        }
        
        if (idProductoProceso && isNaN(idProductoProcesoInt)) {
          throw new Error(`ID de producto proceso inválido: ${idProductoProceso} (${typeof idProductoProceso})`);
        }
        
        let destinoProceso = idProcesoSiguienteInt;
        let idDetalleProcesoDestino = idDetalleProcesoSiguiente;
        
        // Si estamos usando bifurcación, obtener el destino específico
        if (isLeavingConfeccion && destinosPorProducto[idDetalleInt]) {
          destinoProceso = parseInt(destinosPorProducto[idDetalleInt].idProcesoDestino);
          
          // Crear o obtener el detalle_proceso para el destino específico
          const procesoDestinoQuery = await db.query(
            `SELECT id_detalle_proceso FROM detalle_proceso 
            WHERE id_orden = $1 AND id_proceso = $2 AND estado = 'En Proceso'`,
            [idOrdenInt, destinoProceso]
          );
          
          if (procesoDestinoQuery.rows.length > 0) {
            idDetalleProcesoDestino = procesoDestinoQuery.rows[0].id_detalle_proceso;
          } else {
            // Crear nuevo proceso de destino
            const nuevoProcesoDestinoQuery = await db.query(
              `INSERT INTO detalle_proceso 
              (id_orden, id_proceso, cedula_empleado, observaciones) 
              VALUES ($1, $2, $3, $4) RETURNING id_detalle_proceso`,
              [idOrdenInt, destinoProceso, cedulaEmpleadoActual, `Avanzado desde confección hacia ${destinosPorProducto[idDetalleInt].nombreProceso || 'proceso ' + destinoProceso}`]
            );
            idDetalleProcesoDestino = nuevoProcesoDestinoQuery.rows[0].id_detalle_proceso;
          }
        } else if (idProcesoSiguienteInt === null) {
          // Si no hay proceso siguiente definido y no hay bifurcación, es un error
          throw new Error(`No se puede determinar el destino para el producto ${idDetalleInt}`);
        }
        
        // NUEVA LÓGICA: Si viene de confección (proceso 4) y tiene idProductoProceso específico
        if (idProcesoActualInt === 4 && idProductoProcesoInt) {          
          // Obtener la cantidad específica de este producto_proceso
          const cantidadEspecificaQuery = await db.query(
            `SELECT pp.cantidad, pp.id_confeccionista
            FROM producto_proceso pp
            JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
            WHERE pp.id_producto_proceso = $1 AND dp.id_orden = $2 AND dp.id_proceso = $3 AND dp.estado = 'En Proceso'`,
            [idProductoProcesoInt, idOrdenInt, idProcesoActualInt]
          );
          
          if (cantidadEspecificaQuery.rows.length === 0) {
            throw new Error(`No se encontró el producto específico ${idProductoProcesoInt} en el proceso actual`);
          }
          
          const cantidadEnProcesoActual = parseInt(cantidadEspecificaQuery.rows[0].cantidad);
          const confeccionistaOriginal = cantidadEspecificaQuery.rows[0].id_confeccionista;
          
          if (cantidadAvanzarInt > cantidadEnProcesoActual) {
            throw new Error(`No se puede avanzar ${cantidadAvanzarInt} unidades. Solo hay ${cantidadEnProcesoActual} disponibles en esta asignación específica`);
          }
          
          // Avanzar al siguiente proceso (sin confeccionista ya que sale de confección)
          const existeEnSiguienteQuery = await db.query(
            `SELECT pp.id_producto_proceso, pp.cantidad
            FROM producto_proceso pp
            WHERE pp.id_detalle_producto = $1 AND pp.id_detalle_proceso = $2`,
            [idDetalleInt, idDetalleProcesoDestino]
          );
          
          let idProductoProcesoDestino = null;
          
          if (existeEnSiguienteQuery.rows.length > 0) {
            const cantidadExistente = parseInt(existeEnSiguienteQuery.rows[0].cantidad);
            const nuevaCantidad = cantidadExistente + cantidadAvanzarInt;
            
            await db.query(
              `UPDATE producto_proceso 
              SET cantidad = $1
              WHERE id_detalle_producto = $2 AND id_detalle_proceso = $3`,
              [nuevaCantidad, idDetalleInt, idDetalleProcesoDestino]
            );
            
            idProductoProcesoDestino = existeEnSiguienteQuery.rows[0].id_producto_proceso;
          } else {
            const insertResult = await db.query(
              `INSERT INTO producto_proceso 
              (id_detalle_producto, id_detalle_proceso, cantidad) 
              VALUES ($1, $2, $3) RETURNING id_producto_proceso`,
              [idDetalleInt, idDetalleProcesoDestino, cantidadAvanzarInt]
            );
            
            idProductoProcesoDestino = insertResult.rows[0].id_producto_proceso;
          }
          
          // Si es transición de facturación a entrega, vincular con factura
          if (isFacturacionToEntrega && idFacturaCreada && idProductoProcesoDestino) {
            await db.query(
              `INSERT INTO factura_producto_proceso (id_factura, id_producto_proceso)
               VALUES ($1, $2)`,
              [idFacturaCreada, idProductoProcesoDestino]
            );
          }
          
          // Actualizar o eliminar el registro específico en confección
          const nuevaCantidadProcesoActual = cantidadEnProcesoActual - cantidadAvanzarInt;
          
          if (nuevaCantidadProcesoActual === 0) {
            // Eliminar este registro específico
            await db.query(
              `DELETE FROM producto_proceso WHERE id_producto_proceso = $1`,
              [idProductoProcesoInt]
            );
          } else {
            // Actualizar la cantidad de este registro específico
            await db.query(
              `UPDATE producto_proceso SET cantidad = $1 WHERE id_producto_proceso = $2`,
              [nuevaCantidadProcesoActual, idProductoProcesoInt]
            );
          }
          
          // Si es transición de facturación a entrega, vincular con factura
          if (isFacturacionToEntrega && idFacturaCreada) {
            await db.query(
              `INSERT INTO factura_producto_proceso (id_factura, id_producto_proceso)
               VALUES ($1, $2)`,
              [idFacturaCreada, idProductoProcesoInt]
            );
          }
        } else {          
          // OPTIMIZACIÓN: Usar datos del mapa en lugar de consultas individuales
          // Intentar múltiples claves para encontrar el producto
          let cantidadInfo = null;
          
          // Si estamos saliendo de cortes (proceso 3), el confeccionista en origen es null
          if (idProcesoActualInt === 3) {
            cantidadInfo = cantidadesMap.get(`${idDetalleInt}_null`) || 
                          cantidadesMap.get(`${idDetalleInt}`);
          } else {
            // Para otros procesos, intentar con el confeccionista especificado
            const mapKey = `${idDetalleInt}_${idConfeccionistaInt || 'null'}`;
            cantidadInfo = cantidadesMap.get(mapKey) || 
                          cantidadesMap.get(`${idDetalleInt}_null`) ||
                          cantidadesMap.get(`${idDetalleInt}`);
          }
          
          const cantidadEnProcesoActual = parseInt(cantidadInfo.cantidad);
          
          // OPTIMIZACIÓN: Usar el nombre del producto del mapa
          const nombreProducto = cantidadInfo.nombre_producto;
          
          if (cantidadAvanzarInt > cantidadEnProcesoActual) {
            throw new Error(`No se puede avanzar ${cantidadAvanzarInt} unidades de ${nombreProducto}. Solo hay ${cantidadEnProcesoActual} disponibles`);
          }
          
          // Convertir fechas a objetos Date si están presentes
          const fechaRecibidoDate = fechaRecibido ? new Date(fechaRecibido) : null;
          const fechaEntregaDate = fechaEntrega ? new Date(fechaEntrega) : null;
          
          // Lógica para manejar destino (con o sin confeccionista)
          if (isCorteToConfeccion) {
            const existeConConfeccionistaQuery = await db.query(
              `SELECT pp.id_producto_proceso, pp.cantidad
              FROM producto_proceso pp
              WHERE pp.id_detalle_producto = $1 
              AND pp.id_detalle_proceso = $2 
              AND pp.id_confeccionista = $3`,
              [idDetalleInt, idDetalleProcesoDestino, idConfeccionistaInt]
            );
            
            let idProductoProcesoDestino = null;
            
            if (existeConConfeccionistaQuery.rows.length > 0) {
              const cantidadExistente = parseInt(existeConConfeccionistaQuery.rows[0].cantidad);
              const nuevaCantidad = cantidadExistente + cantidadAvanzarInt;
              
              await db.query(
                `UPDATE producto_proceso 
                SET cantidad = $1, fecha_recibido = $2, fecha_entrega = $3
                WHERE id_detalle_producto = $4 
                AND id_detalle_proceso = $5 
                AND id_confeccionista = $6`,
                [nuevaCantidad, fechaRecibidoDate, fechaEntregaDate, idDetalleInt, idDetalleProcesoDestino, idConfeccionistaInt]
              );
              
              idProductoProcesoDestino = existeConConfeccionistaQuery.rows[0].id_producto_proceso;
            } else {
              const insertResult = await db.query(
                `INSERT INTO producto_proceso 
                (id_detalle_producto, id_detalle_proceso, cantidad, id_confeccionista, fecha_recibido, fecha_entrega) 
                VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_producto_proceso`,
                [idDetalleInt, idDetalleProcesoDestino, cantidadAvanzarInt, idConfeccionistaInt, fechaRecibidoDate, fechaEntregaDate]
              );
              
              idProductoProcesoDestino = insertResult.rows[0].id_producto_proceso;
            }
            
            // Si es transición de facturación a entrega, vincular con factura
            if (isFacturacionToEntrega && idFacturaCreada && idProductoProcesoDestino) {
              await db.query(
                `INSERT INTO factura_producto_proceso (id_factura, id_producto_proceso)
                 VALUES ($1, $2)`,
                [idFacturaCreada, idProductoProcesoDestino]
              );
            }
            
            // NUEVA LÓGICA: Actualizar cantidad_cortada en el proceso de cortes
            await db.query(
              `UPDATE producto_proceso 
              SET cantidad_cortada = GREATEST(0, COALESCE(cantidad_cortada, 0) - $1)
              WHERE id_detalle_producto = $2 
              AND id_detalle_proceso IN (
                SELECT dp.id_detalle_proceso 
                FROM detalle_proceso dp 
                WHERE dp.id_orden = $3 AND dp.id_proceso = $4 AND dp.estado = 'En Proceso'
              )`,
              [cantidadAvanzarInt, idDetalleInt, idOrdenInt, idProcesoActualInt]
            );
          
          } else {
            // Para procesos que no son corte a confección
            const existeEnSiguienteQuery = await db.query(
              `SELECT pp.id_producto_proceso, pp.cantidad
              FROM producto_proceso pp
              WHERE pp.id_detalle_producto = $1 AND pp.id_detalle_proceso = $2`,
              [idDetalleInt, idDetalleProcesoDestino]
            );
            
            let idProductoProcesoDestino = null;
            
            if (existeEnSiguienteQuery.rows.length > 0) {
              const cantidadExistente = parseInt(existeEnSiguienteQuery.rows[0].cantidad);
              const nuevaCantidad = cantidadExistente + cantidadAvanzarInt;
              
              await db.query(
                `UPDATE producto_proceso 
                SET cantidad = $1
                WHERE id_detalle_producto = $2 AND id_detalle_proceso = $3`,
                [nuevaCantidad, idDetalleInt, idDetalleProcesoDestino]
              );
              
              idProductoProcesoDestino = existeEnSiguienteQuery.rows[0].id_producto_proceso;
            } else {
              const insertResult = await db.query(
                `INSERT INTO producto_proceso 
                (id_detalle_producto, id_detalle_proceso, cantidad) 
                VALUES ($1, $2, $3) RETURNING id_producto_proceso`,
                [idDetalleInt, idDetalleProcesoDestino, cantidadAvanzarInt]
              );
              
              idProductoProcesoDestino = insertResult.rows[0].id_producto_proceso;
            }
            
            // Si es transición de facturación a entrega, vincular con factura
            if (isFacturacionToEntrega && idFacturaCreada && idProductoProcesoDestino) {
              await db.query(
                `INSERT INTO factura_producto_proceso (id_factura, id_producto_proceso)
                 VALUES ($1, $2)`,
                [idFacturaCreada, idProductoProcesoDestino]
              );
            }
          }
                    
          // Actualizar la cantidad en el proceso actual
          const nuevaCantidadProcesoActual = cantidadEnProcesoActual - cantidadAvanzarInt;
          
          if (nuevaCantidadProcesoActual === 0) {
            // Si no queda cantidad, eliminar el registro del proceso actual
            if (idConfeccionistaInt && idProcesoActualInt === 4) {
              await db.query(
                `DELETE FROM producto_proceso pp
                WHERE pp.id_detalle_producto = $1 
                AND pp.id_detalle_proceso IN (
                  SELECT dp.id_detalle_proceso 
                  FROM detalle_proceso dp 
                  WHERE dp.id_orden = $2 AND dp.id_proceso = $3 AND dp.estado = 'En Proceso'
                ) AND pp.id_confeccionista = $4`,
                [idDetalleInt, idOrdenInt, idProcesoActualInt, idConfeccionistaInt]
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
                [idDetalleInt, idOrdenInt, idProcesoActualInt]
              );
            }
          } else {
            // Si queda cantidad, actualizar el registro
            // ESPECIAL: Si estamos en proceso de cortes y NO es corte a confección, no actualizar cantidad_cortada
            if (idProcesoActualInt === 3 && !isCorteToConfeccion) {
              // Actualizar solo la cantidad, sin tocar cantidad_cortada
              await db.query(
                `UPDATE producto_proceso 
                SET cantidad = $1
                WHERE id_detalle_producto = $2 
                AND id_detalle_proceso IN (
                  SELECT dp.id_detalle_proceso 
                  FROM detalle_proceso dp 
                  WHERE dp.id_orden = $3 AND dp.id_proceso = $4 AND dp.estado = 'En Proceso'
                )`,
                [nuevaCantidadProcesoActual, idDetalleInt, idOrdenInt, idProcesoActualInt]
              );
            } else if (idConfeccionistaInt && idProcesoActualInt === 4) {
              await db.query(
                `UPDATE producto_proceso 
                SET cantidad = $1
                WHERE id_detalle_producto = $2 
                AND id_detalle_proceso IN (
                  SELECT dp.id_detalle_proceso 
                  FROM detalle_proceso dp 
                  WHERE dp.id_orden = $3 AND dp.id_proceso = $4 AND dp.estado = 'En Proceso'
                ) AND id_confeccionista = $5`,
                [nuevaCantidadProcesoActual, idDetalleInt, idOrdenInt, idProcesoActualInt, idConfeccionistaInt]
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
                [nuevaCantidadProcesoActual, idDetalleInt, idOrdenInt, idProcesoActualInt]
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
        [idOrdenInt, idProcesoActualInt]
      );
            
      // Si no quedan productos en el proceso actual, cerramos ese proceso
      if (parseInt(productosRestantesQuery.rows[0].count) === 0) {
        await db.query(
          `UPDATE detalle_proceso 
          SET estado = 'Completado', fecha_final_proceso = CURRENT_TIMESTAMP 
          WHERE id_orden = $1 AND id_proceso = $2 AND estado = 'En Proceso'`,
          [idOrdenInt, idProcesoActualInt]
        );
      }
      
      // Limpiar procesos vacíos que puedan haber quedado
      // await this.cleanEmptyProcesses(idOrdenInt);
      
      await db.query('COMMIT');
      return true;
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  async cleanEmptyProcesses(idOrden) {
    try {
      // Eliminar registros de producto_proceso que tienen cantidad 0
      await db.query(
        `DELETE FROM producto_proceso 
         WHERE cantidad = 0 OR cantidad IS NULL`
      );
      
      // Eliminar detalle_proceso que no tienen productos asociados y están en estado 'En Proceso'
      await db.query(
        `DELETE FROM detalle_proceso dp
         WHERE dp.id_orden = $1 
         AND dp.estado = 'En Proceso'
         AND NOT EXISTS (
           SELECT 1 FROM producto_proceso pp 
           WHERE pp.id_detalle_proceso = dp.id_detalle_proceso
         )`,
        [idOrden]
      );
      
      return true;
    } catch (error) {
      console.error('Error al limpiar procesos vacíos:', error);
      // No lanzar error para no interrumpir el flujo principal
      return false;
    }
  }

  // Obtener órdenes por proceso con paginación (OPTIMIZADO)
  async getOrdersByProcess(idProceso, page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;
      
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
          ORDER BY op.id_orden DESC
          LIMIT $2 OFFSET $3
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
        ORDER BY oi.id_orden DESC, dpo.id_detalle
      `;
      
      // Consulta para contar total
      const countQuery = `
        SELECT COUNT(DISTINCT op.id_orden) as total
        FROM orden_produccion op
        JOIN detalle_proceso dp ON op.id_orden = dp.id_orden
        WHERE dp.id_proceso = $1
      `;
      
      const [result, countResult] = await Promise.all([
        db.query(query, [idProceso, limit, offset]),
        db.query(countQuery, [idProceso])
      ]);
      
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
      return {
        data: Array.from(orderMap.values()),
        pagination: {
          current_page: page,
          per_page: limit,
          total: parseInt(countResult.rows[0].total),
          total_pages: Math.ceil(countResult.rows[0].total / limit)
        }
      };
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
          atributosUsuario, observacion, url_producto, estado,
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
          dpo.id_detalle,
          dpo.cantidad as cantidad_total,
          COALESCE(SUM(CASE WHEN dp.id_proceso = $2 AND dp.estado = 'En Proceso' THEN pp.cantidad ELSE 0 END), 0) as cantidad_en_entrega
        FROM detalle_producto_orden dpo
        LEFT JOIN producto_proceso pp ON dpo.id_detalle = pp.id_detalle_producto
        LEFT JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
        WHERE dpo.id_orden = $1
        GROUP BY dpo.id_detalle, dpo.cantidad
      `;
      
      const result = await db.query(query, [idOrden, idProcesoEntrega]);
      
      if (result.rows.length === 0) {
        return false;
      }
      
      // Verificar que TODOS los productos tengan su cantidad completa en entrega
      for (const producto of result.rows) {
        const cantidadTotal = parseInt(producto.cantidad_total);
        const cantidadEnEntrega = parseInt(producto.cantidad_en_entrega);
        
        // Si algún producto no está completamente en entrega, retornar false
        if (cantidadTotal !== cantidadEnEntrega) {
          console.log(`Producto ${producto.id_detalle}: Total=${cantidadTotal}, En entrega=${cantidadEnEntrega}`);
          return false;
        }
      }
      
      // Solo retornar true si todos los productos están completamente en entrega
      return true;
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

  // Verificar si estamos saliendo de confección y necesitamos elegir destino
  isLeavingConfeccion(idProcesoActual) {
    return parseInt(idProcesoActual) === 4;
  }

  // Obtener procesos disponibles desde confección
  async getAvailableProcessesFromConfeccion() {
    try {
      const query = `
        SELECT id_proceso, nombre
        FROM estado_proceso
        WHERE id_proceso IN (5, 6) -- Bordado (5) y Facturación (6)
        ORDER BY id_proceso
      `;
      
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Error al obtener procesos disponibles: ${error.message}`);
    }
  }

  // Obtener facturas de una orden específica
  async getOrderFacturas(idOrden) {
    try {
      const query = `
        SELECT DISTINCT
          f.id_factura,
          f.numero_factura,
          f.fecha_emision,
          f.url_factura,
          f.observaciones,
          COUNT(fpp.id_producto_proceso) as total_productos_facturados
        FROM factura f
        JOIN factura_producto_proceso fpp ON f.id_factura = fpp.id_factura
        JOIN producto_proceso pp ON fpp.id_producto_proceso = pp.id_producto_proceso
        JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
        WHERE dp.id_orden = $1
        GROUP BY f.id_factura, f.numero_factura, f.fecha_emision, f.url_factura, f.observaciones
        ORDER BY f.fecha_emision DESC
      `;
      
      const result = await db.query(query, [idOrden]);
      return result.rows;
    } catch (error) {
      throw new Error(`Error al obtener facturas de la orden: ${error.message}`);
    }
  }

  // Obtener historial de un proceso específico
  async getProcessEmployeeHistory(idDetaleProceso) {
    try {
      const query = `
        SELECT 
          hep.id_historial,
          hep.cedula_empleado,
          e.nombre || ' ' || e.apellidos as nombre_completo,
          e.telefono,
          hep.fecha_participacion,
          hep.observaciones
        FROM historial_empleado_proceso hep
        JOIN empleado e ON hep.cedula_empleado = e.cedula
        WHERE hep.id_detalle_proceso = $1
        ORDER BY hep.fecha_participacion
      `;
      
      const result = await db.query(query, [idDetaleProceso]);
      return result.rows;
    } catch (error) {
      throw new Error(`Error al obtener historial del proceso: ${error.message}`);
    }
  }

  // Obtener log completo de auditoría para una orden
  async getOrderAuditLog(idOrden) {
    try {
      const query = `
        SELECT 
          'PROCESO' as tipo_evento,
          dp.id_detalle_proceso,
          ep.nombre as proceso,
          dp.cedula_empleado as empleado_responsable,
          e1.nombre || ' ' || e1.apellidos as nombre_responsable,
          dp.fecha_inicio_proceso as fecha_evento,
          dp.observaciones,
          dp.estado,
          NULL as empleado_participante,
          NULL as nombre_participante,
          NULL as fecha_participacion
        FROM detalle_proceso dp
        JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
        JOIN empleado e1 ON dp.cedula_empleado = e1.cedula
        WHERE dp.id_orden = $1
        
        UNION ALL
        
        SELECT 
          'PARTICIPACION' as tipo_evento,
          hep.id_detalle_proceso,
          ep.nombre as proceso,
          dp.cedula_empleado as empleado_responsable,
          e1.nombre || ' ' || e1.apellidos as nombre_responsable,
          hep.fecha_participacion as fecha_evento,
          hep.observaciones,
          dp.estado,
          hep.cedula_empleado as empleado_participante,
          e2.nombre || ' ' || e2.apellidos as nombre_participante,
          hep.fecha_participacion
        FROM historial_empleado_proceso hep
        JOIN detalle_proceso dp ON hep.id_detalle_proceso = dp.id_detalle_proceso
        JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
        JOIN empleado e1 ON dp.cedula_empleado = e1.cedula
        JOIN empleado e2 ON hep.cedula_empleado = e2.cedula
        WHERE dp.id_orden = $1
        
        ORDER BY fecha_evento, tipo_evento
      `;
      
      const result = await db.query(query, [idOrden]);
      
      // Agrupar por proceso para una mejor presentación
      const auditPorProceso = {};
      
      result.rows.forEach(row => {
        const key = `${row.id_detalle_proceso}-${row.proceso}`;
        
        if (!auditPorProceso[key]) {
          auditPorProceso[key] = {
            id_detalle_proceso: row.id_detalle_proceso,
            proceso: row.proceso,
            empleado_responsable: row.empleado_responsable,
            nombre_responsable: row.nombre_responsable,
            fecha_inicio: null,
            estado: row.estado,
            observaciones_proceso: null,
            participantes: []
          };
        }
        
        if (row.tipo_evento === 'PROCESO') {
          auditPorProceso[key].fecha_inicio = row.fecha_evento;
          auditPorProceso[key].observaciones_proceso = row.observaciones;
        } else if (row.tipo_evento === 'PARTICIPACION') {
          auditPorProceso[key].participantes.push({
            cedula: row.empleado_participante,
            nombre: row.nombre_participante,
            fecha_participacion: row.fecha_participacion,
            observaciones: row.observaciones
          });
        }
      });
      
      return {
        success: true,
        data: Object.values(auditPorProceso),
        resumen: {
          total_procesos: Object.keys(auditPorProceso).length,
          total_participaciones: result.rows.filter(r => r.tipo_evento === 'PARTICIPACION').length
        }
      };
    } catch (error) {
      throw new Error(`Error al obtener log de auditoría: ${error.message}`);
    }
  }

  // Obtener historial detallado de avances por empleado (con productos específicos)
  async getDetailedEmployeeAdvanceHistory(idOrden) {
    try {
      const query = `
        WITH empleados_que_avanzan AS (
          SELECT DISTINCT
            hep.id_historial,
            hep.cedula_empleado,
            e.nombre || ' ' || e.apellidos as nombre_completo,
            e.telefono,
            ep.nombre as nombre_proceso,
            ep.id_proceso,
            hep.fecha_participacion,
            hep.observaciones,
            hep.productos_avanzados,
            hep.cantidad_total_avanzada,
            dp.fecha_inicio_proceso,
            dp.fecha_final_proceso,
            dp.estado as estado_proceso,
            dp.id_detalle_proceso,
            -- Información de la orden
            op.id_cliente,
            c.nombre as nombre_cliente,
            op.fecha_aproximada,
            op.prioridad_orden
          FROM historial_empleado_proceso hep
          JOIN detalle_proceso dp ON hep.id_detalle_proceso = dp.id_detalle_proceso
          JOIN empleado e ON hep.cedula_empleado = e.cedula
          JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
          JOIN orden_produccion op ON dp.id_orden = op.id_orden
          JOIN cliente c ON op.id_cliente = c.id_cliente
          WHERE dp.id_orden = $1
          AND hep.observaciones LIKE '%avanza productos%'
        )
        SELECT 
          eqa.*,
          -- Información adicional de productos
          COALESCE(
            (SELECT json_agg(
              json_build_object(
                'id_detalle', dpo.id_detalle,
                'id_producto', dpo.id_producto,
                'nombre_producto', p.nombre_producto,
                'cantidad_total_producto', dpo.cantidad,
                'atributos_usuario', dpo.atributosUsuario,
                'observacion_producto', dpo.observacion,
                'url_producto', dpo.url_producto,
                'estado_producto', dpo.estado
              )
            )
            FROM detalle_producto_orden dpo
            JOIN producto p ON dpo.id_producto = p.id_producto
            WHERE dpo.id_orden = $1
            ), '[]'::json
          ) as productos_orden_completos
        FROM empleados_que_avanzan eqa
        ORDER BY eqa.fecha_participacion
      `;
      
      const result = await db.query(query, [idOrden]);
      
      // Procesar los resultados para incluir información más detallada
      const historialDetallado = result.rows.map(row => ({
        ...row,
        productos_avanzados: row.productos_avanzados || [],
        cantidad_total_avanzada: row.cantidad_total_avanzada || 0,
        resumen_detallado: {
          total_productos_avanzados: row.productos_avanzados ? row.productos_avanzados.length : 0,
          cantidad_total: row.cantidad_total_avanzada || 0,
          descripcion: row.productos_avanzados ? 
            `${row.nombre_completo} avanzó ${row.cantidad_total_avanzada} unidades de ${row.productos_avanzados.length} producto(s) diferentes` :
            `${row.nombre_completo} realizó un avance sin detalles específicos de cantidad`
        }
      }));
      
      return historialDetallado;
    } catch (error) {
      throw new Error(`Error al obtener historial detallado de empleados: ${error.message}`);
    }
  }

}

module.exports = new AdvanceOrderModel();