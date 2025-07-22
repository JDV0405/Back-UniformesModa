const pool = require('../database/db.js');

const buscarEmpleadoPorCedula = async (cedula) => {
  const result = await pool.query('SELECT * FROM empleado WHERE cedula = $1', [cedula]);
  return result.rows[0];
};

const buscarUsuarioPorEmail = async (email) => {
  const result = await pool.query('SELECT * FROM usuario WHERE email = $1', [email]);
  return result.rows[0];
};

const crearEmpleado = async ({ cedula, nombre, apellidos, activo, telefono }) => {
  await pool.query(
    `INSERT INTO empleado (cedula, nombre, apellidos, activo, telefono)
     VALUES ($1, $2, $3, $4, $5)`,
    [cedula, nombre, apellidos, activo, telefono]
  );
};

const asignarRolesEmpleado = async ({ cedula_empleado, roles }) => {
  // Primero eliminar roles existentes
  await pool.query(
    `DELETE FROM empleado_rol WHERE cedula_empleado = $1`,
    [cedula_empleado]
  );
  
  // Luego insertar los nuevos roles
  for (const id_rol of roles) {
    await pool.query(
      `INSERT INTO empleado_rol (cedula_empleado, id_rol) VALUES ($1, $2)`,
      [cedula_empleado, id_rol]
    );
  }
};

const crearUsuario = async ({ cedula_empleado, email, contrasena }) => {
  await pool.query(
    `INSERT INTO usuario (cedula_empleado, contrasena, email)
    VALUES ($1, $2, $3)`,
    [cedula_empleado, contrasena, email]
  );
};

const obtenerTodosLosUsuarios = async () => {
  const result = await pool.query(`
    SELECT 
      e.cedula,
      e.nombre,
      e.apellidos,
      e.activo,
      e.telefono,
      u.email,
      u.id_usuario,
      u.activo as usuario_activo,
      ARRAY_AGG(
        CASE 
          WHEN r.id_rol IS NOT NULL THEN 
            JSON_BUILD_OBJECT(
              'id_rol', r.id_rol,
              'nombre_rol', r.nombre_rol,
              'descripcion', r.descripcion
            )
          ELSE NULL
        END
      ) FILTER (WHERE r.id_rol IS NOT NULL) as roles
    FROM empleado e
    INNER JOIN usuario u ON e.cedula = u.cedula_empleado
    LEFT JOIN empleado_rol er ON e.cedula = er.cedula_empleado
    LEFT JOIN rol r ON er.id_rol = r.id_rol
    GROUP BY e.cedula, e.nombre, e.apellidos, e.activo, e.telefono, u.email, u.id_usuario, u.activo
    ORDER BY e.nombre, e.apellidos
  `);
  return result.rows;
};

const actualizarUsuario = async ({ cedula, nombre, apellidos, activo, telefono, email, roles }) => {
  // Actualizar tabla empleado
  await pool.query(
    `UPDATE empleado 
     SET nombre = $2, apellidos = $3, activo = $4, telefono = $5
     WHERE cedula = $1`,
    [cedula, nombre, apellidos, activo, telefono]
  );

  // Actualizar tabla usuario - sincronizar el estado activo
  await pool.query(
    `UPDATE usuario 
     SET email = $2, activo = $3
     WHERE cedula_empleado = $1`,
    [cedula, email, activo]
  );

  // Actualizar roles si se proporcionan
  if (roles && roles.length > 0) {
    await asignarRolesEmpleado({ cedula_empleado: cedula, roles });
  }
};

const actualizarContrasenaUsuario = async ({ cedula, contrasena }) => {
  await pool.query(
    `UPDATE usuario 
     SET contrasena = $2
     WHERE cedula_empleado = $1`,
    [cedula, contrasena]
  );
};

const obtenerTodosLosRoles = async () => {
  const result = await pool.query(`
    SELECT id_rol, nombre_rol, descripcion, activo
    FROM rol
    WHERE activo = true
    ORDER BY nombre_rol
  `);
  return result.rows;
};

