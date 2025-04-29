const { Pool } = require('pg');

const pool = new Pool({
  user: 'tu_usuario',
  host: 'localhost',
  database: 'nombre_de_tu_bd',
  password: 'tu_contraseña',
  port: 5432, // puerto por defecto de PostgreSQL
});

module.exports = pool;
