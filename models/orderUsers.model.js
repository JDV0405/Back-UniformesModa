const pool = require('../database/db.js');
const fs = require('fs');
const path = require('path');

const getOrdersByClientId = async (clienteId) => {
  try {
    // Verificar si el cliente existe
    const clienteQuery = await pool.query(
      `SELECT * FROM cliente WHERE id_cliente = $1`,
      [clienteId]
    );
    
    if (clienteQuery.rows.length === 0) {
      return { clienteExiste: false, orders: [] };
    }
    
    const orders = await pool.query(
      `SELECT op.*, 
              c.nombre as cliente_nombre, c.correo as cliente_correo,
              COALESCE(
                (
                  SELECT dp.estado
                  FROM detalle_proceso dp
                  WHERE dp.id_orden = op.id_orden
                  ORDER BY dp.fecha_inicio_proceso DESC
                  LIMIT 1
                ), 'Pendiente'
              ) AS estado_general,
              (
                SELECT MIN(dp.fecha_inicio_proceso)
                FROM detalle_proceso dp
                WHERE dp.id_orden = op.id_orden
              ) AS fecha_inicio_proceso
      FROM orden_produccion op
      JOIN cliente c ON op.id_cliente = c.id_cliente
      WHERE op.id_cliente = $1`,
      [clienteId]
    );
    
    return { clienteExiste: true, orders: orders.rows };
  } catch (error) {
    throw new Error(`Error al obtener órdenes: ${error.message}`);
  }
};