// Obtener perfil completo de usuario por cédula
const obtenerPerfilUsuario = async (cedula) => {
  const result = await pool.query(`
    SELECT 
      -- Datos del empleado
      e.cedula,
      e.nombre,
      e.apellidos,
      e.telefono,
      e.activo as empleado_activo,
      
      -- Datos del usuario
      u.id_usuario,
      u.email,
      u.activo as usuario_activo,
      
      -- Roles asignados
      JSON_AGG(
        CASE 
          WHEN r.id_rol IS NOT NULL THEN 
            JSON_BUILD_OBJECT(
              'id_rol', r.id_rol,
              'nombre_rol', r.nombre_rol,
              'descripcion', r.descripcion,
              'activo', r.activo
            )
          ELSE NULL
        END
      ) FILTER (WHERE r.id_rol IS NOT NULL) as roles,
      
      -- Cantidad de procesos en los que ha participado
      (
        SELECT COUNT(DISTINCT dp.id_detalle_proceso) 
        FROM detalle_proceso dp 
        WHERE dp.cedula_empleado = e.cedula
      ) as total_procesos_participados,
      
      -- Última participación en un proceso
      (
        SELECT JSON_BUILD_OBJECT(
          'id_detalle_proceso', dp.id_detalle_proceso,
          'fecha_inicio', dp.fecha_inicio_proceso,
          'fecha_final', dp.fecha_final_proceso,
          'estado', dp.estado,
          'nombre_proceso', ep.nombre,
          'id_orden', dp.id_orden
        )
        FROM detalle_proceso dp
        INNER JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
        WHERE dp.cedula_empleado = e.cedula
        ORDER BY dp.fecha_inicio_proceso DESC
        LIMIT 1
      ) as ultima_participacion_proceso,
      
      -- Cantidad de órdenes donde fue responsable
      (
        SELECT COUNT(*) 
        FROM orden_produccion op 
        WHERE op.cedula_empleado_responsable = e.cedula
      ) as total_ordenes_responsable,
      
      -- Total de acciones registradas en el historial
      (
        SELECT COUNT(*) 
        FROM historial_empleado_proceso hep 
        WHERE hep.cedula_empleado = e.cedula
      ) as total_acciones_historial,
      
      -- Última acción registrada
      (
        SELECT JSON_BUILD_OBJECT(
          'id_historial', hep.id_historial,
          'fecha_participacion', hep.fecha_participacion,
          'accion', hep.accion,
          'observaciones', hep.observaciones,
          'cantidad_total_avanzada', hep.cantidad_total_avanzada,
          'nombre_proceso', ep.nombre,
          'id_orden', op.id_orden
        )
        FROM historial_empleado_proceso hep
        INNER JOIN detalle_proceso dp ON hep.id_detalle_proceso = dp.id_detalle_proceso
        INNER JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
        INNER JOIN orden_produccion op ON dp.id_orden = op.id_orden
        WHERE hep.cedula_empleado = e.cedula
        ORDER BY hep.fecha_participacion DESC
        LIMIT 1
      ) as ultima_accion_registrada
      
    FROM empleado e
    INNER JOIN usuario u ON e.cedula = u.cedula_empleado
    LEFT JOIN empleado_rol er ON e.cedula = er.cedula_empleado
    LEFT JOIN rol r ON er.id_rol = r.id_rol
    WHERE e.cedula = $1
    GROUP BY e.cedula, e.nombre, e.apellidos, e.telefono, e.activo, 
             u.id_usuario, u.email, u.activo
  `, [cedula]);
  
  return result.rows[0];
};

// Obtener estadísticas del usuario (órdenes gestionadas)
const obtenerEstadisticasUsuario = async (cedula) => {
  const result = await pool.query(`
    SELECT 
      COUNT(DISTINCT op.id_orden) as total_ordenes_gestionadas,
      COUNT(DISTINCT CASE WHEN op.activo = true THEN op.id_orden END) as ordenes_activas,
      COUNT(DISTINCT dpo.id_detalle) as total_productos_gestionados,
      COALESCE(SUM(dpo.cantidad), 0) as cantidad_total_productos,
      COUNT(DISTINCT dp.id_detalle_proceso) as procesos_participados,
      COUNT(DISTINCT CASE WHEN dp.estado = 'Completado' THEN dp.id_detalle_proceso END) as procesos_completados
    FROM empleado e
    LEFT JOIN orden_produccion op ON e.cedula = op.cedula_empleado_responsable
    LEFT JOIN detalle_producto_orden dpo ON op.id_orden = dpo.id_orden
    LEFT JOIN detalle_proceso dp ON e.cedula = dp.cedula_empleado
    WHERE e.cedula = $1
  `, [cedula]);
  
  return result.rows[0];
};

