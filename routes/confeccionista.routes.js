const express = require('express');
const router = express.Router();
const ConfeccionistaController = require('../controllers/confeccionista.controller.js');

/**
 * @swagger
 * /api/confeccionistas:
 *   get:
 *     summary: Obtiene todos los confeccionistas con estadísticas básicas
 *     tags: [Confeccionistas]
 *     responses:
 *       200:
 *         description: Lista de confeccionistas obtenida correctamente
 *       500:
 *         description: Error del servidor
 */
router.get('/', ConfeccionistaController.getAllConfeccionistas);

/**
 * @swagger
 * /api/confeccionistas/productos:
 *   get:
 *     summary: Obtiene todos los confeccionistas con resumen de sus productos
 *     tags: [Confeccionistas]
 *     responses:
 *       200:
 *         description: Datos obtenidos correctamente
 *       500:
 *         description: Error del servidor
 */
router.get('/productos', ConfeccionistaController.getAllConfeccionistasWithProducts);

/**
 * @swagger
 * /api/confeccionistas/{id}:
 *   get:
 *     summary: Obtiene un confeccionista específico por su ID
 *     tags: [Confeccionistas]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del confeccionista
 *     responses:
 *       200:
 *         description: Datos del confeccionista obtenidos correctamente
 *       404:
 *         description: Confeccionista no encontrado
 *       500:
 *         description: Error del servidor
 */
router.get('/:id', ConfeccionistaController.getConfeccionistaById);

/**
 * @swagger
 * /api/confeccionistas/{id}/productos:
 *   get:
 *     summary: Obtiene todos los productos asignados a un confeccionista específico
 *     tags: [Confeccionistas]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del confeccionista
 *     responses:
 *       200:
 *         description: Productos obtenidos correctamente
 *       404:
 *         description: Confeccionista no encontrado
 *       500:
 *         description: Error del servidor
 */
router.get('/:id/productos', ConfeccionistaController.getProductosByConfeccionista);

module.exports = router;