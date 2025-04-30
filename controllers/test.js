// test.js o en tu controlador
const pool = require('../database/db'); // Asegúrate de que la ruta sea correcta

pool.query('SELECT NOW()')
  .then(res => {
    console.log('🕒 Fecha actual desde PostgreSQL:', res.rows[0]);
  })
  .catch(err => {
    console.error('❌ Error ejecutando consulta:', err);
  });
