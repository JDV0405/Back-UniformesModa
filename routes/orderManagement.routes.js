const express = require('express');
const router = express.Router();
const { UserController, OrderController } = require('../controllers/orderManagement.controller.js');
const authMiddleware = require('../middlewares/auth.middleware.js');

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Autenticación de usuarios en el sistema
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: Correo electrónico del usuario
 *               contrasena:
 *                 type: string
 *                 description: Contraseña del usuario
 *             required:
 *               - email
 *               - contrasena
 *     responses:
 *       200:
 *         description: Autenticación exitosa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT para autenticación
 *                 usuario:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     nombre:
 *                       type: string
 *                     rol:
 *                       type: string
 *       401:
 *         description: Credenciales inválidas
 *       500:
 *         description: Error interno del servidor
 */
router.post('/login', UserController.login);

// Middleware de autenticación para rutas protegidas
router.use(authMiddleware);

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Obtiene el perfil del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del perfil obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 nombre:
 *                   type: string
 *                 apellidos:
 *                   type: string
 *                 email:
 *                   type: string
 *                 rol:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     nombre:
 *                       type: string
 *       401:
 *         description: No autorizado - Token inválido o expirado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/profile', UserController.getProfile);

/**
 * @swagger
 * /orders/process/{idProceso}:
 *   get:
 *     summary: Obtiene órdenes según el proceso y rol del usuario
 *     tags: [Órdenes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idProceso
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del proceso para filtrar las órdenes
 *     responses:
 *       200:
 *         description: Lista de órdenes obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   numero_orden:
 *                     type: string
 *                   nombre_cliente:
 *                     type: string
 *                   nombre_proceso:
 *                     type: string
 *                   fecha_inicio_proceso:
 *                     type: string
 *                     format: date-time
 *                   estado_proceso:
 *                     type: string
 *                   observaciones:
 *                     type: string
 *                   fecha_final_proceso:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: No autorizado - Token inválido o expirado
 *       403:
 *         description: Prohibido - No tiene permisos para ver estas órdenes
 *       500:
 *         description: Error interno del servidor
 */
router.get('/orders/process/:idProceso', OrderController.getOrdersByRole);

/**
 * @swagger
 * /orders/all:
 *   get:
 *     summary: Obtiene todas las órdenes en el sistema
 *     tags: [Órdenes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de órdenes obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   numero_orden:
 *                     type: integer
 *                   nombre_cliente:
 *                     type: string
 *                   nombre_proceso:
 *                     type: string
 *                   id_detalle_proceso:
 *                     type: integer
 *                   fecha_inicio_proceso:
 *                     type: string
 *                     format: date-time
 *                   estado_proceso:
 *                     type: string
 *                   observaciones:
 *                     type: string
 *                   fecha_final_proceso:
 *                     type: string
 *                     format: date-time
 *                   nombre_empleado:
 *                     type: string
 *                   apellidos_empleado:
 *                     type: string
 *       401:
 *         description: No autorizado - Token inválido o expirado
 *       403:
 *         description: Prohibido - No tiene permisos para ver todas las órdenes
 *       500:
 *         description: Error interno del servidor
 */
router.get('/orders/all', OrderController.getAllOrders);

/**
 * @swagger
 * /orders/advance:
 *   post:
 *     summary: Avanza una orden al siguiente proceso
 *     tags: [Órdenes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idDetalleProcesoActual:
 *                 type: string
 *                 description: ID de la orden a avanzar
 *               idProcesoSiguiente:
 *                 type: string
 *                 description: ID del siguiente proceso
 *               comentario:
 *                 type: string
 *                 description: Comentario opcional sobre el avance
 *             required:
 *               - idDetalleOrden
 *               - idProcesoSiguiente
 *     responses:
 *       200:
 *         description: Orden avanzada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                 nuevoProceso:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     nombre:
 *                       type: string
 *       400:
 *         description: Error en los datos proporcionados
 *       401:
 *         description: No autorizado - Token inválido o expirado
 *       403:
 *         description: Prohibido - No tiene permisos para avanzar esta orden
 *       500:
 *         description: Error interno del servidor
 */
router.post('/orders/advance', OrderController.advanceOrder);

/**
 * @swagger
 * /orders/{idOrden}:
 *   get:
 *     summary: Obtiene los detalles de una orden específica
 *     tags: [Órdenes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idOrden
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la orden a consultar
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
 *                     orden:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id_orden:
 *                             type: integer
 *                           id_cliente:
 *                             type: string
 *                           fecha_aproximada:
 *                             type: string
 *                             format: date-time
 *                           tipo_pago:
 *                             type: string
 *                           id_comprobante_pago:
 *                             type: integer
 *                           observaciones:
 *                             type: string
 *                           cedula_empleado_responsable:
 *                             type: string
 *                           nombre_cliente:
 *                             type: string
 *                     procesos:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id_detalle_proceso:
 *                             type: integer
 *                           id_orden:
 *                             type: integer
 *                           id_proceso:
 *                             type: integer
 *                           fecha_inicio_proceso:
 *                             type: string
 *                             format: date-time
 *                           fecha_final_proceso:
 *                             type: string
 *                             format: date-time
 *                           cedula_empleado:
 *                             type: string
 *                           observaciones:
 *                             type: string
 *                           estado:
 *                             type: string
 *                           nombre_proceso:
 *                             type: string
 *                           nombre_empleado:
 *                             type: string
 *                           apellidos_empleado:
 *                             type: string
 *       401:
 *         description: No autorizado - Token inválido o expirado
 *       403:
 *         description: Prohibido - No tiene permisos para ver esta orden
 *       404:
 *         description: Orden no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get('/orders/:idOrden', OrderController.getOrderDetails);

module.exports = router;