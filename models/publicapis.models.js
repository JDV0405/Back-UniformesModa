const pool = require('../database/db.js');

// Obtener datos completos del cliente
const obtenerDatosCliente = async (id_cliente) => {
  const query = `
    SELECT 
      c.id_cliente,
      c.nombre,
      c.tipo,
      c.correo,
      cn.tipo_doc,
      cn.profesion,
      j.sector_economico,
      (
        SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'id_direccion', d.id_direccion,
            'direccion', d.direccion,
            'ciudad', ci.ciudad,
            'departamento', dep.nombre
          )
        )
        FROM direccion d
        LEFT JOIN ciudad ci ON d.id_ciudad = ci.id_ciudad
        LEFT JOIN departamento dep ON ci.id_departamento = dep.id_departamento
        WHERE d.id_cliente = c.id_cliente
      ) AS direcciones,
      (
        SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'id_telefono', tc.id_telefono,
            'telefono', tc.telefono,
            'tipo', tc.tipo
          )
        )
        FROM telefono_cliente tc
        WHERE tc.id_cliente = c.id_cliente
      ) AS telefonos
    FROM cliente c
    LEFT JOIN cli_natural cn ON c.id_cliente = cn.id_cliente
    LEFT JOIN juridico j ON c.id_cliente = j.id_cliente
    WHERE c.id_cliente = $1
  `;
  
  const result = await pool.query(query, [id_cliente]);
  return result.rows[0];
};

// Obtener productos por categoría
const obtenerProductosPorCategoria = async (id_categoria, activo = true) => {
  const query = `
    SELECT 
      p.id_producto,
      p.nombre_producto,
      p.descripcion,
      p.atributos,
      p.activo,
      c.nombre_categoria,
      c.descripcion as categoria_descripcion,
      (
        SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'id_color', col.id_color,
            'nombre_color', col.nombre_color,
            'codigo_hex', col.codigo_hex
          )
        )
        FROM categoria_color cc
        LEFT JOIN color col ON cc.id_color = col.id_color
        WHERE cc.id_categoria = c.id_categoria
      ) AS colores_disponibles,
      (
        SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'id_estampado', est.id_estampado,
            'nombre_estampado', est.nombre_estampado,
            'descripcion', est.descripcion
          )
        )
        FROM categoria_estampado ce
        LEFT JOIN estampado est ON ce.id_estampado = est.id_estampado
        WHERE ce.id_categoria = c.id_categoria
      ) AS estampados_disponibles
    FROM producto p
    INNER JOIN categoria c ON p.id_categoria = c.id_categoria
    WHERE p.id_categoria = $1 AND p.activo = $2
    ORDER BY p.nombre_producto
  `;
  
  const result = await pool.query(query, [id_categoria, activo]);
  return result.rows;
};

// Obtener todas las categorías
const obtenerCategorias = async () => {
  const query = `
    SELECT 
      id_categoria,
      nombre_categoria,
      descripcion,
      (SELECT COUNT(*) FROM producto WHERE id_categoria = c.id_categoria AND activo = true) as total_productos
    FROM categoria c
    ORDER BY nombre_categoria
  `;
  
  const result = await pool.query(query);
  return result.rows;
};

// Obtener productos más vendidos
const obtenerProductosMasVendidos = async (limite = 10) => {
  const query = `
    SELECT 
      p.id_producto,
      p.nombre_producto,
      p.descripcion,
      c.nombre_categoria,
      SUM(dpo.cantidad) as total_vendido,
      COUNT(DISTINCT dpo.id_orden) as total_ordenes
    FROM producto p
    INNER JOIN categoria c ON p.id_categoria = c.id_categoria
    INNER JOIN detalle_producto_orden dpo ON p.id_producto = dpo.id_producto
    INNER JOIN orden_produccion op ON dpo.id_orden = op.id_orden
    WHERE p.activo = true
    GROUP BY p.id_producto, p.nombre_producto, p.descripcion, c.nombre_categoria
    ORDER BY total_vendido DESC
    LIMIT $1
  `;
  
  const result = await pool.query(query, [limite]);
  return result.rows;
};

// Obtener colores disponibles
const obtenerColores = async () => {
  const query = `
    SELECT 
      id_color,
      nombre_color,
      codigo_hex
    FROM color
    ORDER BY nombre_color
  `;
  
  const result = await pool.query(query);
  return result.rows;
};

