const express = require('express');
const router = express.Router();
const { 
  getProductsInfoByCategory, 
  getCitiesByDepartmentController,
  getAssesorEmployeeController
} = require('../controllers/getProductsAndAttributes.controller');

/**
 * @swagger
 * /category/{categoryId}/products:
 *   get:
 *     summary: Obtiene productos, colores y patrones por categoría
 *     tags: [Productos]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la categoría
 *     responses:
 *       200:
 *         description: Información de productos por categoría
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       colors:
 *                         type: array
 *                         items:
 *                           type: object
 *                       patterns:
 *                         type: array
 *                         items:
 *                           type: object
 *       404:
 *         description: Categoría no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get('/category/:categoryId/products', getProductsInfoByCategory);

/**
 * @swagger
 * /department/{departmentId}/cities:
 *   get:
 *     summary: Obtiene ciudades por departamento
 *     tags: [Ubicaciones]
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del departamento
 *     responses:
 *       200:
 *         description: Lista de ciudades del departamento
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *       404:
 *         description: Departamento no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/department/:departmentId/cities', getCitiesByDepartmentController);

/**
 * @swagger
 * /assesorEmployee:
 *   get:
 *     summary: Obtiene la lista de asesores/empleados
 *     tags: [Personal]
 *     responses:
 *       200:
 *         description: Lista de asesores/empleados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   position:
 *                     type: string
 *                   contact:
 *                     type: string
 *       500:
 *         description: Error interno del servidor
 */
router.get('/assesorEmployee', getAssesorEmployeeController)

module.exports = router;