const  pool  = require('../database/db.js'); 

// Get products by category
const getProductsByCategory = async (categoryId) => {
  try {
    const query = `
      SELECT id_producto, nombre_producto, descripcion, atributos, activo
      FROM producto
      WHERE id_categoria = $1 AND activo = true
    `;
    const { rows } = await pool.query(query, [categoryId]);
    return rows;
  } catch (error) {
    throw new Error(`Error fetching products by category: ${error.message}`);
  }
};

// Get colors by category
const getColorsByCategory = async (categoryId) => {
  try {
    const query = `
      SELECT c.id_color, c.nombre_color, c.codigo_hex
      FROM color c
      JOIN categoria_color cc ON c.id_color = cc.id_color
      WHERE cc.id_categoria = $1
    `;
    const { rows } = await pool.query(query, [categoryId]);
    return rows;
  } catch (error) {
    throw new Error(`Error fetching colors by category: ${error.message}`);
  }
};

// Get patterns (estampados) by category
const getPatternsByCategory = async (categoryId) => {
  try {
    const query = `
      SELECT e.id_estampado, e.nombre_estampado, e.descripcion
      FROM estampado e
      JOIN categoria_estampado ce ON e.id_estampado = ce.id_estampado
      WHERE ce.id_categoria = $1
    `;
    const { rows } = await pool.query(query, [categoryId]);
    return rows;
  } catch (error) {
    throw new Error(`Error fetching patterns by category: ${error.message}`);
  }
};

// Get cities by department
const getCitiesByDepartment = async (departmentId) => {
  try {
    const query = `
      SELECT id_ciudad, ciudad
      FROM ciudad
      WHERE id_departamento = $1
      ORDER BY ciudad
    `;
    const { rows } = await pool.query(query, [departmentId]);
    return rows;
  } catch (error) {
    throw new Error(`Error fetching cities by department: ${error.message}`);
  }
};

module.exports = {
  getProductsByCategory,
  getColorsByCategory,
  getPatternsByCategory,
  getCitiesByDepartment
};