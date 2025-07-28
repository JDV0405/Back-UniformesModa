const express = require('express');
const router = express.Router();
const { 
  getProductsInfoByCategory, 
  getCitiesByDepartmentController,
  getAssesorEmployeeController,
  getEmployeesByRoleController,
} = require('../controllers/getProductsAndAttributes.controller');

/**
 * @swagger
 * /api/category/{categoryId}/products:
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
 * /api/department/{departmentId}/cities:
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
 * /api/assesorEmployee:
 *   get:
 *     summary: Obtiene la lista de empleados asesores/vendedores
 *     tags: [Personal]
 *     responses:
 *       200:
 *         description: Lista de empleados asesores/vendedores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       cedula:
 *                         type: string
 *                         description: Cédula del empleado
 *                       nombre:
 *                         type: string
 *                         description: Nombre del empleado
 *                       apellidos:
 *                         type: string
 *                         description: Apellidos del empleado
 *                       activo:
 *                         type: boolean
 *                         description: Estado activo del empleado
 *                       telefono:
 *                         type: string
 *                         description: Teléfono del empleado
 *                       roles:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: Lista de roles del empleado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/assesorEmployee', getAssesorEmployeeController);

/**
 * @swagger
 * api//employeesByRole:
 *   post:
 *     summary: Obtiene empleados que tengan roles con palabras clave específicas
 *     tags: [Personal]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["solicitud", "entrega"]
 *                 description: Array de palabras clave para buscar en los nombres de roles
 *     responses:
 *       200:
 *         description: Lista de empleados con roles que contienen las palabras clave
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       cedula:
 *                         type: string
 *                       nombre:
 *                         type: string
 *                       apellidos:
 *                         type: string
 *                       activo:
 *                         type: boolean
 *                       telefono:
 *                         type: string
 *                       roles:
 *                         type: array
 *                         items:
 *                           type: string
 *       400:
 *         description: Palabras clave no proporcionadas o inválidas
 *       500:
 *         description: Error interno del servidor
 */
router.post('/employeesByRole', getEmployeesByRoleController);

module.exports = router;