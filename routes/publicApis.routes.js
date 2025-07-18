const express = require('express');
const router = express.Router();
const publicApisController = require('../controllers/publicApis.controller.js');

/**
 * @swagger
 * components:
 *   schemas:
 *     Cliente:
 *       type: object
 *       properties:
 *         id_cliente:
 *           type: integer
 *           description: ID único del cliente
 *         nombre:
 *           type: string
 *           description: Nombre del cliente
 *         tipo:
 *           type: string
 *           enum: [Natural, Juridico]
 *           description: Tipo de cliente
 *         correo:
 *           type: string
 *           description: Correo electrónico del cliente
 *         direcciones:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id_direccion:
 *                 type: integer
 *               direccion:
 *                 type: string
 *               ciudad:
 *                 type: string
 *               departamento:
 *                 type: string
 *     Producto:
 *       type: object
 *       properties:
 *         id_producto:
 *           type: integer
 *           description: ID único del producto
 *         nombre_producto:
 *           type: string
 *           description: Nombre del producto
 *         descripcion:
 *           type: string
 *           description: Descripción del producto
 *         nombre_categoria:
 *           type: string
 *           description: Nombre de la categoría
 *         colores_disponibles:
 *           type: array
 *           items:
 *             type: object
 *         estampados_disponibles:
 *           type: array
 *           items:
 *             type: object
 *     Categoria:
 *       type: object
 *       properties:
 *         id_categoria:
 *           type: integer
 *           description: ID único de la categoría
 *         nombre_categoria:
 *           type: string
 *           description: Nombre de la categoría
 *         descripcion:
 *           type: string
 *           description: Descripción de la categoría
 *         total_productos:
 *           type: integer
 *           description: Total de productos en la categoría
 */

/**
 * @swagger
 * /api/public/cliente/{id_cliente}:
 *   get:
 *     summary: Consultar datos completos de un cliente
 *     tags: [APIs Públicas]
 *     parameters:
 *       - in: path
 *         name: id_cliente
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del cliente
 *     responses:
 *       200:
 *         description: Datos del cliente obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Cliente'
 *       404:
 *         description: Cliente no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/cliente/:id_cliente', publicApisController.consultarCliente);

/**
 * @swagger
 * /api/public/productos/categoria/{id_categoria}:
 *   get:
 *     summary: Obtener productos por categoría
 *     tags: [APIs Públicas]
 *     parameters:
 *       - in: path
 *         name: id_categoria
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la categoría
 *       - in: query
 *         name: activo
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Filtrar por productos activos
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
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Producto'
 *       400:
 *         description: ID de categoría requerido
 *       500:
 *         description: Error interno del servidor
 */
router.get('/productos/categoria/:id_categoria', publicApisController.obtenerProductosPorCategoria);

/**
 * @swagger
 * /api/public/categorias:
 *   get:
 *     summary: Obtener todas las categorías
 *     tags: [APIs Públicas]
 *     responses:
 *       200:
 *         description: Categorías obtenidas exitosamente
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
 *                     $ref: '#/components/schemas/Categoria'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/categorias', publicApisController.obtenerCategorias);

/**
 * @swagger
 * /api/public/productos/mas-vendidos:
 *   get:
 *     summary: Obtener productos más vendidos
 *     tags: [APIs Públicas]
 *     parameters:
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Límite de productos a retornar
 *     responses:
 *       200:
 *         description: Productos más vendidos obtenidos exitosamente
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
 *                       id_producto:
 *                         type: integer
 *                       nombre_producto:
 *                         type: string
 *                       descripcion:
 *                         type: string
 *                       nombre_categoria:
 *                         type: string
 *                       total_vendido:
 *                         type: integer
 *                       total_ordenes:
 *                         type: integer
 *       500:
 *         description: Error interno del servidor
 */
router.get('/productos/mas-vendidos', publicApisController.obtenerProductosMasVendidos);

/**
 * @swagger
 * /api/public/colores:
 *   get:
 *     summary: Obtener todos los colores disponibles
 *     tags: [APIs Públicas]
 *     responses:
 *       200:
 *         description: Colores obtenidos exitosamente
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
 *                       id_color:
 *                         type: integer
 *                       nombre_color:
 *                         type: string
 *                       codigo_hex:
 *                         type: string
 *       500:
 *         description: Error interno del servidor
 */
router.get('/colores', publicApisController.obtenerColores);

