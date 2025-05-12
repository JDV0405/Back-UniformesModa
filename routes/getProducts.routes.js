const express = require('express');
const router = express.Router();
const { 
  getProductsInfoByCategory, 
  getCitiesByDepartmentController 
} = require('../controllers/getProducts.controller');

// Route to get products, colors, and patterns by category
router.get('/category/:categoryId/products', getProductsInfoByCategory);

// Route to get cities by department
router.get('/department/:departmentId/cities', getCitiesByDepartmentController);

module.exports = router;