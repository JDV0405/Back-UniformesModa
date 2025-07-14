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
router.post('/assessment', ValoracionController.crearValoracion);

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
router.get('/allAssessment', ValoracionController.obtenerTodasValoraciones);

module.exports = router;