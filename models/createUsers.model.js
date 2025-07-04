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

module.exports = {
  buscarEmpleadoPorCedula,
  buscarUsuarioPorEmail,
  crearEmpleado,
  asignarRolesEmpleado,
  crearUsuario,
  obtenerTodosLosUsuarios,
  actualizarUsuario,
  actualizarContrasenaUsuario,
  obtenerTodosLosRoles
};