/**
 * @swagger
 * /api/public/estampados:
 *   get:
 *     summary: Obtener todos los estampados disponibles
 *     tags: [APIs Públicas]
 *     responses:
 *       200:
 *         description: Estampados obtenidos exitosamente
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
 *                       id_estampado:
 *                         type: integer
 *                       nombre_estampado:
 *                         type: string
 *                       descripcion:
 *                         type: string
 *       500:
 *         description: Error interno del servidor
 */
router.get('/estampados', publicApisController.obtenerEstampados);

/**
 * @swagger
 * /api/public/departamentos:
 *   get:
 *     summary: Obtener todos los departamentos
 *     tags: [APIs Públicas]
 *     responses:
 *       200:
 *         description: Departamentos obtenidos exitosamente
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
 *                       id_departamento:
 *                         type: integer
 *                       nombre:
 *                         type: string
 *                       total_ciudades:
 *                         type: integer
 *       500:
 *         description: Error interno del servidor
 */
router.get('/departamentos', publicApisController.obtenerDepartamentos);

/**
 * @swagger
 * /api/public/ciudades/departamento/{id_departamento}:
 *   get:
 *     summary: Obtener ciudades por departamento
 *     tags: [APIs Públicas]
 *     parameters:
 *       - in: path
 *         name: id_departamento
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del departamento
 *     responses:
 *       200:
 *         description: Ciudades obtenidas exitosamente
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
 *                       id_ciudad:
 *                         type: integer
 *                       ciudad:
 *                         type: string
 *                       id_departamento:
 *                         type: integer
 *       400:
 *         description: ID de departamento requerido
 *       500:
 *         description: Error interno del servidor
 */
router.get('/ciudades/departamento/:id_departamento', publicApisController.obtenerCiudadesPorDepartamento);

/**
 * @swagger
 * /api/public/estadisticas/valoraciones:
 *   get:
 *     summary: Obtener estadísticas de valoraciones
 *     tags: [APIs Públicas]
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     promedio_valoraciones:
 *                       type: number
 *                     total_valoraciones:
 *                       type: integer
 *                     cinco_estrellas:
 *                       type: integer
 *                     cuatro_estrellas:
 *                       type: integer
 *                     tres_estrellas:
 *                       type: integer
 *                     dos_estrellas:
 *                       type: integer
 *                     una_estrella:
 *                       type: integer
 *       500:
 *         description: Error interno del servidor
 */
router.get('/estadisticas/valoraciones', publicApisController.obtenerEstadisticasValoraciones);

/**
 * @swagger
 * /api/public/ordenes/cliente/{id_cliente}:
 *   get:
 *     summary: Obtener órdenes por cliente
 *     tags: [APIs Públicas]
 *     parameters:
 *       - in: path
 *         name: id_cliente
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del cliente
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *         description: Filtrar por estado de la orden
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
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_orden:
 *                         type: integer
 *                       fecha_aproximada:
 *                         type: string
 *                         format: date
 *                       tipo_pago:
 *                         type: string
 *                       prioridad_orden:
 *                         type: string
 *                       empleado_responsable:
 *                         type: string
 *                       direccion:
 *                         type: string
 *                       ciudad:
 *                         type: string
 *                       departamento:
 *                         type: string
 *                       detalles_productos:
 *                         type: array
 *                         items:
 *                           type: object
 *       400:
 *         description: ID de cliente requerido
 *       500:
 *         description: Error interno del servidor
 */
router.get('/ordenes/cliente/:id_cliente', publicApisController.obtenerOrdenesPorCliente);

/**
 * @swagger
 * /api/public/producto/{id_producto}:
 *   get:
 *     summary: Obtener detalles completos de un producto
 *     tags: [APIs Públicas]
 *     parameters:
 *       - in: path
 *         name: id_producto
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del producto
 *     responses:
 *       200:
 *         description: Detalles del producto obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id_producto:
 *                       type: integer
 *                     nombre_producto:
 *                       type: string
 *                     descripcion:
 *                       type: string
 *                     atributos:
 *                       type: object
 *                     nombre_categoria:
 *                       type: string
 *                     colores_disponibles:
 *                       type: array
 *                       items:
 *                         type: object
 *                     estampados_disponibles:
 *                       type: array
 *                       items:
 *                         type: object
 *                     total_ordenes:
 *                       type: integer
 *                     total_vendido:
 *                       type: integer
 *       400:
 *         description: ID de producto requerido
 *       404:
 *         description: Producto no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/producto/:id_producto', publicApisController.obtenerDetalleProducto);

/**
 * @swagger
 * /api/public/productos/buscar:
 *   get:
 *     summary: Buscar productos por término de búsqueda
 *     tags: [APIs Públicas]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Término de búsqueda
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Límite de productos a retornar
 *     responses:
 *       200:
 *         description: Productos encontrados exitosamente
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
 *                       id_producto:
 *                         type: integer
 *                       nombre_producto:
 *                         type: string
 *                       descripcion:
 *                         type: string
 *                       nombre_categoria:
 *                         type: string
 *                       total_vendido:
 *                         type: integer
 *       400:
 *         description: Término de búsqueda requerido
 *       500:
 *         description: Error interno del servidor
 */
