const express = require('express');
const router = express.Router();
const { 
    changePriorityOrder,
    actualizarCantidadCortadaController,
    marcarCortado,
    obtenerProductosCortados,
    obtenerProductosOrden
} = require('../controllers/createElements.controller');

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

/**
 * @swagger
 * /api/producto-proceso/{id_producto_proceso}/cantidad-cortada:
 *   patch:
 *     summary: Actualiza la cantidad cortada de un producto
 *     description: Permite especificar cuántas unidades de un producto han sido cortadas
 *     tags: [Productos]
 *     parameters:
 *       - in: path
 *         name: id_producto_proceso
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto proceso a modificar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cantidad_cortada:
 *                 type: integer
 *                 minimum: 0
 *                 description: Cantidad de unidades cortadas
 *                 example: 50
 *             required:
 *               - cantidad_cortada
 *     responses:
 *       200:
 *         description: Cantidad cortada actualizada correctamente
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
 *                   example: "Cantidad cortada actualizada exitosamente. Estado: Parcialmente cortado"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id_producto_proceso:
 *                       type: integer
 *                       example: 123
 *                     cantidad:
 *                       type: integer
 *                       example: 100
 *                     cantidad_cortada:
 *                       type: integer
 *                       example: 50
 *                     cantidad_pendiente:
 *                       type: integer
 *                       example: 50
 *                     estado_cortado:
 *                       type: string
 *                       example: "Parcialmente cortado"
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Producto proceso no encontrado
 *       500:
 *         description: Error del servidor
 */
router.patch('/updateCutQuantity/:id_producto_proceso/cut-quantity', actualizarCantidadCortadaController);

/**
 * @swagger
 * /api/producto-proceso/{id_producto_proceso}/cortado:
 *   patch:
 *     summary: Marca o desmarca un producto como cortado (todo o nada)
 *     description: Actualiza el estado de cortado de un producto en proceso - marca toda la cantidad como cortada o no cortada
 *     tags: [Productos]
 *     parameters:
 *       - in: path
 *         name: id_producto_proceso
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto proceso a modificar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cortado:
 *                 type: boolean
 *                 description: Estado de cortado (true = cortado, false = no cortado)
 *                 example: true
 *             required:
 *               - cortado
 *     responses:
 *       200:
 *         description: Estado actualizado correctamente
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Producto proceso no encontrado
 *       500:
 *         description: Error del servidor
 */
router.patch('/markCut/:id_producto_proceso/cut', marcarCortado);

/**
 * @swagger
 * /api/productos/{estado}:
 *   get:
 *     summary: Obtiene productos por estado de cortado
 *     description: Devuelve una lista de productos filtrados por su estado de cortado
 *     tags: [Productos]
 *     parameters:
 *       - in: path
 *         name: estado
 *         required: true
 *         schema:
 *           type: string
 *           enum: [cortados, no-cortados, parciales]
 *         description: Estado de cortado a filtrar
 *     responses:
 *       200:
 *         description: Lista de productos obtenida exitosamente
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
 *                       id_producto_proceso:
 *                         type: integer
 *                       cantidad:
 *                         type: integer
 *                       cantidad_cortada:
 *                         type: integer
 *                       estado_cortado:
 *                         type: string
 *                       nombre_producto:
 *                         type: string
 *                       nombre_cliente:
 *                         type: string
 *       400:
 *         description: Estado inválido
 *       500:
 *         description: Error del servidor
 */
router.get('/productos/:estado', obtenerProductosCortados);

/**
 * @swagger
 * /api/orders/{id_orden}/productos:
 *   get:
 *     summary: Obtiene productos pendientes por cortar de una orden
 *     description: Por defecto muestra solo los productos que están en el proceso de "Cortes" y tienen cantidad pendiente. Incluye opciones para ver todos los procesos o aplicar filtros específicos.
 *     tags: [Órdenes, Productos]
 *     parameters:
 *       - in: path
 *         name: id_orden
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la orden
 *       - in: query
 *         name: mostrar_todos
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Si es true, muestra productos de todos los procesos (por defecto solo muestra los de "Cortes")
 *       - in: query
 *         name: mostrar_solo_mas_avanzado
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Si es true, muestra solo el proceso más avanzado por producto
 *       - in: query
 *         name: agrupar_por_producto
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Si es true, agrupa todos los procesos por producto
 *       - in: query
 *         name: filtrar_por_proceso
 *         required: false
 *         schema:
 *           type: string
 *         description: Nombre del proceso específico a filtrar (ej. "Cortes", "Confección")
 *     responses:
 *       200:
 *         description: Productos obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_producto_proceso:
 *                         type: integer
 *                       nombre_producto:
 *                         type: string
 *                       nombre_proceso:
 *                         type: string
 *                       cantidad:
 *                         type: integer
 *                       cantidad_cortada:
 *                         type: integer
 *                       cantidad_pendiente:
 *                         type: integer
 *                       estado_cortado:
 *                         type: string
 *                 total:
 *                   type: integer
 *                 opciones_aplicadas:
 *                   type: object
 *       400:
 *         description: ID de orden requerido
 *       404:
 *         description: Orden no encontrada
 *       500:
 *         description: Error del servidor
 */
router.get('/getProductsByOrden/:id_orden', obtenerProductosOrden);

module.exports = router;