// Obtener estampados disponibles
const obtenerEstampados = async () => {
  const query = `
    SELECT 
      id_estampado,
      nombre_estampado,
      descripcion
    FROM estampado
    ORDER BY nombre_estampado
  `;
  
  const result = await pool.query(query);
  return result.rows;
};

// Obtener departamentos
const obtenerDepartamentos = async () => {
  const query = `
    SELECT 
      id_departamento,
      nombre,
      (SELECT COUNT(*) FROM ciudad WHERE id_departamento = d.id_departamento) as total_ciudades
    FROM departamento d
    ORDER BY nombre
  `;
  
  const result = await pool.query(query);
  return result.rows;
};

// Obtener ciudades por departamento
const obtenerCiudadesPorDepartamento = async (id_departamento) => {
  const query = `
    SELECT 
      id_ciudad,
      ciudad,
      id_departamento
    FROM ciudad
    WHERE id_departamento = $1
    ORDER BY ciudad
  `;
  
  const result = await pool.query(query, [id_departamento]);
  return result.rows;
};

// Obtener estadísticas de valoraciones
const obtenerEstadisticasValoraciones = async () => {
  const query = `
    SELECT 
      AVG(estrellas) as promedio_valoraciones,
      COUNT(*) as total_valoraciones,
      COUNT(CASE WHEN estrellas = 5 THEN 1 END) as cinco_estrellas,
      COUNT(CASE WHEN estrellas = 4 THEN 1 END) as cuatro_estrellas,
      COUNT(CASE WHEN estrellas = 3 THEN 1 END) as tres_estrellas,
      COUNT(CASE WHEN estrellas = 2 THEN 1 END) as dos_estrellas,
      COUNT(CASE WHEN estrellas = 1 THEN 1 END) as una_estrella
    FROM valoracion
  `;
  
  const result = await pool.query(query);
  return result.rows[0];
};

// Obtener órdenes por cliente
const obtenerOrdenesPorCliente = async (id_cliente, estado = null) => {
  let query = `
    SELECT 
      op.id_orden,
      op.fecha_aproximada,
      op.tipo_pago,
      op.prioridad_orden,
      op.observaciones,
      op.activo,
      e.nombre as empleado_responsable,
      e.apellidos as empleado_apellidos,
      d.direccion,
      ci.ciudad,
      dep.nombre as departamento,
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id_detalle', dpo.id_detalle,
          'producto', p.nombre_producto,
          'cantidad', dpo.cantidad,
          'estado', dpo.estado,
          'observacion', dpo.observacion
        )
      ) AS detalles_productos
    FROM orden_produccion op
    INNER JOIN empleado e ON op.cedula_empleado_responsable = e.cedula
    INNER JOIN direccion d ON op.id_direccion = d.id_direccion
    INNER JOIN ciudad ci ON d.id_ciudad = ci.id_ciudad
    INNER JOIN departamento dep ON ci.id_departamento = dep.id_departamento
    LEFT JOIN detalle_producto_orden dpo ON op.id_orden = dpo.id_orden
    LEFT JOIN producto p ON dpo.id_producto = p.id_producto
    WHERE op.id_cliente = $1
  `;
  
  const params = [id_cliente];
  
  if (estado) {
    query += ` AND dpo.estado = $2`;
    params.push(estado);
  }
  
  query += `
    GROUP BY op.id_orden, op.fecha_aproximada, op.tipo_pago, op.prioridad_orden, 
             op.observaciones, op.activo, e.nombre, e.apellidos, d.direccion, ci.ciudad, dep.nombre
    ORDER BY op.fecha_aproximada DESC
  `;
  
  const result = await pool.query(query, params);
  return result.rows;
};