router.get('/productos/buscar', publicApisController.buscarProductos);

/**
 * @swagger
 * /api/public/orden/{id_orden}/estado:
 *   get:
 *     summary: Obtener estado completo de una orden específica
 *     tags: [APIs Públicas]
 *     parameters:
 *       - in: path
 *         name: id_orden
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la orden
 *     responses:
 *       200:
 *         description: Estado de la orden obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id_orden:
 *                       type: integer
 *                     fecha_aproximada:
 *                       type: string
 *                       format: date
 *                     tipo_pago:
 *                       type: string
 *                     cliente_nombre:
 *                       type: string
 *                     empleado_responsable:
 *                       type: string
 *                     direccion:
 *                       type: string
 *                     detalles_productos:
 *                       type: array
 *                       items:
 *                         type: object
 *                     procesos:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: ID de orden requerido
 *       404:
 *         description: Orden no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get('/orden/:id_orden/estado', publicApisController.obtenerEstadoOrden);

/**
 * @swagger
 * /api/public/valoraciones/productos:
 *   get:
 *     summary: Obtener valoraciones de productos
 *     tags: [APIs Públicas]
 *     parameters:
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Límite de valoraciones a retornar
 *     responses:
 *       200:
 *         description: Valoraciones obtenidas exitosamente
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
 *                       id_valoracion:
 *                         type: integer
 *                       estrellas:
 *                         type: integer
 *                       comentario:
 *                         type: string
 *                       fecha_valoracion:
 *                         type: string
 *                         format: date-time
 *                       cliente_nombre:
 *                         type: string
 *                       productos_valorados:
 *                         type: array
 *                         items:
 *                           type: object
 *       500:
 *         description: Error interno del servidor
 */
router.get('/valoraciones/productos', publicApisController.obtenerValoracionesProductos);

/**
 * @swagger
 * /api/public/resumen/ordenes-por-estado:
 *   get:
 *     summary: Obtener resumen de órdenes agrupadas por estado
 *     tags: [APIs Públicas]
 *     responses:
 *       200:
 *         description: Resumen obtenido exitosamente
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
 *                       estado:
 *                         type: string
 *                       total_ordenes:
 *                         type: integer
 *                       total_productos:
 *                         type: integer
 *                       promedio_productos_por_orden:
 *                         type: number
 *       500:
 *         description: Error interno del servidor
 */
router.get('/resumen/ordenes-por-estado', publicApisController.obtenerResumenOrdenesPorEstado);

/**
 * @swagger
 * /api/public/categorias/mas-vendidas:
 *   get:
 *     summary: Obtener categorías con más productos vendidos
 *     tags: [APIs Públicas]
 *     parameters:
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Límite de categorías a retornar
 *     responses:
 *       200:
 *         description: Categorías más vendidas obtenidas exitosamente
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
 *                       id_categoria:
 *                         type: integer
 *                       nombre_categoria:
 *                         type: string
 *                       descripcion:
 *                         type: string
 *                       total_productos:
 *                         type: integer
 *                       total_vendido:
 *                         type: integer
 *                       total_ordenes:
 *                         type: integer
 *       500:
 *         description: Error interno del servidor
 */
router.get('/categorias/mas-vendidas', publicApisController.obtenerCategoriasMasVendidas);

/**
 * @swagger
 * /api/public/ordenes/recientes:
 *   get:
 *     summary: Obtener órdenes recientes
 *     tags: [APIs Públicas]
 *     parameters:
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Límite de órdenes a retornar
 *     responses:
 *       200:
 *         description: Órdenes recientes obtenidas exitosamente
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
 *                       id_orden:
 *                         type: integer
 *                       fecha_aproximada:
 *                         type: string
 *                         format: date
 *                       cliente_nombre:
 *                         type: string
 *                       empleado_responsable:
 *                         type: string
 *                       ciudad:
 *                         type: string
 *                       departamento:
 *                         type: string
 *                       total_productos:
 *                         type: integer
 *                       total_cantidad:
 *                         type: integer
 *       500:
 *         description: Error interno del servidor
 */
router.get('/ordenes/recientes', publicApisController.obtenerOrdenesRecientes);

module.exports = router;
