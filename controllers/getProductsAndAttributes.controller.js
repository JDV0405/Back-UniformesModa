const { 
  getProductsByCategory, 
  getColorsByCategory, 
  getPatternsByCategory,
  getCitiesByDepartment,
  getAssesorEmployee
} = require('../models/getProductsAndAttributes.models');

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
    const {  } = req.params;

    const cities = await getAssesorEmployee();

    return res.status(200).json({
      success: true,
      data: cities
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

module.exports = {
  getProductsInfoByCategory,
  getCitiesByDepartmentController,
  getAssesorEmployeeController
};