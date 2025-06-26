const pool = require('../database/db.js');

const ConfeccionistaModel = {
  // Obtener todos los confeccionistas con cantidad de productos asignados
  getAllConfeccionistas: async () => {
    try {
      const result = await pool.query(`
        SELECT 
          c.*,
          COUNT(DISTINCT pp.id_producto_proceso) as total_asignaciones,
          SUM(pp.cantidad) as total_prendas_asignadas,
          COUNT(DISTINCT dpo.id_orden) as total_ordenes
        FROM confeccionista c
        LEFT JOIN producto_proceso pp ON c.id_confeccionista = pp.id_confeccionista
        LEFT JOIN detalle_producto_orden dpo ON pp.id_detalle_producto = dpo.id_detalle
        GROUP BY c.id_confeccionista
        ORDER BY c.nombre
      `);
      
      return result.rows;
    } catch (error) {
      throw new Error(`Error al obtener confeccionistas: ${error.message}`);
    }
  },
  
  // Obtener un confeccionista específico por ID
  getConfeccionistaById: async (id) => {
    try {
      const result = await pool.query(`
        SELECT 
          c.*,
          COUNT(DISTINCT pp.id_producto_proceso) as total_asignaciones,
          SUM(pp.cantidad) as total_prendas_asignadas,
          COUNT(DISTINCT dpo.id_orden) as total_ordenes
        FROM confeccionista c
        LEFT JOIN producto_proceso pp ON c.id_confeccionista = pp.id_confeccionista
        LEFT JOIN detalle_producto_orden dpo ON pp.id_detalle_producto = dpo.id_detalle
        WHERE c.id_confeccionista = $1
        GROUP BY c.id_confeccionista
      `, [id]);
      
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error al obtener confeccionista: ${error.message}`);
    }
  },
  
  // Obtener todos los productos asignados a un confeccionista
  getProductosByConfeccionista: async (id) => {
    try {
      const result = await pool.query(`
        SELECT 
          pp.id_producto_proceso,
          pp.id_detalle_producto,
          pp.cantidad,
          pp.fecha_recibido,
          pp.fecha_entrega,
          pp.fecha_registro,
          
          dpo.id_orden,
          dpo.id_producto,
          dpo.cantidad as cantidad_total_producto,
          -- atributosUsuario excluido deliberadamente
          dpo.bordado,
          dpo.observacion as observacion_producto,
          
          p.nombre_producto,
          p.descripcion as descripcion_producto,
          p.id_categoria,
          cat.nombre_categoria,
          
          op.fecha_aproximada,
          op.tipo_pago,
          op.observaciones as observaciones_orden,
          op.prioridad_orden,
          op.activo as orden_activa, /* AÑADIDO: estado de activación de la orden */
          
          cli.nombre as cliente_nombre,
          cli.tipo as tipo_cliente,
          cli.correo as cliente_correo,
          
          dp.id_detalle_proceso,
          dp.id_proceso,
          dp.fecha_inicio_proceso,
          dp.fecha_final_proceso,
          dp.estado as estado_proceso,
          dp.observaciones as observaciones_proceso,
          
          ep.nombre as nombre_proceso,
          
          e.nombre as empleado_nombre,
          e.apellidos as empleado_apellidos,
          e.telefono as empleado_telefono
          
          -- Color y estampado excluidos ya que dependen de atributosUsuario
        FROM producto_proceso pp
        JOIN detalle_producto_orden dpo ON pp.id_detalle_producto = dpo.id_detalle
        JOIN producto p ON dpo.id_producto = p.id_producto
        JOIN categoria cat ON p.id_categoria = cat.id_categoria
        JOIN orden_produccion op ON dpo.id_orden = op.id_orden
        JOIN cliente cli ON op.id_cliente = cli.id_cliente
        JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
        JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
        JOIN empleado e ON dp.cedula_empleado = e.cedula
        WHERE pp.id_confeccionista = $1
        ORDER BY 
          CASE 
            WHEN pp.fecha_entrega IS NULL THEN 0 
            ELSE 1 
          END,
          pp.fecha_registro DESC
      `, [id]);
      
      // Procesar los resultados para estructurar mejor la información
      const productos = result.rows.map(item => ({
        asignacion: {
          id_producto_proceso: item.id_producto_proceso,
          cantidad: item.cantidad,
          fecha_recibido: item.fecha_recibido,
          fecha_entrega: item.fecha_entrega,
          fecha_registro: item.fecha_registro,
          estado: item.fecha_entrega ? 'Entregado' : 'Pendiente'
        },
        producto: {
          id_producto: item.id_producto,
          id_detalle: item.id_detalle_producto,
          nombre_producto: item.nombre_producto,
          descripcion: item.descripcion_producto,
          cantidad_total: item.cantidad_total_producto,
          bordado: item.bordado,
          observacion: item.observacion_producto,
          // atributos excluido
          categoria: {
            id: item.id_categoria,
            nombre: item.nombre_categoria
          }
          // color y estampado excluidos
        },
        orden: {
          id_orden: item.id_orden,
          fecha_aproximada: item.fecha_aproximada,
          tipo_pago: item.tipo_pago,
          observaciones: item.observaciones_orden,
          prioridad: item.prioridad_orden,
          activa: item.orden_activa, /* AÑADIDO: estado de activación de la orden */
          cliente: {
            nombre: item.cliente_nombre,
            tipo: item.tipo_cliente,
            correo: item.cliente_correo
          }
        },
        proceso: {
          id_detalle_proceso: item.id_detalle_proceso,
          id_proceso: item.id_proceso,
          nombre_proceso: item.nombre_proceso,
          fecha_inicio: item.fecha_inicio_proceso,
          fecha_final: item.fecha_final_proceso,
          estado: item.estado_proceso,
          observaciones: item.observaciones_proceso,
          responsable: {
            nombre: item.empleado_nombre,
            apellidos: item.empleado_apellidos,
            telefono: item.empleado_telefono
          }
        }
      }));
      
      return productos;
    } catch (error) {
      throw new Error(`Error al obtener productos del confeccionista: ${error.message}`);
    }
  },
  
  // Obtener resumen de todos los confeccionistas con sus productos
  getAllConfeccionistasWithProducts: async () => {
    try {
      // Primero obtenemos todos los confeccionistas con todos sus datos
      const confeccionistas = await pool.query(`
        SELECT 
          c.id_confeccionista,
          c.cedula,
          c.nombre,
          c.telefono,
          c.direccion,
          c.municipio,
          c.activo,
          COUNT(DISTINCT pp.id_producto_proceso) as total_asignaciones,
          SUM(pp.cantidad) as total_prendas_asignadas,
          COUNT(DISTINCT dpo.id_orden) as total_ordenes
        FROM confeccionista c
        LEFT JOIN producto_proceso pp ON c.id_confeccionista = pp.id_confeccionista
        LEFT JOIN detalle_producto_orden dpo ON pp.id_detalle_producto = dpo.id_detalle
        GROUP BY c.id_confeccionista
        ORDER BY c.nombre
      `);
      
      // Para cada confeccionista, obtenemos sus productos
      const confeccionistasConProductos = await Promise.all(
        confeccionistas.rows.map(async (conf) => {
          // Obtener productos asignados por estado
          const pendientes = await pool.query(`
            SELECT COUNT(*) as total, SUM(pp.cantidad) as cantidad_total
            FROM producto_proceso pp
            WHERE pp.id_confeccionista = $1 AND pp.fecha_entrega IS NULL
          `, [conf.id_confeccionista]);
          
          const entregados = await pool.query(`
            SELECT COUNT(*) as total, SUM(pp.cantidad) as cantidad_total
            FROM producto_proceso pp
            WHERE pp.id_confeccionista = $1 AND pp.fecha_entrega IS NOT NULL
          `, [conf.id_confeccionista]);
          
          // Obtener productos más recientes (limitado a 5) con estado de orden
          const recientes = await pool.query(`
            SELECT 
              pp.id_producto_proceso,
              pp.cantidad,
              pp.fecha_recibido,
              pp.fecha_entrega,
              p.nombre_producto,
              dpo.id_orden,
              op.activo as orden_activa,
              ep.nombre as nombre_proceso,
              dp.estado as estado_proceso,
              cli.nombre as cliente_nombre
            FROM producto_proceso pp
            JOIN detalle_producto_orden dpo ON pp.id_detalle_producto = dpo.id_detalle
            JOIN producto p ON dpo.id_producto = p.id_producto
            JOIN orden_produccion op ON dpo.id_orden = op.id_orden
            JOIN cliente cli ON op.id_cliente = cli.id_cliente
            JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
            JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
            WHERE pp.id_confeccionista = $1
            ORDER BY pp.fecha_registro DESC
            LIMIT 5
          `, [conf.id_confeccionista]);

          // Transformamos la información para mostrar mejor estructura
          const productosRecientes = recientes.rows.map(prod => ({
            id_producto_proceso: prod.id_producto_proceso,
            cantidad: prod.cantidad,
            fecha_recibido: prod.fecha_recibido,
            fecha_entrega: prod.fecha_entrega,
            estado: prod.fecha_entrega ? 'Entregado' : 'Pendiente',
            nombre_producto: prod.nombre_producto,
            id_orden: prod.id_orden,
            cliente_nombre: prod.cliente_nombre,
            orden_activa: prod.orden_activa,
            nombre_proceso: prod.nombre_proceso,
            estado_proceso: prod.estado_proceso
          }));
          
          return {
            // Información detallada del confeccionista
            datos_confeccionista: {
              id_confeccionista: conf.id_confeccionista,
              cedula: conf.cedula,
              nombre: conf.nombre,
              telefono: conf.telefono,
              direccion: conf.direccion,
              municipio: conf.municipio,
              activo: conf.activo
            },
            // Estadísticas
            total_asignaciones: parseInt(conf.total_asignaciones) || 0,
            total_prendas_asignadas: parseInt(conf.total_prendas_asignadas) || 0,
            total_ordenes: parseInt(conf.total_ordenes) || 0,
            productos_pendientes: {
              total: parseInt(pendientes.rows[0].total) || 0,
              cantidad_total: parseInt(pendientes.rows[0].cantidad_total) || 0
            },
            productos_entregados: {
              total: parseInt(entregados.rows[0].total) || 0,
              cantidad_total: parseInt(entregados.rows[0].cantidad_total) || 0
            },
            productos_recientes: productosRecientes
          };
        })
      );
      
      return confeccionistasConProductos;
    } catch (error) {
      throw new Error(`Error al obtener confeccionistas con productos: ${error.message}`);
    }
  },

  createConfeccionista: async (confeccionistaData) => {
    const client = await pool.connect();
    try {
      // Comenzar transacción
      await client.query('BEGIN');
      
      // Validar que los campos obligatorios estén presentes
      const { cedula, nombre, telefono, direccion, municipio } = confeccionistaData;
      
      if (!cedula) {
        throw new Error('La cédula del confeccionista es obligatoria');
      }
      if (!nombre) {
        throw new Error('El nombre del confeccionista es obligatorio');
      }
      if (!direccion) {
        throw new Error('La dirección del confeccionista es obligatoria');
      }
      if (!municipio) {
        throw new Error('El municipio del confeccionista es obligatorio');
      }
      
      // Verificar si ya existe un confeccionista con esa cédula
      const existeQuery = await client.query(
        'SELECT cedula FROM confeccionista WHERE cedula = $1',
        [cedula]
      );
      
      if (existeQuery.rows.length > 0) {
        throw new Error(`Ya existe un confeccionista con la cédula ${cedula}`);
      }
      
      // Insertar el nuevo confeccionista
      const result = await client.query(
        `INSERT INTO confeccionista (cedula, nombre, telefono, direccion, municipio, activo) 
        VALUES ($1, $2, $3, $4, $5, TRUE) 
        RETURNING *`,
        [cedula, nombre, telefono || null, direccion, municipio]
      );
      
      // Confirmar transacción
      await client.query('COMMIT');
      
      return {
        success: true,
        message: 'Confeccionista creado exitosamente',
        data: result.rows[0]
      };
      
    } catch (error) {
      // Revertir transacción en caso de error
      await client.query('ROLLBACK');
      
      if (error.message.includes('Ya existe un confeccionista')) {
        return {
          success: false,
          message: error.message,
          error: 'DUPLICATE_ENTRY'
        };
      }
      
      throw new Error(`Error al crear confeccionista: ${error.message}`);
    } finally {
      // Liberar la conexión
      client.release();
    }
  },

  updateConfeccionista: async (id, confeccionistaData) => {
    const client = await pool.connect();
    try {
      // Comenzar transacción
      await client.query('BEGIN');
      
      // Verificar que el confeccionista existe
      const confeccionistaExistente = await client.query(
        'SELECT * FROM confeccionista WHERE id_confeccionista = $1',
        [id]
      );
      
      if (confeccionistaExistente.rows.length === 0) {
        return {
          success: false,
          message: `No se encontró confeccionista con ID: ${id}`,
          error: 'NOT_FOUND'
        };
      }
      
      // Extraer datos para actualizar
      const { cedula, nombre, telefono, direccion, municipio, activo } = confeccionistaData;
      
      // Si se cambia la cédula, verificar que no exista otro confeccionista con esa cédula
      if (cedula && cedula !== confeccionistaExistente.rows[0].cedula) {
        const existeQuery = await client.query(
          'SELECT cedula FROM confeccionista WHERE cedula = $1 AND id_confeccionista != $2',
          [cedula, id]
        );
        
        if (existeQuery.rows.length > 0) {
          return {
            success: false,
            message: `Ya existe otro confeccionista con la cédula ${cedula}`,
            error: 'DUPLICATE_ENTRY'
          };
        }
      }
      
      // Construir la consulta dinámica para actualizar solo los campos proporcionados
      let queryParts = [];
      let values = [];
      let paramIndex = 1;
      
      if (cedula !== undefined) {
        queryParts.push(`cedula = $${paramIndex}`);
        values.push(cedula);
        paramIndex++;
      }
      
      if (nombre !== undefined) {
        queryParts.push(`nombre = $${paramIndex}`);
        values.push(nombre);
        paramIndex++;
      }
      
      if (telefono !== undefined) {
        queryParts.push(`telefono = $${paramIndex}`);
        values.push(telefono);
        paramIndex++;
      }
      
      if (direccion !== undefined) {
        queryParts.push(`direccion = $${paramIndex}`);
        values.push(direccion);
        paramIndex++;
      }
      
      if (municipio !== undefined) {
        queryParts.push(`municipio = $${paramIndex}`);
        values.push(municipio);
        paramIndex++;
      }
      
      if (activo !== undefined) {
        queryParts.push(`activo = $${paramIndex}`);
        values.push(activo);
        paramIndex++;
      }
      
      // Si no hay campos para actualizar, retornar
      if (queryParts.length === 0) {
        return {
          success: false,
          message: 'No se proporcionaron datos para actualizar',
          error: 'NO_DATA'
        };
      }
      
      // Completar la consulta SQL
      const updateQuery = `
        UPDATE confeccionista 
        SET ${queryParts.join(', ')}
        WHERE id_confeccionista = $${paramIndex}
        RETURNING *
      `;
      
      // Agregar el ID al final
      values.push(id);
      
      // Ejecutar la consulta
      const result = await client.query(updateQuery, values);
      
      // Confirmar transacción
      await client.query('COMMIT');
      
      return {
        success: true,
        message: 'Confeccionista actualizado exitosamente',
        data: result.rows[0]
      };
      
    } catch (error) {
      // Revertir transacción en caso de error
      await client.query('ROLLBACK');
      throw new Error(`Error al actualizar confeccionista: ${error.message}`);
    } finally {
      // Liberar la conexión
      client.release();
    }
  },

  // Eliminar un confeccionista (marcarlo como inactivo)
  deleteConfeccionista: async (id) => {
    const client = await pool.connect();
    try {
      // Comenzar transacción
      await client.query('BEGIN');
      
      // Verificar que el confeccionista existe
      const confeccionistaExistente = await client.query(
        'SELECT * FROM confeccionista WHERE id_confeccionista = $1',
        [id]
      );
      
      if (confeccionistaExistente.rows.length === 0) {
        return {
          success: false,
          message: `No se encontró confeccionista con ID: ${id}`,
          error: 'NOT_FOUND'
        };
      }
      
      // Verificar si tiene productos asignados
      const productosAsignados = await client.query(
        'SELECT COUNT(*) as total FROM producto_proceso WHERE id_confeccionista = $1',
        [id]
      );
      
      const totalAsignaciones = parseInt(productosAsignados.rows[0].total);
      
      // Si tiene productos asignados, solo lo marcamos como inactivo
      if (totalAsignaciones > 0) {
        const result = await client.query(
          'UPDATE confeccionista SET activo = FALSE WHERE id_confeccionista = $1 RETURNING *',
          [id]
        );
        
        // Confirmar transacción
        await client.query('COMMIT');
        
        return {
          success: true,
          message: `Confeccionista marcado como inactivo. Tiene ${totalAsignaciones} productos asignados que se mantienen en el sistema.`,
          data: result.rows[0],
          hasAssignedProducts: true
        };
      }
      
      // Si no tiene productos asignados, lo eliminamos completamente
      await client.query(
        'DELETE FROM confeccionista WHERE id_confeccionista = $1',
        [id]
      );
      
      // Confirmar transacción
      await client.query('COMMIT');
      
      return {
        success: true,
        message: 'Confeccionista eliminado exitosamente',
        data: confeccionistaExistente.rows[0],
        hasAssignedProducts: false
      };
      
    } catch (error) {
      // Revertir transacción en caso de error
      await client.query('ROLLBACK');
      throw new Error(`Error al eliminar confeccionista: ${error.message}`);
    } finally {
      // Liberar la conexión
      client.release();
    }
  }
};



module.exports = ConfeccionistaModel;