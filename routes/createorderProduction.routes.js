const express = require('express');
const router = express.Router();
const orderController = require('../controllers/createorderProduction.controller');


router.post('/createOrder', 
    orderController.uploadMiddleware, 
    orderController.createOrder
);

router.delete('/delete/orders/:orderId/products/:detailId', orderController.deleteProductFromOrder);

router.delete('/delete/orders/:orderId', orderController.deleteOrder);

/**
 * @swagger
 * /api/create/deactivate/orders/{orderId}:
 *   patch:
 *     summary: Desactiva una orden de producción
 *     description: Desactiva una orden cambiando su estado activo a false sin eliminarla físicamente
 *     tags: [Órdenes]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la orden a desactivar
 *     responses:
 *       200:
 *         description: Orden desactivada correctamente
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
 *                   example: "Orden desactivada correctamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id_orden:
 *                       type: integer
 *                       example: 3
 *                     id_cliente:
 *                       type: integer
 *                       example: 101
 *                     fecha_aproximada:
 *                       type: string
 *                       format: date
 *                       example: "2025-06-20"
 *                     estado:
 *                       type: string
 *                       example: "Desactivada"
 *       400:
 *         description: Error en la solicitud
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
router.patch('/deactivate/orders/:orderId', orderController.deactivateOrder);

/**
 * @swagger
 * /api/create/reactivate/orders/{orderId}:
 *   patch:
 *     summary: Reactiva una orden de producción
 *     description: Reactiva una orden previamente desactivada cambiando su estado activo a true
 *     tags: [Órdenes]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la orden a reactivar
 *     responses:
 *       200:
 *         description: Orden reactivada correctamente
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
 *                   example: "Orden reactivada correctamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id_orden:
 *                       type: integer
 *                       example: 3
 *                     id_cliente:
 *                       type: integer
 *                       example: 101
 *                     fecha_aproximada:
 *                       type: string
 *                       format: date
 *                       example: "2025-06-20"
 *                     estado:
 *                       type: string
 *                       example: "Activa"
 *       400:
 *         description: Error en la solicitud
 *       500:
 *         description: Error del servidor
 */
router.patch('/reactivate/orders/:orderId', orderController.reactivateOrder);


module.exports = router;