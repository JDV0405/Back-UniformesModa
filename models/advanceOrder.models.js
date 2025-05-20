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
              pp.id_producto_proceso, dp.id_detalle_proceso
        FROM detalle_producto_orden dpo
        JOIN producto p ON dpo.id_producto = p.id_producto
        JOIN producto_proceso pp ON dpo.id_detalle = pp.id_detalle_producto
        JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
        WHERE dpo.id_orden = $1 AND dp.id_proceso = $2 AND dp.estado = 'En Proceso'
      `;
      
      const result = await db.query(query, [idOrden, idProceso]);
      return result.rows;
    } catch (error) {
      throw new Error(`Error al obtener los productos en el proceso: ${error.message}`);
    }
  }

  // Avanza productos al siguiente proceso con la nueva estructura de datos
  async advanceProductsToNextProcess(datos) {
      const { 
        idOrden, 
        idProcesoActual, 
        idProcesoSiguiente, 
        cedulaEmpleadoActual,
        itemsToAdvance,
        observaciones 
      } = datos;
      
      try {
        // Iniciamos la transacción
        await db.query('BEGIN');

        // 1. Verificar si ya existe un registro en detalle_proceso para el siguiente proceso
        let detalleProcesoSiguiente = await db.query(
          `SELECT id_detalle_proceso 
          FROM detalle_proceso 
          WHERE id_orden = $1 AND id_proceso = $2 AND estado = 'En Proceso'`,
          [idOrden, idProcesoSiguiente]
        );
        
        // Si no existe, crear el nuevo detalle de proceso
        let idDetalleProcesoSiguiente;
        if (detalleProcesoSiguiente.rows.length === 0) {
          // Crear nuevo registro en detalle_proceso para el siguiente proceso
          const nuevoDetalleProcesoResult = await db.query(
            `INSERT INTO detalle_proceso 
            (id_orden, id_proceso, cedula_empleado, observaciones, estado) 
            VALUES ($1, $2, $3, $4, 'En Proceso') 
            RETURNING id_detalle_proceso`,
            [idOrden, idProcesoSiguiente, cedulaEmpleadoActual, observaciones || null]
          );
          
          idDetalleProcesoSiguiente = nuevoDetalleProcesoResult.rows[0].id_detalle_proceso;
        } else {
          idDetalleProcesoSiguiente = detalleProcesoSiguiente.rows[0].id_detalle_proceso;
          
          // Si hay observaciones nuevas y ya existe el proceso, actualizar las observaciones
          if (observaciones) {
            await db.query(
              `UPDATE detalle_proceso 
              SET observaciones = CASE 
                WHEN observaciones IS NULL THEN $1
                ELSE observaciones || E'\n' || $1
              END
              WHERE id_detalle_proceso = $2`,
              [observaciones, idDetalleProcesoSiguiente]
            );
          }
        }
        
        // 2. Procesar cada producto a avanzar
        for (const item of itemsToAdvance) {
          // Verificar que el producto no esté ya en el proceso siguiente
          const yaExistente = await this.isProductInProcess(item.idDetalle, idProcesoSiguiente);
          if (yaExistente) {
            throw new Error(`El producto con ID ${item.idDetalle} ya está en el proceso destino`);
          }
          
          // Obtener la cantidad total del producto desde la base de datos
          const cantidadResult = await db.query(
            `SELECT cantidad FROM detalle_producto_orden 
            WHERE id_detalle = $1`,
            [item.idDetalle]
          );
          
          if (cantidadResult.rows.length === 0) {
            throw new Error(`No se encontró el producto con ID ${item.idDetalle}`);
          }
          
          const cantidadTotal = cantidadResult.rows[0].cantidad;
          
          // Registrar el producto en el nuevo proceso con su cantidad total
          await db.query(
            `INSERT INTO producto_proceso 
            (id_detalle_producto, id_detalle_proceso, cantidad) 
            VALUES ($1, $2, $3)`,
            [item.idDetalle, idDetalleProcesoSiguiente, cantidadTotal]
          );
        }
        
        // 3. Verificar si todos los productos de la orden han avanzado del proceso actual
        const productosRestantesQuery = await db.query(
          `SELECT dpo.id_detalle 
          FROM detalle_producto_orden dpo
          WHERE dpo.id_orden = $1
          AND NOT EXISTS (
            SELECT 1 FROM producto_proceso pp
            JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
            WHERE pp.id_detalle_producto = dpo.id_detalle 
            AND dp.id_proceso = $2
          )`,
          [idOrden, idProcesoSiguiente]
        );
        
        // Si no quedan productos en el proceso actual, cerramos ese proceso
        if (productosRestantesQuery.rows.length === 0) {
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
}

module.exports = new AdvanceOrderModel();