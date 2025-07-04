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

const getAssesorEmployee = async () => {
  try {
    // Buscar empleados que tengan roles con la palabra "solicitud"
    const queryWithSolicitudRole = `
      SELECT DISTINCT e.cedula, e.nombre, e.apellidos, e.activo, e.telefono,
             ARRAY_AGG(r.nombre_rol) FILTER (WHERE r.nombre_rol IS NOT NULL) as roles
      FROM empleado e
      JOIN empleado_rol er ON e.cedula = er.cedula_empleado
      JOIN rol r ON er.id_rol = r.id_rol AND r.activo = true
      WHERE e.activo = true
        AND EXISTS (
          SELECT 1 
          FROM empleado_rol er2 
          JOIN rol r2 ON er2.id_rol = r2.id_rol 
          WHERE er2.cedula_empleado = e.cedula 
            AND r2.activo = true
            AND LOWER(r2.nombre_rol) LIKE '%solicitud%'
        )
      GROUP BY e.cedula, e.nombre, e.apellidos, e.activo, e.telefono
      ORDER BY e.nombre, e.apellidos
    `;
    
    const { rows } = await pool.query(queryWithSolicitudRole);
    return rows;
  } catch (error) {
    throw new Error(`Error fetching employees with solicitud role: ${error.message}`);
  }
};

// Función alternativa para obtener empleados por IDs de roles específicos
const getEmployeesByRoleIds = async (roleIds) => {
  try {
    const query = `
      SELECT DISTINCT e.cedula, e.nombre, e.apellidos, e.activo, e.telefono,
             ARRAY_AGG(r.nombre_rol) as roles
      FROM empleado e
      JOIN empleado_rol er ON e.cedula = er.cedula_empleado
      JOIN rol r ON er.id_rol = r.id_rol
      WHERE r.id_rol = ANY($1)
        AND e.activo = true
        AND r.activo = true
      GROUP BY e.cedula, e.nombre, e.apellidos, e.activo, e.telefono
      ORDER BY e.nombre, e.apellidos
    `;
    const { rows } = await pool.query(query, [roleIds]);
    return rows;
  } catch (error) {
    throw new Error(`Error fetching employees by role IDs: ${error.message}`);
  }
};

// Función para obtener todos los empleados activos con sus roles
const getAllActiveEmployees = async () => {
  try {
    const query = `
      SELECT DISTINCT e.cedula, e.nombre, e.apellidos, e.activo, e.telefono,
             ARRAY_AGG(r.nombre_rol) as roles
      FROM empleado e
      JOIN empleado_rol er ON e.cedula = er.cedula_empleado
      JOIN rol r ON er.id_rol = r.id_rol
      WHERE e.activo = true
        AND r.activo = true
      GROUP BY e.cedula, e.nombre, e.apellidos, e.activo, e.telefono
      ORDER BY e.nombre, e.apellidos
    `;
    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    throw new Error(`Error fetching all active employees: ${error.message}`);
  }
};

// Función específica para obtener empleados con roles que contengan ciertas palabras
const getEmployeesByRoleKeywords = async (keywords) => {
  try {
    const keywordConditions = keywords.map((_, index) => 
      `LOWER(r2.nombre_rol) LIKE $${index + 1}`
    ).join(' OR ');
    
    const likePatterns = keywords.map(keyword => `%${keyword.toLowerCase()}%`);
    
    const query = `
      SELECT DISTINCT e.cedula, e.nombre, e.apellidos, e.activo, e.telefono,
             ARRAY_AGG(r.nombre_rol) FILTER (WHERE r.nombre_rol IS NOT NULL) as roles
      FROM empleado e
      JOIN empleado_rol er ON e.cedula = er.cedula_empleado
      JOIN rol r ON er.id_rol = r.id_rol AND r.activo = true
      WHERE e.activo = true
        AND EXISTS (
          SELECT 1 
          FROM empleado_rol er2 
          JOIN rol r2 ON er2.id_rol = r2.id_rol 
          WHERE er2.cedula_empleado = e.cedula 
            AND r2.activo = true
            AND (${keywordConditions})
        )
      GROUP BY e.cedula, e.nombre, e.apellidos, e.activo, e.telefono
      ORDER BY e.nombre, e.apellidos
    `;
    
    const { rows } = await pool.query(query, likePatterns);
    return rows;
  } catch (error) {
    throw new Error(`Error fetching employees by role keywords: ${error.message}`);
  }
};

// Función para debugging - verificar datos en la base de datos
const debugDatabaseData = async () => {
  try {
    console.log('=== DEBUGGING DATABASE DATA ===');
    
    // Verificar empleados
    const empleados = await pool.query('SELECT COUNT(*) as count FROM empleado WHERE activo = true');
    console.log(`Empleados activos: ${empleados.rows[0].count}`);
    
    // Verificar roles
    const roles = await pool.query('SELECT COUNT(*) as count FROM rol WHERE activo = true');
    console.log(`Roles activos: ${roles.rows[0].count}`);
    
    // Verificar empleado_rol
    const empleadoRol = await pool.query('SELECT COUNT(*) as count FROM empleado_rol');
    console.log(`Relaciones empleado-rol: ${empleadoRol.rows[0].count}`);
    
    // Mostrar algunos empleados
    const sampleEmpleados = await pool.query(`
      SELECT e.cedula, e.nombre, e.apellidos 
      FROM empleado e 
      WHERE e.activo = true 
      LIMIT 5
    `);
    console.log('Empleados de muestra:', sampleEmpleados.rows);
    
    // Mostrar algunos roles
    const sampleRoles = await pool.query(`
      SELECT r.id_rol, r.nombre_rol 
      FROM rol r 
      WHERE r.activo = true 
      LIMIT 5
    `);
    console.log('Roles de muestra:', sampleRoles.rows);
    
    // Mostrar relaciones
    const sampleRelations = await pool.query(`
      SELECT e.nombre, e.apellidos, r.nombre_rol
      FROM empleado e
      JOIN empleado_rol er ON e.cedula = er.cedula_empleado
      JOIN rol r ON er.id_rol = r.id_rol
      WHERE e.activo = true AND r.activo = true
      LIMIT 5
    `);
    console.log('Relaciones de muestra:', sampleRelations.rows);
    
    console.log('=== END DEBUGGING ===');
  } catch (error) {
    console.error('Error in debugging:', error);
  }
};

module.exports = {
  getProductsByCategory,
  getColorsByCategory,
  getPatternsByCategory,
  getCitiesByDepartment,
  getAssesorEmployee,
  getEmployeesByRoleIds,
  getAllActiveEmployees,
  getEmployeesByRoleKeywords,
  debugDatabaseData
};