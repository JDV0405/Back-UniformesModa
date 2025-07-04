const express = require('express');
const router = express.Router();
const advanceOrderController = require('../controllers/advanceOrder.controller');
const authMiddleware = require('../middlewares/auth.middleware.js');

router.use(authMiddleware);
/**
 * @swagger
 * /api/advance/orden/{idOrden}:
 *   get:
 *     summary: Obtiene todos los productos de una orden
 *     description: Retorna la lista completa de productos asociados a una orden específica
 *     tags: [Seguimiento de Órdenes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idOrden
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la orden a consultar
 *     responses:
 *       200:
 *         description: Lista de productos de la orden
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
 *                       id_detalle:
 *                         type: integer
 *                       nombre_producto:
 *                         type: string
 *                       cantidad:
 *                         type: integer
 *                       color:
 *                         type: string
 *                       patron:
 *                         type: string
 *                       proceso_actual:
 *                         type: string
 *       404:
 *         description: Orden no encontrada
 *       500:
 *         description: Error del servidor
 */
router.get('/orden/:idOrden', advanceOrderController.getOrderProducts);

/**
 * @swagger
 * /api/advance/orden/{idOrden}/proceso/{idProceso}:
 *   get:
 *     summary: Obtiene productos que están en un proceso específico
 *     description: Retorna los productos de una orden que actualmente se encuentran en un proceso determinado
 *     tags: [Seguimiento de Órdenes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idOrden
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la orden
 *       - in: path
 *         name: idProceso
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del proceso a consultar
 *     responses:
 *       200:
 *         description: Productos en el proceso especificado
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
 *                       id_detalle:
 *                         type: integer
 *                       nombre_producto:
 *                         type: string
 *                       cantidad:
 *                         type: integer
 *                       color:
 *                         type: string
 *                       proceso_actual:
 *                         type: string
 *       404:
 *         description: Orden o proceso no encontrado
 *       500:
 *         description: Error del servidor
 */
router.get('/orden/:idOrden/proceso/:idProceso', advanceOrderController.getProductsInProcess);

/**
 * @swagger
 * /api/advance/avanzar:
 *   post:
 *     summary: Avanza productos al siguiente proceso
 *     description: Mueve los productos seleccionados al siguiente proceso en la cadena de producción
 *     tags: [Seguimiento de Órdenes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idOrden:
 *                 type: integer
 *                 description: ID de la orden
 *                 example: 123
 *               idProcesoActual:
 *                 type: integer
 *                 description: ID del proceso actual
 *                 example: 3
 *               idProcesoSiguiente:
 *                 type: integer
 *                 description: ID del proceso siguiente
 *                 example: 4
 *               cedulaEmpleadoActual:
 *                 type: string
 *                 description: Cédula del empleado responsable
 *                 example: "12345678"
 *               itemsToAdvance:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     idDetalle:
 *                       type: integer
 *                       description: ID del detalle del producto
 *                       example: 42
 *                     cantidadAvanzar:
 *                       type: integer
 *                       description: Cantidad a avanzar
 *                       example: 10
 *                     idConfeccionista:
 *                       type: integer
 *                       description: ID del confeccionista (requerido para transición cortes->confección)
 *                       example: 5
 *                     fechaRecibido:
 *                       type: string
 *                       format: date-time
 *                       description: Fecha cuando el confeccionista recibe el trabajo (requerido para confeccionistas)
 *                       example: "2025-06-15T08:00:00Z"
 *                     fechaEntrega:
 *                       type: string
 *                       format: date-time
 *                       description: Fecha estimada de entrega del confeccionista (requerido para confeccionistas)
 *                       example: "2025-06-20T18:00:00Z"
 *                     idProductoProceso:
 *                       type: integer
 *                       description: ID específico del producto_proceso (requerido cuando se avanza desde confección)
 *                       example: 78
 *               observaciones:
 *                 type: string
 *                 description: Notas adicionales sobre el avance
 *                 example: "Material premium, revisar calidad"
 *             required:
 *               - idOrden
 *               - idProcesoActual
 *               - idProcesoSiguiente
 *               - cedulaEmpleadoActual
 *               - itemsToAdvance
 *     responses:
 *       200:
 *         description: Productos avanzados correctamente
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
 *                   example: "Productos avanzados exitosamente al siguiente proceso"
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
 *                   examples:
 *                     fechasFaltantes: "Se debe especificar fecha de recibido y fecha de entrega cuando se asigna trabajo a un confeccionista"
 *                     fechasInvalidas: "La fecha de entrega debe ser posterior a la fecha de recibido"
 *                     confeccionistaFaltante: "Se debe asignar un confeccionista cuando se pasa del proceso de cortes a confección"
 *       500:
 *         description: Error del servidor
 */