// Obtener órdenes recientes gestionadas por el usuario
const obtenerOrdenesRecientesUsuario = async (cedula, limite = 5) => {
  const result = await pool.query(`
    SELECT 
      op.id_orden,
      op.fecha_aproximada,
      op.tipo_pago,
      op.prioridad_orden,
      op.observaciones,
      op.activo,
      c.nombre as cliente_nombre,
      c.tipo as cliente_tipo,
      ci.ciudad,
      dep.nombre as departamento,
      COUNT(dpo.id_detalle) as total_productos,
      SUM(dpo.cantidad) as cantidad_total
    FROM orden_produccion op
    INNER JOIN cliente c ON op.id_cliente = c.id_cliente
    INNER JOIN direccion d ON op.id_direccion = d.id_direccion
    INNER JOIN ciudad ci ON d.id_ciudad = ci.id_ciudad
    INNER JOIN departamento dep ON ci.id_departamento = dep.id_departamento
    LEFT JOIN detalle_producto_orden dpo ON op.id_orden = dpo.id_orden
    WHERE op.cedula_empleado_responsable = $1
    GROUP BY op.id_orden, op.fecha_aproximada, op.tipo_pago, op.prioridad_orden, 
             op.observaciones, op.activo, c.nombre, c.tipo, ci.ciudad, dep.nombre
    ORDER BY op.fecha_aproximada DESC
    LIMIT $2
  `, [cedula, limite]);
  
  return result.rows;
};

// Obtener procesos recientes en los que ha participado el usuario
const obtenerProcesosRecientesUsuario = async (cedula, limite = 5) => {
  const result = await pool.query(`
    SELECT 
      dp.id_detalle_proceso,
      dp.fecha_inicio_proceso,
      dp.fecha_final_proceso,
      dp.observaciones,
      dp.estado,
      ep.nombre as nombre_proceso,
      op.id_orden,
      c.nombre as cliente_nombre,
      COUNT(pp.id_producto_proceso) as productos_trabajados
    FROM detalle_proceso dp
    INNER JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
    INNER JOIN orden_produccion op ON dp.id_orden = op.id_orden
    INNER JOIN cliente c ON op.id_cliente = c.id_cliente
    LEFT JOIN producto_proceso pp ON dp.id_detalle_proceso = pp.id_detalle_proceso
    WHERE dp.cedula_empleado = $1
    GROUP BY dp.id_detalle_proceso, dp.fecha_inicio_proceso, dp.fecha_final_proceso, 
             dp.observaciones, dp.estado, ep.nombre, op.id_orden, c.nombre
    ORDER BY dp.fecha_inicio_proceso DESC
    LIMIT $2
  `, [cedula, limite]);
  
  return result.rows;
};

// Obtener historial de actividades del usuario
const obtenerHistorialActividadesUsuario = async (cedula, limite = 10) => {
  const result = await pool.query(`
    SELECT 
      hep.id_historial,
      hep.fecha_participacion,
      hep.observaciones,
      hep.accion,
      hep.cantidad_total_avanzada,
      hep.datos_adicionales,
      dp.id_detalle_proceso,
      ep.nombre as nombre_proceso,
      op.id_orden,
      c.nombre as cliente_nombre
    FROM historial_empleado_proceso hep
    INNER JOIN detalle_proceso dp ON hep.id_detalle_proceso = dp.id_detalle_proceso
    INNER JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
    INNER JOIN orden_produccion op ON dp.id_orden = op.id_orden
    INNER JOIN cliente c ON op.id_cliente = c.id_cliente
    WHERE hep.cedula_empleado = $1
    ORDER BY hep.fecha_participacion DESC
    LIMIT $2
  `, [cedula, limite]);
  
  return result.rows;
};

// Obtener estadísticas específicas por rol
const obtenerEstadisticasEspecificasPorRol = async (cedula, id_rol) => {
  // Obtenemos el nombre del rol primero
  const rolResult = await pool.query(`
    SELECT nombre_rol FROM rol WHERE id_rol = $1
  `, [id_rol]);
  
  if (!rolResult.rows[0]) {
    throw new Error('Rol no encontrado');
  }
  
  const nombreRol = rolResult.rows[0].nombre_rol;
  
  switch (nombreRol) {
    case 'Administrador':
      return await obtenerEstadisticasAdministrador(cedula);
    case 'Solicitudes':
      return await obtenerEstadisticasSolicitudes(cedula);
    case 'Cortes':
      return await obtenerEstadisticasCortes(cedula);
    case 'Confección':
      return await obtenerEstadisticasConfeccion(cedula);
    case 'Bordado':
      return await obtenerEstadisticasBordado(cedula);
    case 'Facturación':
      return await obtenerEstadisticasFacturacion(cedula);
    case 'Entrega':
      return await obtenerEstadisticasEntrega(cedula);
    default:
      return await obtenerEstadisticasGenerales(cedula);
  }
};

