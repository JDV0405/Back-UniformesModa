const { 
  getProductsByCategory, 
  getColorsByCategory, 
  getPatternsByCategory,
  getCitiesByDepartment,
  getAssesorEmployee
} = require('../models/getProductsAndAttributes.models');
const pool = require('../database/db.js');

// Controller to get products, colors, and patterns by category
const getProductsInfoByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    // Validate category ID
    if (!categoryId || isNaN(categoryId)) {
      return res.status(400).json({ success: false, message: 'ID de categoría inválido' });
    }

    // Fetch all data in parallel for better performance
    const [products, colors, patterns] = await Promise.all([
      getProductsByCategory(categoryId),
      getColorsByCategory(categoryId),
      getPatternsByCategory(categoryId)
    ]);

    return res.status(200).json({
      success: true,
      data: {
        products,
        colors,
        patterns
      }
    });
  } catch (error) {
    console.error('Error in getProductsInfoByCategory:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al obtener información de productos',
      error: error.message 
    });
  }
};

// Controller to get cities by department
const getCitiesByDepartmentController = async (req, res) => {
  try {
    const { departmentId } = req.params;
    
    // Validate department ID
    if (!departmentId || isNaN(departmentId)) {
      return res.status(400).json({ success: false, message: 'ID de departamento inválido' });
    }

    const cities = await getCitiesByDepartment(departmentId);

    return res.status(200).json({
      success: true,
      data: cities
    });
  } catch (error) {
    console.error('Error in getCitiesByDepartmentController:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al obtener ciudades',
      error: error.message 
    });
  }
};

const getAssesorEmployeeController = async (req, res) => {
  try {
    const employees = await getAssesorEmployee();

    return res.status(200).json({
      success: true,
      data: employees
    });
  } catch (error) {
    console.error('Error in getAssesorEmployeeController:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al obtener empleados asesores',
      error: error.message 
    });
  }
};

const getEmployeesByRoleController = async (req, res) => {
  try {
    const { keywords } = req.body; // Array de palabras clave
    
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Debe proporcionar un array de palabras clave para buscar en los roles' 
      });
    }

    const { getEmployeesByRoleKeywords } = require('../models/getProductsAndAttributes.models');
    const employees = await getEmployeesByRoleKeywords(keywords);

    return res.status(200).json({
      success: true,
      message: `Empleados encontrados con roles que contienen: ${keywords.join(', ')}`,
      data: employees
    });
  } catch (error) {
    console.error('Error in getEmployeesByRoleController:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al obtener empleados por roles',
      error: error.message 
    });
  }
};

const debugDatabaseController = async (req, res) => {
  try {
    const { debugDatabaseData } = require('../models/getProductsAndAttributes.models');
    
    // Ejecutar debugging
    await debugDatabaseData();
    
    // También obtener los datos para la respuesta
    const empleados = await pool.query(`
      SELECT e.cedula, e.nombre, e.apellidos, e.activo,
             COALESCE(
               ARRAY_AGG(r.nombre_rol) FILTER (WHERE r.nombre_rol IS NOT NULL),
               ARRAY[]::VARCHAR[]
             ) as roles
      FROM empleado e
      LEFT JOIN empleado_rol er ON e.cedula = er.cedula_empleado
      LEFT JOIN rol r ON er.id_rol = r.id_rol AND r.activo = true
      WHERE e.activo = true
      GROUP BY e.cedula, e.nombre, e.apellidos, e.activo
      ORDER BY e.nombre, e.apellidos
    `);

    return res.status(200).json({
      success: true,
      message: 'Debug ejecutado - revisa la consola del servidor',
      data: {
        empleados: empleados.rows,
        total_empleados: empleados.rows.length
      }
    });
  } catch (error) {
    console.error('Error in debugDatabaseController:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error en debugging',
      error: error.message 
    });
  }
};

module.exports = {
  getProductsInfoByCategory,
  getCitiesByDepartmentController,
  getAssesorEmployeeController,
  getEmployeesByRoleController,
  debugDatabaseController
};