const express = require('express');
const router = express.Router();
const ValoracionController = require('../controllers/valoracion.controller.js');

/**
 * @swagger
 * /api/valoraciones:
 *   post:
 *     summary: Crea una nueva valoración para una orden
 *     tags: [Valoraciones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_orden_produccion
 *               - estrellas
 *             properties:
 *               id_orden_produccion:
 *                 type: integer
 *                 description: ID de la orden a valorar
 *               estrellas:
 *                 type: integer
 *                 description: Calificación de 1 a 5 estrellas
 *                 minimum: 1
 *                 maximum: 5
 *               comentario:
 *                 type: string
 *                 description: Comentario opcional sobre la valoración
 *     responses:
 *       201:
 *         description: Valoración creada correctamente
 *       400:
 *         description: Datos inválidos o valoración ya existente para la orden
 *       500:
 *         description: Error del servidor
 */
router.post('/', ValoracionController.crearValoracion);

/**
 * @swagger
 * /api/valoraciones:
 *   get:
 *     summary: Obtiene todas las valoraciones registradas
 *     tags: [Valoraciones]
 *     responses:
 *       200:
 *         description: Lista de valoraciones obtenida correctamente
 *       500:
 *         description: Error del servidor
 */
router.get('/', ValoracionController.obtenerTodasValoraciones);

/**
 * @swagger
 * /api/valoraciones/{id}:
 *   get:
 *     summary: Obtiene una valoración por su ID
 *     tags: [Valoraciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la valoración
 *     responses:
 *       200:
 *         description: Valoración obtenida correctamente
 *       404:
 *         description: Valoración no encontrada
 *       500:
 *         description: Error del servidor
 */
router.get('/:id', ValoracionController.obtenerValoracionPorId);

/**
 * @swagger
 * /api/valoraciones/orden/{idOrden}:
 *   get:
 *     summary: Obtiene la valoración asociada a una orden específica
 *     tags: [Valoraciones]
 *     parameters:
 *       - in: path
 *         name: idOrden
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la orden
 *     responses:
 *       200:
 *         description: Valoración obtenida correctamente
 *       404:
 *         description: No existe valoración para esta orden
 *       500:
 *         description: Error del servidor
 */
router.get('/orden/:idOrden', ValoracionController.obtenerValoracionPorOrden);

/**
 * @swagger
 * /api/valoraciones/{id}:
 *   put:
 *     summary: Actualiza una valoración existente
 *     tags: [Valoraciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la valoración
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - estrellas
 *             properties:
 *               estrellas:
 *                 type: integer
 *                 description: Calificación de 1 a 5 estrellas
 *                 minimum: 1
 *                 maximum: 5
 *               comentario:
 *                 type: string
 *                 description: Comentario opcional sobre la valoración
 *     responses:
 *       200:
 *         description: Valoración actualizada correctamente
 *       400:
 *         description: Datos inválidos
 *       404:
 *         description: Valoración no encontrada
 *       500:
 *         description: Error del servidor
 */
router.put('/:id', ValoracionController.actualizarValoracion);

/**
 * @swagger
 * /api/valoraciones/{id}:
 *   delete:
 *     summary: Elimina una valoración
 *     tags: [Valoraciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la valoración
 *     responses:
 *       200:
 *         description: Valoración eliminada correctamente
 *       404:
 *         description: Valoración no encontrada
 *       500:
 *         description: Error del servidor
 */
router.delete('/:id', ValoracionController.eliminarValoracion);

/**
 * @swagger
 * /api/valoraciones/estadisticas:
 *   get:
 *     summary: Obtiene estadísticas de las valoraciones
 *     tags: [Valoraciones]
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas correctamente
 *       500:
 *         description: Error del servidor
 */
router.get('/estadisticas/general', ValoracionController.obtenerEstadisticas);

module.exports = router;