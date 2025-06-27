const pool = require('../database/db.js');

const buscarEmpleadoPorCedula = async (cedula) => {
  const result = await pool.query('SELECT * FROM empleado WHERE cedula = $1', [cedula]);
  return result.rows[0];
};

const buscarUsuarioPorEmail = async (email) => {
  const result = await pool.query('SELECT * FROM usuario WHERE email = $1', [email]);
  return result.rows[0];
};

const crearEmpleado = async ({ cedula, nombre, apellidos, activo, id_rol, telefono }) => {
  await pool.query(
    `INSERT INTO empleado (cedula, nombre, apellidos, activo, id_rol, telefono)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [cedula, nombre, apellidos, activo, id_rol, telefono]
  );
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
      e.id_rol,
      e.telefono,
      u.email,
      u.id_usuario,
      u.activo as usuario_activo
    FROM empleado e
    INNER JOIN usuario u ON e.cedula = u.cedula_empleado
    ORDER BY e.nombre, e.apellidos
  `);
  return result.rows;
};

const actualizarUsuario = async ({ cedula, nombre, apellidos, activo, id_rol, telefono, email }) => {
  // Actualizar tabla empleado
  await pool.query(
    `UPDATE empleado 
     SET nombre = $2, apellidos = $3, activo = $4, id_rol = $5, telefono = $6
     WHERE cedula = $1`,
    [cedula, nombre, apellidos, activo, id_rol, telefono]
  );

  // Actualizar tabla usuario - sincronizar el estado activo
  await pool.query(
    `UPDATE usuario 
     SET email = $2, activo = $3
     WHERE cedula_empleado = $1`,
    [cedula, email, activo]
  );
};

const actualizarContrasenaUsuario = async ({ cedula, contrasena }) => {
  await pool.query(
    `UPDATE usuario 
     SET contrasena = $2
     WHERE cedula_empleado = $1`,
    [cedula, contrasena]
  );
};

module.exports = {
  buscarEmpleadoPorCedula,
  buscarUsuarioPorEmail,
  crearEmpleado,
  crearUsuario,
  obtenerTodosLosUsuarios,
  actualizarUsuario,
  actualizarContrasenaUsuario
};
