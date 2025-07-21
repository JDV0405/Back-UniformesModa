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
      e.cedula,
      e.nombre,
      e.apellidos,
      e.activo as empleado_activo,
      e.telefono,
      u.id_usuario,
      u.email,
      u.activo as usuario_activo,
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
      ) FILTER (WHERE r.id_rol IS NOT NULL) as roles
    FROM empleado e
    INNER JOIN usuario u ON e.cedula = u.cedula_empleado
    LEFT JOIN empleado_rol er ON e.cedula = er.cedula_empleado
    LEFT JOIN rol r ON er.id_rol = r.id_rol
    WHERE e.cedula = $1
    GROUP BY e.cedula, e.nombre, e.apellidos, e.activo, e.telefono, u.id_usuario, u.email, u.activo
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
  obtenerHistorialActividadesUsuario
};
