const { 
  getProductsByCategory, 
  getColorsByCategory, 
  getPatternsByCategory,
  getCitiesByDepartment,
  getAssesorEmployee
} = require('../models/getProductsAndAttributes.models');
const pool = require('../database/db.js');

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
    const { keywords } = req.body; 
    
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

module.exports = {
  getProductsInfoByCategory,
  getCitiesByDepartmentController,
  getAssesorEmployeeController,
  getEmployeesByRoleController,
};