const express = require('express');
const router = express.Router();
const { changePriorityOrder } = require('../controllers/createElements.controller');

/**
 * @swagger
 * /api/orders/{id_orden}/priority:
 *   put:
 *     summary: Cambia la prioridad de una orden de producción
 *     description: Actualiza el nivel de prioridad de una orden existente en el sistema
 *     tags: [Órdenes]
 *     parameters:
 *       - in: path
 *         name: id_orden
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la orden a modificar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prioridad:
 *                 type: integer
 *                 description: Nuevo nivel de prioridad (1-Alta, 2-Media, 3-Baja)
 *                 example: 1
 *             required:
 *               - prioridad
 *     responses:
 *       200:
 *         description: Prioridad actualizada correctamente
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
 *                   example: "Prioridad de la orden actualizada correctamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id_orden:
 *                       type: integer
 *                       example: 42
 *                     prioridad:
 *                       type: integer
 *                       example: 1
 *       400:
 *         description: Error en los datos enviados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "La prioridad debe ser un valor entre 1 y 3"
 *       404:
 *         description: Orden no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "La orden especificada no existe"
 *       500:
 *         description: Error del servidor
 */
router.put('/orders/:id_orden/priority', changePriorityOrder);

module.exports = router;