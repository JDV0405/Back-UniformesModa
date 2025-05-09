const pool = require('../database/db.js');

const buscarEmpleadoPorCedula = async (cedula) => {
  const result = await pool.query('SELECT * FROM empleado WHERE cedula = $1', [cedula]);
  return result.rows[0];
};

const buscarUsuarioPorEmail = async (email) => {
  const result = await pool.query('SELECT * FROM usuario WHERE email = $1', [email]);
  return result.rows[0];
};

const crearEmpleado = async ({ cedula, nombre, apellidos, estado, id_rol, telefono }) => {
  await pool.query(
    `INSERT INTO empleado (cedula, nombre, apellidos, estado, id_rol, telefono)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [cedula, nombre, apellidos, estado, id_rol, telefono]
  );
};

const crearUsuario = async ({ cedula_empleado, email, contrasena }) => {
  await pool.query(
    `INSERT INTO usuario (cedula_empleado, contrasena, email)
     VALUES ($1, $2, $3)`,
    [cedula_empleado, contrasena, email]
  );
};

module.exports = {
  buscarEmpleadoPorCedula,
  buscarUsuarioPorEmail,
  crearEmpleado,
  crearUsuario
};