const getOrderDetailsById = async (orderId) => {
  try {
    // Primero obtenemos la información básica de la orden
    const orderQuery = await pool.query(
      `SELECT op.id_orden, op.fecha_aproximada, op.id_cliente, op.id_direccion,
              cp.url_comprobante,
              e.nombre as empleado_nombre, e.apellidos as empleado_apellidos
       FROM orden_produccion op
       LEFT JOIN comprobante_pago cp ON op.id_comprobante_pago = cp.id_comprobante_pago
       LEFT JOIN empleado e ON op.cedula_empleado_responsable = e.cedula 
       WHERE op.id_orden = $1`,
      [orderId]
    );
    
    if (orderQuery.rows.length === 0) {
      return null;
    }
    
    // Extraemos la información del comprobante
    const orderBasicInfo = orderQuery.rows[0];
    
    // Consulta principal con información relacionada usando la dirección asociada a la orden
    const detailsQuery = await pool.query(
      `SELECT 
        op.*, 
        c.nombre as cliente_nombre, 
        c.correo as cliente_correo,
        c.tipo as tipo_cliente,
        d.direccion as cliente_direccion,
        ci.id_ciudad,
        ci.ciudad as cliente_ciudad,
        dep.id_departamento as departamento_id,
        dep.nombre as departamento_nombre,
        (
          SELECT json_build_object(
            'telefono', tc.telefono,
            'tipo', tc.tipo
          )
          FROM telefono_cliente tc 
          WHERE tc.id_cliente = op.id_cliente
          ORDER BY tc.id_telefono DESC
          LIMIT 1
        ) as telefono_info,
        (CASE 
          WHEN c.tipo = 'Natural' THEN 
            (SELECT json_build_object('tipo_doc', n.tipo_doc, 'profesion', n.profesion)
            FROM cli_natural n WHERE n.id_cliente = c.id_cliente)
          WHEN c.tipo = 'Juridico' THEN 
            (SELECT json_build_object('sector_economico', j.sector_economico)
            FROM juridico j WHERE j.id_cliente = c.id_cliente)
          ELSE NULL
        END) as datos_especificos
      FROM orden_produccion op
      JOIN cliente c ON op.id_cliente = c.id_cliente
      LEFT JOIN direccion d ON op.id_direccion = d.id_direccion
      LEFT JOIN ciudad ci ON d.id_ciudad = ci.id_ciudad
      LEFT JOIN departamento dep ON ci.id_departamento = dep.id_departamento
      WHERE op.id_orden = $1`,
      [orderId]
    );
    
    if (detailsQuery.rows.length === 0) {
      return null;
    }
    
    const order = detailsQuery.rows[0];
    
    // Extraemos y estructuramos los datos agrupados
    if (order.telefono_info) {
      order.cliente_telefono = order.telefono_info.telefono;
      order.tipo_telefono = order.telefono_info.tipo;
      delete order.telefono_info;
    }
    
    // MODIFICADO: Obtener productos con información del proceso actual y confeccionista
    const productsQuery = await pool.query(
      `SELECT 
        dpo.*, 
        p.nombre_producto,
        JSONB_BUILD_OBJECT(
          'id_categoria', c.id_categoria,
          'nombre_categoria', c.nombre_categoria,
          'descripcion', c.descripcion
        ) AS categoria,
        -- Información del proceso actual del producto
        COALESCE(
          (
            SELECT dp.id_proceso
            FROM producto_proceso pp
            JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
            WHERE pp.id_detalle_producto = dpo.id_detalle
            ORDER BY dp.fecha_inicio_proceso DESC
            LIMIT 1
          ), NULL
        ) AS id_proceso_actual,
        COALESCE(
          (
            SELECT ep.nombre
            FROM producto_proceso pp
            JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
            JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
            WHERE pp.id_detalle_producto = dpo.id_detalle
            ORDER BY dp.fecha_inicio_proceso DESC
            LIMIT 1
          ), 'Sin proceso asignado'
        ) AS nombre_proceso_actual,
        -- MODIFICADO: Información del confeccionista asignado con nombre del producto
        (
          SELECT json_build_object(
            'id_confeccionista', conf.id_confeccionista,
            'cedula', conf.cedula,
            'nombre', conf.nombre,
            'telefono', conf.telefono,
            'activo', conf.activo,
            'fecha_recibido', pp.fecha_recibido,
            'fecha_entrega', pp.fecha_entrega,
            'fecha_registro', pp.fecha_registro,
            'cantidad_asignada', pp.cantidad,
            'nombre_producto', p.nombre_producto
          )
          FROM producto_proceso pp
          JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso
          LEFT JOIN confeccionista conf ON pp.id_confeccionista = conf.id_confeccionista
          WHERE pp.id_detalle_producto = dpo.id_detalle
          ORDER BY dp.fecha_inicio_proceso DESC
          LIMIT 1
        ) AS confeccionista_info
      FROM detalle_producto_orden dpo
      JOIN producto p ON dpo.id_producto = p.id_producto
      JOIN categoria c ON p.id_categoria = c.id_categoria
      WHERE dpo.id_orden = $1
      ORDER BY dpo.id_detalle`,
      [orderId]
    );
    
    // MODIFICADO: Obtener procesos de la orden con información detallada del confeccionista y nombres de productos
    const processesQuery = await pool.query(
      `SELECT 
        dp.*, 
        ep.nombre as nombre_proceso,
        e.nombre as empleado_nombre,
        e.apellidos as empleado_apellidos,
        e.telefono as empleado_telefono,
        -- Información de productos en este proceso
        (
          SELECT COUNT(DISTINCT pp.id_detalle_producto)
          FROM producto_proceso pp
          WHERE pp.id_detalle_proceso = dp.id_detalle_proceso
        ) as productos_en_proceso,
        (
          SELECT SUM(pp.cantidad)
          FROM producto_proceso pp
          WHERE pp.id_detalle_proceso = dp.id_detalle_proceso
        ) as cantidad_total_proceso,
        -- MODIFICADO: Información de confeccionistas en este proceso con nombres de productos
        (
          SELECT json_agg(
            json_build_object(
              'id_confeccionista', conf.id_confeccionista,
              'cedula', conf.cedula,
              'nombre', conf.nombre,
              'telefono', conf.telefono,
              'cantidad_asignada', pp.cantidad,
              'fecha_recibido', pp.fecha_recibido,
              'fecha_entrega', pp.fecha_entrega,
              'fecha_registro', pp.fecha_registro,
              'id_producto_proceso', pp.id_producto_proceso,
              'nombre_producto', prod.nombre_producto,
              'id_producto', prod.id_producto
            )
          )
          FROM producto_proceso pp
          LEFT JOIN confeccionista conf ON pp.id_confeccionista = conf.id_confeccionista
          LEFT JOIN detalle_producto_orden dpo ON pp.id_detalle_producto = dpo.id_detalle
          LEFT JOIN producto prod ON dpo.id_producto = prod.id_producto
          WHERE pp.id_detalle_proceso = dp.id_detalle_proceso
            AND conf.id_confeccionista IS NOT NULL
        ) as confeccionistas_asignados
      FROM detalle_proceso dp
      JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
      JOIN empleado e ON dp.cedula_empleado = e.cedula
      WHERE dp.id_orden = $1
      ORDER BY dp.fecha_inicio_proceso ASC`,
      [orderId]
    );

    const valoracionQuery = await pool.query(
      `SELECT 
        id_valoracion,
        estrellas,
        comentario,
        fecha_valoracion
       FROM valoracion
       WHERE id_orden_produccion = $1`,
      [orderId]
    );

    const valoracion = valoracionQuery.rows.length > 0 ? valoracionQuery.rows[0] : null;
    
    // Procesamiento de colores
    const colorsQuery = await pool.query(
      `SELECT id_color, nombre_color, codigo_hex FROM color`
    );
    
    const colorMap = {};
    colorsQuery.rows.forEach(color => {
      colorMap[color.nombre_color.toLowerCase()] = {
        id_color: color.id_color,
        codigo_hex: color.codigo_hex,
        nombre_color: color.nombre_color
      };
    });
    
    // Procesamiento de estampados
    const estampadosQuery = await pool.query(
      `SELECT id_estampado, nombre_estampado FROM estampado`
    );
    
    const estampadoMap = {};
    estampadosQuery.rows.forEach(estampado => {
      estampadoMap[estampado.nombre_estampado.toLowerCase()] = {
        id_estampado: estampado.id_estampado,
        nombre_estampado: estampado.nombre_estampado
      };
    });
    
    // MODIFICADO: Procesamiento de productos con información del confeccionista
    const productosConColores = productsQuery.rows.map(producto => {
      const productoConColor = { ...producto };
      
      // Nos aseguramos de que atributosusuario sea un objeto
      if (!productoConColor.atributosusuario) {
        productoConColor.atributosusuario = {};
      }
      
      // Procesamiento de confeccionista
      if (productoConColor.confeccionista_info) {
        productoConColor.confeccionista = productoConColor.confeccionista_info;
        delete productoConColor.confeccionista_info;
      } else {
        productoConColor.confeccionista = null;
      }
      
      // Procesamiento de color
      if (productoConColor.atributosusuario.color) {
        const nombreColor = productoConColor.atributosusuario.color.toLowerCase();
        
        if (colorMap[nombreColor]) {
          productoConColor.color_id = colorMap[nombreColor].id_color;
          productoConColor.color_nombre = colorMap[nombreColor].nombre_color;
          productoConColor.color_hexadecimal = colorMap[nombreColor].codigo_hex;
        } else {
          const colorParcial = Object.keys(colorMap).find(color => 
            nombreColor.includes(color.toLowerCase()) || color.toLowerCase().includes(nombreColor)
          );
          
          if (colorParcial) {
            productoConColor.color_id = colorMap[colorParcial].id_color;
            productoConColor.color_nombre = colorMap[colorParcial].nombre_color;
            productoConColor.color_hexadecimal = colorMap[colorParcial].codigo_hex;
          } else {
            productoConColor.color_id = null;
            productoConColor.color_nombre = null;
            productoConColor.color_hexadecimal = null;
          }
        }
      } else {
        productoConColor.color_id = null;
        productoConColor.color_nombre = null;
        productoConColor.color_hexadecimal = null;
      }
      
      // Procesamiento de estampado
      if (productoConColor.atributosusuario.estampado) {
        const nombreEstampado = productoConColor.atributosusuario.estampado.toLowerCase();
        
        if (estampadoMap[nombreEstampado]) {
          productoConColor.estampado_id = estampadoMap[nombreEstampado].id_estampado;
          productoConColor.estampado_nombre = estampadoMap[nombreEstampado].nombre_estampado;
        } else {
          const estampadoParcial = Object.keys(estampadoMap).find(estampado => 
            nombreEstampado.includes(estampado.toLowerCase()) || estampado.toLowerCase().includes(nombreEstampado)
          );
          
          if (estampadoParcial) {
            productoConColor.estampado_id = estampadoMap[estampadoParcial].id_estampado;
            productoConColor.estampado_nombre = estampadoMap[estampadoParcial].nombre_estampado;
          } else {
            productoConColor.estampado_id = null;
            productoConColor.estampado_nombre = null;
          }
        }
      } else {
        productoConColor.estampado_id = null;
        productoConColor.estampado_nombre = null;
      }
      
      return productoConColor;
    });

    // Procesamiento del comprobante de pago
    let comprobanteBase64 = null;
    if (orderBasicInfo.url_comprobante) {
      try {
        const fileName = path.basename(orderBasicInfo.url_comprobante);
        const imagePath = path.join('C:\\Users\\Asus\\Desktop\\Uniformes_Imagenes\\comprobantes', fileName);
        
        if (fs.existsSync(imagePath)) {
          const imageBuffer = fs.readFileSync(imagePath);
          const imageExtension = path.extname(imagePath).toLowerCase();
          const mimeType = imageExtension === '.png' ? 'image/png' : 'image/jpeg';
          comprobanteBase64 = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
        } else {
          const alternativePath = orderBasicInfo.url_comprobante.replace(/\//g, '\\');
          const fullAlternativePath = `C:\\Users\\Asus\\Desktop\\${alternativePath}`;
          
          if (fs.existsSync(fullAlternativePath)) {
            const imageBuffer = fs.readFileSync(fullAlternativePath);
            const imageExtension = path.extname(fullAlternativePath).toLowerCase();
            const mimeType = imageExtension === '.png' ? 'image/png' : 'image/jpeg';
            comprobanteBase64 = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
          }
        }
      } catch (error) {
        console.log('Error al convertir comprobante a base64:', error);
      }
    }
    
    return {
      ...order,
      url_comprobante: comprobanteBase64,
      empleado_responsable: {
        nombre: orderBasicInfo.empleado_nombre,
        apellidos: orderBasicInfo.empleado_apellidos
      },
      productos: productosConColores,
      procesos: processesQuery.rows,
      proceso_actual: processesQuery.rows.length > 0 ? 
        processesQuery.rows[processesQuery.rows.length - 1] : null,
      valoracion: valoracion // Añadida la información de valoración a la respuesta
    };
  } catch (error) {
    throw new Error(`Error al obtener detalles de la orden: ${error.message}`);
  }
};

const getProductsByOrderAndProcess = async (orderId, processId) => {
  try {
    // Validar que la orden existe y obtener información completa de la orden
    const orderQuery = await pool.query(
      `SELECT 
        op.*,
        c.nombre as cliente_nombre, 
        c.correo as cliente_correo,
        c.tipo as tipo_cliente,
        d.direccion as cliente_direccion,
        ci.id_ciudad,
        ci.ciudad as cliente_ciudad,
        dep.id_departamento as departamento_id,
        dep.nombre as departamento_nombre,
        cp.url_comprobante,
        e.nombre as empleado_nombre, 
        e.apellidos as empleado_apellidos,
        (
          SELECT json_build_object(
            'telefono', tc.telefono,
            'tipo', tc.tipo
          )
          FROM telefono_cliente tc 
          WHERE tc.id_cliente = op.id_cliente
          ORDER BY tc.id_telefono DESC
          LIMIT 1
        ) as telefono_info,
        (CASE 
          WHEN c.tipo = 'Natural' THEN 
            (SELECT json_build_object('tipo_doc', n.tipo_doc, 'profesion', n.profesion)
            FROM cli_natural n WHERE n.id_cliente = c.id_cliente)
          WHEN c.tipo = 'Juridico' THEN 
            (SELECT json_build_object('sector_economico', j.sector_economico)
            FROM juridico j WHERE j.id_cliente = c.id_cliente)
          ELSE NULL
        END) as datos_especificos
      FROM orden_produccion op
      JOIN cliente c ON op.id_cliente = c.id_cliente
      LEFT JOIN direccion d ON op.id_direccion = d.id_direccion
      LEFT JOIN ciudad ci ON d.id_ciudad = ci.id_ciudad
      LEFT JOIN departamento dep ON ci.id_departamento = dep.id_departamento
      LEFT JOIN comprobante_pago cp ON op.id_comprobante_pago = cp.id_comprobante_pago
      LEFT JOIN empleado e ON op.cedula_empleado_responsable = e.cedula
      WHERE op.id_orden = $1`,
      [orderId]
    );
    
    if (orderQuery.rows.length === 0) {
      return { orderExists: false, products: [], orderInfo: null };
    }

    const orderInfo = orderQuery.rows[0];

    // Estructurar información del teléfono
    if (orderInfo.telefono_info) {
      orderInfo.cliente_telefono = orderInfo.telefono_info.telefono;
      orderInfo.tipo_telefono = orderInfo.telefono_info.tipo;
      delete orderInfo.telefono_info;
    }

    // Procesar comprobante a base64 si existe
    let comprobanteBase64 = null;
    if (orderInfo.url_comprobante) {
      try {
        const fileName = path.basename(orderInfo.url_comprobante);
        const imagePath = path.join('C:\\Users\\Asus\\Desktop\\Uniformes_Imagenes\\comprobantes', fileName);
        
        if (fs.existsSync(imagePath)) {
          const imageBuffer = fs.readFileSync(imagePath);
          const imageExtension = path.extname(imagePath).toLowerCase();
          const mimeType = imageExtension === '.png' ? 'image/png' : 'image/jpeg';
          comprobanteBase64 = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
        } else {
          const alternativePath = orderInfo.url_comprobante.replace(/\//g, '\\');
          const fullAlternativePath = `C:\\Users\\Asus\\Desktop\\${alternativePath}`;
          
          if (fs.existsSync(fullAlternativePath)) {
            const imageBuffer = fs.readFileSync(fullAlternativePath);
            const imageExtension = path.extname(fullAlternativePath).toLowerCase();
            const mimeType = imageExtension === '.png' ? 'image/png' : 'image/jpeg';
            comprobanteBase64 = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
          }
        }
      } catch (error) {
        console.log('Error al convertir comprobante a base64:', error);
      }
    }

    // Consulta principal para obtener productos por orden y proceso
    const productsQuery = await pool.query(
      `WITH producto_procesos AS (
        SELECT 
          dpo.id_detalle, dpo.id_orden, dpo.id_producto, dpo.cantidad as cantidad_total,
          dpo.atributosUsuario, dpo.bordado, dpo.observacion,
          dpo.url_producto, dpo.estado,
          p.nombre_producto,
          JSONB_BUILD_OBJECT(
            'id_categoria', c.id_categoria,
            'nombre_categoria', c.nombre_categoria,
            'descripcion', c.descripcion
          ) AS categoria,
          COALESCE(pp.cantidad, 0) as cantidad_en_proceso,
          COALESCE(dp.id_proceso, 1) as id_proceso_actual,
          COALESCE(ep.nombre, 'Solicitud') as nombre_proceso_actual,
          dp.fecha_inicio_proceso,
          dp.fecha_final_proceso,
          dp.estado as estado_proceso,
          e.nombre as empleado_proceso_nombre,
          e.apellidos as empleado_proceso_apellidos
        FROM detalle_producto_orden dpo
        JOIN producto p ON dpo.id_producto = p.id_producto
        JOIN categoria c ON p.id_categoria = c.id_categoria
        LEFT JOIN producto_proceso pp ON dpo.id_detalle = pp.id_detalle_producto
        LEFT JOIN detalle_proceso dp ON pp.id_detalle_proceso = dp.id_detalle_proceso 
          AND dp.estado = 'En Proceso'
        LEFT JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
        LEFT JOIN empleado e ON dp.cedula_empleado = e.cedula
        WHERE dpo.id_orden = $1
      )
      SELECT 
        id_detalle, id_orden, id_producto, cantidad_total, 
        cantidad_en_proceso as cantidad,
        atributosUsuario, bordado, observacion, url_producto, estado,
        nombre_producto, categoria, id_proceso_actual, nombre_proceso_actual,
        fecha_inicio_proceso, fecha_final_proceso, estado_proceso,
        empleado_proceso_nombre, empleado_proceso_apellidos
      FROM producto_procesos
      WHERE id_proceso_actual = $2 
        AND (cantidad_en_proceso > 0 OR (cantidad_en_proceso = 0 AND id_proceso_actual = 1))
      ORDER BY id_detalle, id_proceso_actual`,
      [orderId, processId]
    );

    // Obtener mapas de colores y estampados para procesamiento
    const colorsQuery = await pool.query(
      `SELECT id_color, nombre_color, codigo_hex FROM color`
    );
    
    const colorMap = {};
    colorsQuery.rows.forEach(color => {
      colorMap[color.nombre_color.toLowerCase()] = {
        id_color: color.id_color,
        codigo_hex: color.codigo_hex,
        nombre_color: color.nombre_color
      };
    });

    const estampadosQuery = await pool.query(
      `SELECT id_estampado, nombre_estampado FROM estampado`
    );
    
    const estampadoMap = {};
    estampadosQuery.rows.forEach(estampado => {
      estampadoMap[estampado.nombre_estampado.toLowerCase()] = {
        id_estampado: estampado.id_estampado,
        nombre_estampado: estampado.nombre_estampado
      };
    });

    // Procesar productos con información de colores y estampados
    const productosConColores = productsQuery.rows.map(producto => {
      const productoConColor = { ...producto };
      
      // Asegurar que atributosusuario sea un objeto
      if (!productoConColor.atributosusuario) {
        productoConColor.atributosusuario = {};
      }
      
      // Procesamiento de color
      if (productoConColor.atributosusuario.color) {
        const nombreColor = productoConColor.atributosusuario.color.toLowerCase();
        
        if (colorMap[nombreColor]) {
          productoConColor.color_id = colorMap[nombreColor].id_color;
          productoConColor.color_nombre = colorMap[nombreColor].nombre_color;
          productoConColor.color_hexadecimal = colorMap[nombreColor].codigo_hex;
        } else {
          const colorParcial = Object.keys(colorMap).find(color => 
            nombreColor.includes(color.toLowerCase()) || color.toLowerCase().includes(nombreColor)
          );
          
          if (colorParcial) {
            productoConColor.color_id = colorMap[colorParcial].id_color;
            productoConColor.color_nombre = colorMap[colorParcial].nombre_color;
            productoConColor.color_hexadecimal = colorMap[colorParcial].codigo_hex;
          } else {
            productoConColor.color_id = null;
            productoConColor.color_nombre = null;
            productoConColor.color_hexadecimal = null;
          }
        }
      } else {
        productoConColor.color_id = null;
        productoConColor.color_nombre = null;
        productoConColor.color_hexadecimal = null;
      }
      
      // Procesamiento de estampado
      if (productoConColor.atributosusuario.estampado) {
        const nombreEstampado = productoConColor.atributosusuario.estampado.toLowerCase();
        
        if (estampadoMap[nombreEstampado]) {
          productoConColor.estampado_id = estampadoMap[nombreEstampado].id_estampado;
          productoConColor.estampado_nombre = estampadoMap[nombreEstampado].nombre_estampado;
        } else {
          const estampadoParcial = Object.keys(estampadoMap).find(estampado => 
            nombreEstampado.includes(estampado.toLowerCase()) || estampado.toLowerCase().includes(nombreEstampado)
          );
          
          if (estampadoParcial) {
            productoConColor.estampado_id = estampadoMap[estampadoParcial].id_estampado;
            productoConColor.estampado_nombre = estampadoMap[estampadoParcial].nombre_estampado;
          } else {
            productoConColor.estampado_id = null;
            productoConColor.estampado_nombre = null;
          }
        }
      } else {
        productoConColor.estampado_id = null;
        productoConColor.estampado_nombre = null;
      }

      // Agregar información del empleado responsable del proceso específico
      if (productoConColor.empleado_proceso_nombre && productoConColor.empleado_proceso_apellidos) {
        productoConColor.empleado_proceso_responsable = {
          nombre: productoConColor.empleado_proceso_nombre,
          apellidos: productoConColor.empleado_proceso_apellidos
        };
        delete productoConColor.empleado_proceso_nombre;
        delete productoConColor.empleado_proceso_apellidos;
      }
      
      return productoConColor;
    });

    // Estructurar la información completa de la orden
    const orderCompleteInfo = {
      ...orderInfo,
      url_comprobante: comprobanteBase64,
      empleado_responsable: {
        nombre: orderInfo.empleado_nombre,
        apellidos: orderInfo.empleado_apellidos
      }
    };

    // Limpiar campos duplicados
    delete orderCompleteInfo.empleado_nombre;
    delete orderCompleteInfo.empleado_apellidos;

    return { 
      orderExists: true, 
      products: productosConColores,
      orderInfo: orderCompleteInfo,
      processInfo: productosConColores.length > 0 ? {
        id_proceso: processId,
        nombre_proceso: productosConColores[0].nombre_proceso_actual
      } : null
    };
  } catch (error) {
    throw new Error(`Error al obtener productos por orden y proceso: ${error.message}`);
  }
};

module.exports = {
  getOrdersByClientId,
  getOrderDetailsById,
  getProductsByOrderAndProcess,
};