router.post('/avanzar', advanceOrderController.advanceProducts);

/**
 * @swagger
 * /api/advance/proceso/{idProceso}:
 *   get:
 *     summary: Obtiene órdenes por proceso
 *     description: Retorna todas las órdenes que tienen productos actualmente en un proceso específico
 *     tags: [Procesos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idProceso
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del proceso a consultar
 *     responses:
 *       200:
 *         description: Órdenes en el proceso especificado
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
 *                       cliente:
 *                         type: string
 *                       fecha_creacion:
 *                         type: string
 *                         format: date-time
 *                       fecha_aproximada:
 *                         type: string
 *                         format: date
 *                       prioridad:
 *                         type: integer
 *       404:
 *         description: Proceso no encontrado
 *       500:
 *         description: Error del servidor
 */
router.get('/proceso/:idProceso', advanceOrderController.getOrdersByProcess);

/**
 * @swagger
 * /api/advance/orden/{idOrden}/detalle:
 *   get:
 *     summary: Obtiene detalle de una orden
 *     description: Retorna información detallada de una orden específica, incluyendo cliente y productos
 *     tags: [Seguimiento de Órdenes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idOrden
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la orden a consultar
 *     responses:
 *       200:
 *         description: Detalle completo de la orden
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
 *                     orden:
 *                       type: object
 *                       properties:
 *                         id_orden:
 *                           type: integer
 *                         cliente:
 *                           type: string
 *                         fecha_creacion:
 *                           type: string
 *                           format: date-time
 *                         fecha_aproximada:
 *                           type: string
 *                           format: date
 *                         prioridad:
 *                           type: integer
 *                     productos:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id_detalle:
 *                             type: integer
 *                           producto:
 *                             type: string
 *                           cantidad:
 *                             type: integer
 *                           color:
 *                             type: string
 *                           patron:
 *                             type: string
 *                           proceso_actual:
 *                             type: string
 *       404:
 *         description: Orden no encontrada
 *       500:
 *         description: Error del servidor
 */
router.get('/orden/:idOrden/detalle', advanceOrderController.getOrderDetail);

/**
 * @swagger
 * /api/advance/completed:
 *   post:
 *     summary: Completar una orden
 *     description: Marca una orden como completada cuando todos sus productos han finalizado todos los procesos
 *     tags: [Seguimiento de Órdenes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idOrden:
 *                 type: integer
 *                 description: ID de la orden a completar
 *                 example: 35
 *             required:
 *               - idOrden
 *     responses:
 *       200:
 *         description: Orden completada correctamente
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
 *                   example: "La orden ha sido completada exitosamente"
 *       400:
 *         description: Error en la solicitud o no todos los productos están finalizados
 *       404:
 *         description: Orden no encontrada
 *       500:
 *         description: Error del servidor
 */
router.post('/completed', advanceOrderController.completeOrder);

/**
 * @swagger
 * /api/advance/ordersCompleted:
 *   get:
 *     summary: Obtiene órdenes completadas
 *     description: Retorna la lista de órdenes que han sido marcadas como completadas
 *     tags: [Seguimiento de Órdenes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de órdenes completadas
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
 *                       cliente:
 *                         type: string
 *                       fecha_creacion:
 *                         type: string
 *                         format: date-time
 *                       fecha_completada:
 *                         type: string
 *                         format: date-time
 *       500:
 *         description: Error del servidor
 */
