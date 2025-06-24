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
      // Primero obtenemos todos los confeccionistas
      const confeccionistas = await ConfeccionistaModel.getAllConfeccionistas();
      
      // Para cada confeccionista, obtenemos sus productos
      const confeccionistasConProductos = await Promise.all(
        confeccionistas.map(async (conf) => {
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
          
          // Obtener productos más recientes (limitado a 5)
          const recientes = await pool.query(`
            SELECT 
              pp.id_producto_proceso,
              pp.cantidad,
              pp.fecha_recibido,
              pp.fecha_entrega,
              p.nombre_producto,
              dpo.id_orden
            FROM producto_proceso pp
            JOIN detalle_producto_orden dpo ON pp.id_detalle_producto = dpo.id_detalle
            JOIN producto p ON dpo.id_producto = p.id_producto
            WHERE pp.id_confeccionista = $1
            ORDER BY pp.fecha_registro DESC
            LIMIT 5
          `, [conf.id_confeccionista]);
          
          return {
            ...conf,
            productos_pendientes: {
              total: parseInt(pendientes.rows[0].total) || 0,
              cantidad_total: parseInt(pendientes.rows[0].cantidad_total) || 0
            },
            productos_entregados: {
              total: parseInt(entregados.rows[0].total) || 0,
              cantidad_total: parseInt(entregados.rows[0].cantidad_total) || 0
            },
            productos_recientes: recientes.rows
          };
        })
      );
      
      return confeccionistasConProductos;
    } catch (error) {
      throw new Error(`Error al obtener confeccionistas con productos: ${error.message}`);
    }
  }
};

module.exports = ConfeccionistaModel;