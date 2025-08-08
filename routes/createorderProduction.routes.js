const express = require('express');
const router = express.Router();
const orderController = require('../controllers/createorderProduction.controller');
const { 
  strictLimiter
} = require('../middlewares/rateLimiting.middleware');

router.post('/createOrder', strictLimiter, orderController.uploadMiddleware, orderController.createOrder
);

/**
 * @swagger
 * /api/create/createOrder:
 *   post:
 *     summary: Crea una nueva orden de producción
 *     description: Registra una nueva orden de producción con sus detalles y archivos adjuntos
 *     tags: [Órdenes]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: files
 *         type: file
 *         description: Archivos relacionados con la orden (diseños, especificaciones, etc.)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               clientId:
 *                 type: integer
 *                 description: ID del cliente que solicita la orden
 *               approxDate:
 *                 type: string
 *                 format: date
 *                 description: Fecha aproximada de entrega
 *               products:
 *                 type: array
 *                 description: Lista de productos incluidos en la orden
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *                     colorId:
 *                       type: integer
 *                     patternId:
 *                       type: integer
 *                     observations:
 *                       type: string
 *             required:
 *               - clientId
 *               - approxDate
 *               - products
 *     responses:
 *       201:
 *         description: Orden creada exitosamente
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
 *                   example: "Orden creada exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: integer
 *                       example: 123
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error del servidor
 */
router.delete('/delete/orders/:orderId/products/:detailId', orderController.deleteProductFromOrder);

/**
 * @swagger
 * /api/create/delete/orders/{orderId}/products/{detailId}:
 *   delete:
 *     summary: Elimina un producto de una orden
 *     description: Elimina un producto específico de una orden de producción existente
 *     tags: [Órdenes]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la orden de producción
 *       - in: path
 *         name: detailId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del detalle (producto) a eliminar
 *     responses:
 *       200:
 *         description: Producto eliminado de la orden exitosamente
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
 *                   example: "Producto eliminado de la orden correctamente"
 *       404:
 *         description: Orden o detalle no encontrado
 *       500:
 *         description: Error del servidor
 */
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