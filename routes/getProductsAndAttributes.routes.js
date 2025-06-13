const express = require('express');
const router = express.Router();
const { 
  getProductsInfoByCategory, 
  getCitiesByDepartmentController,
  getAssesorEmployeeController
} = require('../controllers/getProductsAndAttributes.controller');

// Route to get products, colors, and patterns by category
router.get('/category/:categoryId/products', getProductsInfoByCategory);

// Route to get cities by department
router.get('/department/:departmentId/cities', getCitiesByDepartmentController);

router.get('/assesorEmployee', getAssesorEmployeeController)

module.exports = router;