router.get('/ordersCompleted', advanceOrderController.getCompletedOrders);

/**
 * @swagger
 * /api/advance/ordenes-completadas/{idOrden}:
 *   get:
 *     summary: Obtiene detalle de una orden completada
 *     description: Retorna información detallada de una orden específica que ya ha sido completada
 *     tags: [Seguimiento de Órdenes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idOrden
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la orden completada a consultar
 *     responses:
 *       200:
 *         description: Detalle completo de la orden completada
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
 *                     orden:
 *                       type: object
 *                       properties:
 *                         id_orden:
 *                           type: integer
 *                         cliente:
 *                           type: string
 *                         fecha_creacion:
 *                           type: string
 *                           format: date-time
 *                         fecha_completada:
 *                           type: string
 *                           format: date-time
 *                     productos:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id_detalle:
 *                             type: integer
 *                           producto:
 *                             type: string
 *                           cantidad:
 *                             type: integer
 *                           color:
 *                             type: string
 *                           historial_procesos:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 proceso:
 *                                   type: string
 *                                 fecha_inicio:
 *                                   type: string
 *                                   format: date-time
 *                                 fecha_fin:
 *                                   type: string
 *                                   format: date-time
 *       404:
 *         description: Orden completada no encontrada
 *       500:
 *         description: Error del servidor
 */
router.get('/ordenes-completadas/:idOrden', advanceOrderController.getCompletedOrderDetail);

// Obtener confeccionistas activos
router.get('/confeccionistas', advanceOrderController.getActiveConfeccionistas);

/**
 * @swagger
 * /api/advance/procesos-disponibles-confeccion:
 *   get:
 *     summary: Obtiene los procesos disponibles desde confección
 *     description: Retorna la lista de procesos a los que se puede avanzar desde confección (Bordado y Facturación)
 *     tags: [Seguimiento de Órdenes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de procesos disponibles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_proceso:
 *                         type: integer
 *                       nombre:
 *                         type: string
 *                 message:
 *                   type: string
 *       500:
 *         description: Error interno del servidor
 */
router.get('/procesos-disponibles-confeccion', advanceOrderController.getAvailableProcessesFromConfeccion);

/**
 * @swagger
 * /api/advance/avanzar-desde-confeccion:
 *   post:
 *     summary: Avanza productos desde confección con bifurcación
 *     description: Permite avanzar productos desde confección hacia bordado o facturación según se especifique para cada producto
 *     tags: [Seguimiento de Órdenes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idOrden
 *               - idProcesoActual
 *               - cedulaEmpleadoActual
 *               - itemsToAdvance
 *             properties:
 *               idOrden:
 *                 type: integer
 *                 description: ID de la orden
 *               idProcesoActual:
 *                 type: integer
 *                 description: ID del proceso actual (debe ser 4 para confección)
 *               cedulaEmpleadoActual:
 *                 type: string
 *                 description: Cédula del empleado que está realizando el avance
 *               itemsToAdvance:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - idDetalle
 *                     - cantidadAvanzar
 *                     - idProductoProceso
 *                     - idProcesoDestino
 *                   properties:
 *                     idDetalle:
 *                       type: integer
 *                       description: ID del detalle del producto
 *                     cantidadAvanzar:
 *                       type: integer
 *                       description: Cantidad a avanzar
 *                     idProductoProceso:
 *                       type: integer
 *                       description: ID específico del producto proceso en confección
 *                     idProcesoDestino:
 *                       type: integer
 *                       description: ID del proceso de destino (5=Bordado, 6=Facturación)
 *               observaciones:
 *                 type: string
 *                 description: Observaciones adicionales del avance
 *     responses:
 *       200:
 *         description: Productos avanzados exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error interno del servidor
 */
router.post('/avanzar-desde-confeccion', advanceOrderController.advanceProductsFromConfeccion);

module.exports = router;