// Obtener detalles completos de un producto
const obtenerDetalleProducto = async (id_producto) => {
  const query = `
    SELECT 
      p.id_producto,
      p.nombre_producto,
      p.descripcion,
      p.atributos,
      p.activo,
      c.nombre_categoria,
      c.descripcion as categoria_descripcion,
      (
        SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'id_color', col.id_color,
            'nombre_color', col.nombre_color,
            'codigo_hex', col.codigo_hex
          )
        )
        FROM categoria_color cc
        LEFT JOIN color col ON cc.id_color = col.id_color
        WHERE cc.id_categoria = c.id_categoria
      ) AS colores_disponibles,
      (
        SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'id_estampado', est.id_estampado,
            'nombre_estampado', est.nombre_estampado,
            'descripcion', est.descripcion
          )
        )
        FROM categoria_estampado ce
        LEFT JOIN estampado est ON ce.id_estampado = est.id_estampado
        WHERE ce.id_categoria = c.id_categoria
      ) AS estampados_disponibles,
      (
        SELECT COUNT(*) 
        FROM detalle_producto_orden dpo 
        WHERE dpo.id_producto = p.id_producto
      ) AS total_ordenes,
      (
        SELECT COALESCE(SUM(dpo.cantidad), 0) 
        FROM detalle_producto_orden dpo 
        WHERE dpo.id_producto = p.id_producto
      ) AS total_vendido
    FROM producto p
    INNER JOIN categoria c ON p.id_categoria = c.id_categoria
    WHERE p.id_producto = $1
  `;
  
  const result = await pool.query(query, [id_producto]);
  return result.rows[0];
};

// Obtener productos por búsqueda de texto
const buscarProductos = async (termino_busqueda, limite = 20) => {
  const query = `
    SELECT 
      p.id_producto,
      p.nombre_producto,
      p.descripcion,
      p.atributos,
      c.nombre_categoria,
      COALESCE(SUM(dpo.cantidad), 0) as total_vendido
    FROM producto p
    INNER JOIN categoria c ON p.id_categoria = c.id_categoria
    LEFT JOIN detalle_producto_orden dpo ON p.id_producto = dpo.id_producto
    WHERE p.activo = true 
      AND (
        LOWER(p.nombre_producto) LIKE LOWER($1) 
        OR LOWER(p.descripcion) LIKE LOWER($1)
        OR LOWER(c.nombre_categoria) LIKE LOWER($1)
      )
    GROUP BY p.id_producto, p.nombre_producto, p.descripcion, p.atributos, c.nombre_categoria
    ORDER BY total_vendido DESC, p.nombre_producto ASC
    LIMIT $2
  `;
  
  const searchTerm = `%${termino_busqueda}%`;
  const result = await pool.query(query, [searchTerm, limite]);
  return result.rows;
};

// Obtener estado de una orden específica
const obtenerEstadoOrden = async (id_orden) => {
  const query = `
    SELECT 
      op.id_orden,
      op.fecha_aproximada,
      op.tipo_pago,
      op.prioridad_orden,
      op.observaciones,
      op.activo,
      c.nombre as cliente_nombre,
      c.tipo as cliente_tipo,
      e.nombre as empleado_responsable,
      e.apellidos as empleado_apellidos,
      d.direccion,
      ci.ciudad,
      dep.nombre as departamento,
      (
        SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'id_detalle', dpo.id_detalle,
            'producto', p.nombre_producto,
            'cantidad', dpo.cantidad,
            'estado', dpo.estado,
            'observacion', dpo.observacion,
            'url_producto', dpo.url_producto,
            'atributos_usuario', dpo.atributosusuario
          )
        )
        FROM detalle_producto_orden dpo
        LEFT JOIN producto p ON dpo.id_producto = p.id_producto
        WHERE dpo.id_orden = op.id_orden
      ) AS detalles_productos,
      (
        SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'id_proceso', ep.id_proceso,
            'nombre_proceso', ep.nombre,
            'fecha_inicio', dp.fecha_inicio_proceso,
            'fecha_final', dp.fecha_final_proceso,
            'estado', dp.estado,
            'observaciones', dp.observaciones
          )
        )
        FROM detalle_proceso dp
        LEFT JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
        WHERE dp.id_orden = op.id_orden
      ) AS procesos
    FROM orden_produccion op
    INNER JOIN cliente c ON op.id_cliente = c.id_cliente
    INNER JOIN empleado e ON op.cedula_empleado_responsable = e.cedula
    INNER JOIN direccion d ON op.id_direccion = d.id_direccion
    INNER JOIN ciudad ci ON d.id_ciudad = ci.id_ciudad
    INNER JOIN departamento dep ON ci.id_departamento = dep.id_departamento
    WHERE op.id_orden = $1
  `;
  
  const result = await pool.query(query, [id_orden]);
  return result.rows[0];
};

