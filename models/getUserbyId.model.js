const pool = require('../database/db.js'); // Asegúrate de que la ruta sea correcta

const buscarClientePorCedula = async (cedula) => {
  const result = await pool.query('SELECT * FROM cliente WHERE cedula = $1', [cedula]);
  return result.rows[0];
};