// Estadísticas para Administrador
const obtenerEstadisticasAdministrador = async (cedula) => {
  const result = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM usuario WHERE activo = true) as total_usuarios,
      (SELECT COUNT(*) FROM empleado WHERE activo = true) as usuarios_activos,
      (SELECT COUNT(*) FROM orden_produccion WHERE activo = true) as ordenes_supervision,
      (SELECT COUNT(*) FROM detalle_proceso) as procesos_supervisados,
      (SELECT COUNT(*) FROM cliente) as total_clientes,
      (SELECT COUNT(*) FROM producto WHERE activo = true) as total_productos
  `);
  
  return result.rows[0];
};

// Estadísticas para Solicitudes
const obtenerEstadisticasSolicitudes = async (cedula) => {
  const result = await pool.query(`
    SELECT 
      COUNT(DISTINCT op.id_orden) as solicitudes_creadas,
      COUNT(DISTINCT CASE WHEN dpo.estado = 'Pendiente' THEN op.id_orden END) as solicitudes_pendientes,
      COUNT(DISTINCT CASE WHEN dpo.estado = 'Aprobado' THEN op.id_orden END) as solicitudes_aprobadas,
      COUNT(DISTINCT CASE WHEN dpo.estado = 'Rechazado' THEN op.id_orden END) as solicitudes_rechazadas,
      COUNT(DISTINCT c.id_cliente) as clientes_atendidos
    FROM orden_produccion op
    LEFT JOIN detalle_producto_orden dpo ON op.id_orden = dpo.id_orden
    LEFT JOIN cliente c ON op.id_cliente = c.id_cliente
    WHERE op.cedula_empleado_responsable = $1
  `, [cedula]);
  
  return result.rows[0];
};

// Estadísticas para Cortes
const obtenerEstadisticasCortes = async (cedula) => {
  const result = await pool.query(`
    SELECT 
      COUNT(DISTINCT pp.id_producto_proceso) as cortes_realizados,
      COALESCE(SUM(pp.cantidad_cortada), 0) as metros_cortados,
      COUNT(DISTINCT CASE WHEN pp.cortado = true THEN dp.id_orden END) as ordenes_corte_completadas,
      ROUND(
        CASE 
          WHEN SUM(pp.cantidad) > 0 THEN 
            ((SUM(pp.cantidad) - SUM(pp.cantidad_cortada)) * 100.0 / SUM(pp.cantidad))
          ELSE 0 
        END, 2
      ) as material_desperdiciado,
      AVG(EXTRACT(EPOCH FROM (pp.fecha_entrega - pp.fecha_recibido)) / 3600) as tiempo_promedio_corte
    FROM detalle_proceso dp
    INNER JOIN producto_proceso pp ON dp.id_detalle_proceso = pp.id_detalle_proceso
    INNER JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
    WHERE dp.cedula_empleado = $1 AND LOWER(ep.nombre) LIKE '%corte%'
  `, [cedula]);
  
  return result.rows[0];
};

// Estadísticas para Confección
const obtenerEstadisticasConfeccion = async (cedula) => {
  const result = await pool.query(`
    SELECT 
      COALESCE(SUM(pp.cantidad), 0) as prendas_confeccionadas,
      ROUND(AVG(EXTRACT(EPOCH FROM (pp.fecha_entrega - pp.fecha_recibido)) / 3600), 2) as tiempo_promedio,
      ROUND(AVG(
        CASE 
          WHEN pp.cantidad > 0 THEN (pp.cantidad_cortada * 100.0 / pp.cantidad)
          ELSE 0 
        END
      ), 2) as calidad_promedio,
      COUNT(DISTINCT CASE WHEN dp.estado = 'Reproceso' THEN dp.id_detalle_proceso END) as reprocesos,
      COUNT(DISTINCT dp.id_orden) as ordenes_trabajadas
    FROM detalle_proceso dp
    INNER JOIN producto_proceso pp ON dp.id_detalle_proceso = pp.id_detalle_proceso
    INNER JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
    WHERE dp.cedula_empleado = $1 AND LOWER(ep.nombre) LIKE '%confec%'
  `, [cedula]);
  
  return result.rows[0];
};

// Estadísticas para Bordado
const obtenerEstadisticasBordado = async (cedula) => {
  const result = await pool.query(`
    SELECT 
      COALESCE(SUM(pp.cantidad), 0) as bordados_realizados,
      COUNT(DISTINCT pp.id_producto_proceso) as diseños_creados,
      ROUND(SUM(EXTRACT(EPOCH FROM (pp.fecha_entrega - pp.fecha_recibido)) / 3600), 2) as tiempo_bordado,
      ROUND(AVG(
        CASE 
          WHEN pp.cantidad > 0 THEN (pp.cantidad_cortada * 100.0 / pp.cantidad)
          ELSE 0 
        END
      ), 2) as calidad_bordado,
      COUNT(DISTINCT dp.id_orden) as ordenes_bordado
    FROM detalle_proceso dp
    INNER JOIN producto_proceso pp ON dp.id_detalle_proceso = pp.id_detalle_proceso
    INNER JOIN estado_proceso ep ON dp.id_proceso = ep.id_proceso
    WHERE dp.cedula_empleado = $1 AND LOWER(ep.nombre) LIKE '%bordad%'
  `, [cedula]);
  
  return result.rows[0];
};

// Estadísticas para Facturación
const obtenerEstadisticasFacturacion = async (cedula) => {
  const result = await pool.query(`
    SELECT 
      COUNT(DISTINCT f.id_factura) as facturas_generadas,
      COALESCE(SUM(
        CASE 
          WHEN op.tipo_pago IS NOT NULL THEN 
            (SELECT SUM(dpo.cantidad * 50000) FROM detalle_producto_orden dpo WHERE dpo.id_orden = op.id_orden)
          ELSE 0 
        END
      ), 0) as ingresos_totales,
      COUNT(DISTINCT op.id_orden) as pagos_procesados,
      COUNT(DISTINCT CASE WHEN op.id_comprobante_pago IS NULL THEN op.id_orden END) as facturas_pendientes,
      COUNT(DISTINCT op.id_cliente) as clientes_facturados
    FROM orden_produccion op
    LEFT JOIN detalle_producto_orden dpo ON op.id_orden = dpo.id_orden
    LEFT JOIN producto_proceso pp ON dpo.id_detalle = pp.id_detalle_producto
    LEFT JOIN factura_producto_proceso fpp ON pp.id_producto_proceso = fpp.id_producto_proceso
    LEFT JOIN factura f ON fpp.id_factura = f.id_factura
    WHERE op.cedula_empleado_responsable = $1
  `, [cedula]);
  
  return result.rows[0];
};

// Estadísticas para Entrega
const obtenerEstadisticasEntrega = async (cedula) => {
  const result = await pool.query(`
    SELECT 
      COUNT(DISTINCT CASE WHEN dpo.estado = 'Entregado' THEN op.id_orden END) as entregas_realizadas,
      COUNT(DISTINCT CASE WHEN dpo.estado = 'En Entrega' THEN op.id_orden END) as entregas_pendientes,
      COUNT(DISTINCT op.id_orden) * 25 as kilometros_recorridos, -- Estimación
      ROUND(AVG(v.estrellas * 20), 2) as satisfaccion_cliente,
      COUNT(DISTINCT c.id_cliente) as clientes_entregados
    FROM orden_produccion op
    INNER JOIN detalle_producto_orden dpo ON op.id_orden = dpo.id_orden
    INNER JOIN cliente c ON op.id_cliente = c.id_cliente
    LEFT JOIN valoracion v ON op.id_orden = v.id_orden_produccion
    WHERE op.cedula_empleado_responsable = $1
  `, [cedula]);
  
  return result.rows[0];
};

// Estadísticas generales para otros roles
const obtenerEstadisticasGenerales = async (cedula) => {
  const result = await pool.query(`
    SELECT 
      COUNT(DISTINCT dp.id_detalle_proceso) as tareas_completadas,
      ROUND(SUM(EXTRACT(EPOCH FROM (dp.fecha_final_proceso - dp.fecha_inicio_proceso)) / 3600), 2) as horas_trabajadas,
      COUNT(DISTINCT dp.id_orden) as ordenes_participadas,
      COUNT(DISTINCT CASE WHEN dp.estado = 'Completado' THEN dp.id_detalle_proceso END) as procesos_finalizados
    FROM detalle_proceso dp
    WHERE dp.cedula_empleado = $1
  `, [cedula]);
  
  return result.rows[0];
};

module.exports = {
  buscarEmpleadoPorCedula,
  buscarUsuarioPorEmail,
  crearEmpleado,
  asignarRolesEmpleado,
  crearUsuario,
  obtenerTodosLosUsuarios,
  actualizarUsuario,
  actualizarContrasenaUsuario,
  obtenerTodosLosRoles,
  obtenerPerfilUsuario,
  obtenerEstadisticasUsuario,
  obtenerOrdenesRecientesUsuario,
  obtenerProcesosRecientesUsuario,
  obtenerHistorialActividadesUsuario,
  obtenerEstadisticasEspecificasPorRol
};