// Obtener valoraciones de productos
const obtenerValoracionesProductos = async (limite = 20) => {
  const query = `
    SELECT 
      v.id_valoracion,
      v.estrellas,
      v.comentario,
      v.fecha_valoracion,
      c.nombre as cliente_nombre,
      op.id_orden,
      (
        SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'id_producto', p.id_producto,
            'nombre_producto', p.nombre_producto,
            'cantidad', dpo.cantidad
          )
        )
        FROM detalle_producto_orden dpo
        LEFT JOIN producto p ON dpo.id_producto = p.id_producto
        WHERE dpo.id_orden = op.id_orden
      ) AS productos_valorados
    FROM valoracion v
    INNER JOIN orden_produccion op ON v.id_orden_produccion = op.id_orden
    INNER JOIN cliente c ON op.id_cliente = c.id_cliente
    ORDER BY v.fecha_valoracion DESC
    LIMIT $1
  `;
  
  const result = await pool.query(query, [limite]);
  return result.rows;
};

// Obtener resumen de órdenes por estado
const obtenerResumenOrdenesPorEstado = async () => {
  const query = `
    SELECT 
      dpo.estado,
      COUNT(*) as total_ordenes,
      SUM(dpo.cantidad) as total_productos,
      AVG(dpo.cantidad) as promedio_productos_por_orden
    FROM detalle_producto_orden dpo
    INNER JOIN orden_produccion op ON dpo.id_orden = op.id_orden
    WHERE op.activo = true
    GROUP BY dpo.estado
    ORDER BY total_ordenes DESC
  `;
  
  const result = await pool.query(query);
  return result.rows;
};

// Obtener categorías con más productos vendidos
const obtenerCategoriasMasVendidas = async (limite = 10) => {
  const query = `
    SELECT 
      c.id_categoria,
      c.nombre_categoria,
      c.descripcion,
      COUNT(DISTINCT p.id_producto) as total_productos,
      SUM(dpo.cantidad) as total_vendido,
      COUNT(DISTINCT dpo.id_orden) as total_ordenes
    FROM categoria c
    INNER JOIN producto p ON c.id_categoria = p.id_categoria
    INNER JOIN detalle_producto_orden dpo ON p.id_producto = dpo.id_producto
    WHERE p.activo = true
    GROUP BY c.id_categoria, c.nombre_categoria, c.descripcion
    ORDER BY total_vendido DESC
    LIMIT $1
  `;
  
  const result = await pool.query(query, [limite]);
  return result.rows;
};

// Obtener órdenes recientes
const obtenerOrdenesRecientes = async (limite = 10) => {
  const query = `
    SELECT 
      op.id_orden,
      op.fecha_aproximada,
      op.tipo_pago,
      op.prioridad_orden,
      c.nombre as cliente_nombre,
      c.tipo as cliente_tipo,
      e.nombre as empleado_responsable,
      ci.ciudad,
      dep.nombre as departamento,
      COUNT(dpo.id_detalle) as total_productos,
      SUM(dpo.cantidad) as total_cantidad
    FROM orden_produccion op
    INNER JOIN cliente c ON op.id_cliente = c.id_cliente
    INNER JOIN empleado e ON op.cedula_empleado_responsable = e.cedula
    INNER JOIN direccion d ON op.id_direccion = d.id_direccion
    INNER JOIN ciudad ci ON d.id_ciudad = ci.id_ciudad
    INNER JOIN departamento dep ON ci.id_departamento = dep.id_departamento
    LEFT JOIN detalle_producto_orden dpo ON op.id_orden = dpo.id_orden
    WHERE op.activo = true
    GROUP BY op.id_orden, op.fecha_aproximada, op.tipo_pago, op.prioridad_orden, 
             c.nombre, c.tipo, e.nombre, ci.ciudad, dep.nombre
    ORDER BY op.fecha_aproximada DESC
    LIMIT $1
  `;
  
  const result = await pool.query(query, [limite]);
  return result.rows;
};

module.exports = {
  obtenerDatosCliente,
  obtenerProductosPorCategoria,
  obtenerCategorias,
  obtenerProductosMasVendidos,
  obtenerColores,
  obtenerEstampados,
  obtenerDepartamentos,
  obtenerCiudadesPorDepartamento,
  obtenerEstadisticasValoraciones,
  obtenerOrdenesPorCliente,
  obtenerDetalleProducto,
  buscarProductos,
  obtenerEstadoOrden,
  obtenerValoracionesProductos,
  obtenerResumenOrdenesPorEstado,
  obtenerCategoriasMasVendidas,
  obtenerOrdenesRecientes
};
