const express = require('express');
const router = express.Router();
const orderUserController = require('../controllers/orderUsers.controller.js');

/**
 * @swagger
 * /api/orders/customer/{clienteId}:
 *   get:
 *     summary: Obtiene todas las órdenes asociadas a un cliente específico
 *     tags: [Órdenes]
 *     parameters:
 *       - in: path
 *         name: clienteId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID del cliente
 *     responses:
 *       200:
 *         description: Órdenes obtenidas exitosamente
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
 *                       id_orden:
 *                         type: integer
 *                       id_cliente:
 *                         type: string
 *                       cedula_empleado_responsable:
 *                         type: string
 *                       fecha_creacion:
 *                         type: string
 *                         format: date-time
 *                       cliente_nombre:
 *                         type: string
 *                       cliente_tipo:
 *                         type: string
 *                       estado_general:
 *                         type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: El ID del cliente es requerido
 *       404:
 *         description: No se encontró cliente con el ID especificado
 *       500:
 *         description: Error al obtener las órdenes
 */
router.get('/customer/:clienteId', orderUserController.getOrdersByClientId);

/**
 * @swagger
 * /api/orders/{orderId}:
 *   get:
 *     summary: Obtiene los detalles completos de una orden específica
 *     tags: [Órdenes]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la orden
 *     responses:
 *       200:
 *         description: Detalles de la orden obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id_orden:
 *                       type: integer
 *                     id_cliente:
 *                       type: string
 *                     cedula_empleado_responsable:
 *                       type: string
 *                     fecha_creacion:
 *                       type: string
 *                       format: date-time
 *                     cliente_nombre:
 *                       type: string
 *                     productos:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id_producto:
 *                             type: integer
 *                           id_orden:
 *                             type: integer
 *                           cantidad:
 *                             type: integer
 *                           estado:
 *                             type: string
 *                           nombre_producto:
 *                             type: string
 *                     procesos:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id_detalle:
 *                             type: integer
 *                           id_orden:
 *                             type: integer
 *                           id_proceso:
 *                             type: integer
 *                           nombre_proceso:
 *                             type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: El ID de la orden es requerido
 *       404:
 *         description: Orden no encontrada
 *       500:
 *         description: Error al obtener los detalles de la orden
 */
router.get('/:orderId', orderUserController.getOrderDetails);

module.exports = router;